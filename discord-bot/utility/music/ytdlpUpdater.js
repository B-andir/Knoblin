// discord-bot/utility/music/ytdlpUpdater.js
//
// Keeps .data/yt-dlp.exe up to date with GitHub releases.
//  - checkAndUpdate(): compares local `yt-dlp --version` with the latest GitHub release,
//    downloads + SHA256-verifies the new exe, and swaps it in.
//  - whenReady(): resolves once any in-progress update is done. YoutubeAdapter awaits this
//    before spawning yt-dlp, so nothing ever runs against a half-swapped binary.
//  - Emits 'status' events so the bot can forward progress to the Electron UI.

const { spawn } = require('child_process');
const { EventEmitter } = require('events');
const crypto = require('crypto');
const fsp = require('fs/promises');
const path = require('path');

const DATA_DIR = path.resolve(__dirname, '../../.data');
const EXE_NAME = 'yt-dlp.exe';
const EXE_PATH = path.join(DATA_DIR, EXE_NAME);

// 'nightly' gets YouTube fixes days/weeks before 'stable' – usually what you want here.
const REPOS = {
    stable: 'yt-dlp/yt-dlp',
    nightly: 'yt-dlp/yt-dlp-nightly-builds',
};

const USER_AGENT = 'personal-discord-bot-ytdlp-updater';

class YtDlpUpdater extends EventEmitter {
    #updatePromise = null;
    #lastCheck = 0;

    constructor({ channel = 'nightly', minCheckIntervalMs = 10 * 60 * 1000 } = {}) {
        super();
        this.channel = channel;
        this.minCheckIntervalMs = minCheckIntervalMs;
        this.exePath = EXE_PATH;
        this.lastStatus = { state: 'idle', channel };
    }

    // ----< Public API >----

    /** Resolves when no update is running. Never rejects. */
    whenReady() {
        return this.#updatePromise ? this.#updatePromise.catch(() => {}) : Promise.resolve();
    }

    /**
     * Check GitHub for a newer release and install it.
     * @param {object} opts
     * @param {boolean} opts.force  Ignore the throttle (use for the manual button).
     * @param {string}  opts.reason Just for logging ('launch', 'manual', 'failure', ...).
     */
    checkAndUpdate({ force = false, reason = 'manual' } = {}) {
        // Coalesce concurrent calls into the same run.
        if (this.#updatePromise) return this.#updatePromise;

        if (!force && Date.now() - this.#lastCheck < this.minCheckIntervalMs) {
            return Promise.resolve(this.lastStatus);
        }

        this.#lastCheck = Date.now();
        this.#updatePromise = this.#run(reason).finally(() => {
            this.#updatePromise = null;
        });
        return this.#updatePromise;
    }

    async getLocalVersion() {
        return new Promise((resolve) => {
            let out = '';
            let proc;
            try {
                proc = spawn(this.exePath, ['--version'], { windowsHide: true });
            } catch {
                return resolve(null);
            }

            const timer = setTimeout(() => { try { proc.kill(); } catch {} resolve(null); }, 15000);

            proc.stdout.on('data', d => { out += d.toString(); });
            proc.on('error', () => { clearTimeout(timer); resolve(null); }); // ENOENT = not installed
            proc.on('close', (code) => {
                clearTimeout(timer);
                resolve(code === 0 ? out.trim() || null : null);
            });
        });
    }

    // ----< Internals >----

    async #run(reason) {
        const channel = this.channel;
        try {
            this.#status('checking', { message: `Checking for yt-dlp updates (${reason})` });

            const [localVersion, release] = await Promise.all([
                this.getLocalVersion(),
                this.#getLatestRelease(channel),
            ]);
            const latestVersion = release.tag_name;

            if (localVersion && compareVersions(localVersion, latestVersion) >= 0) {
                return this.#status('up-to-date', {
                    localVersion, latestVersion,
                    message: `yt-dlp is up to date (${localVersion})`,
                });
            }

            this.#status('downloading', {
                localVersion, latestVersion,
                message: localVersion
                    ? `Updating yt-dlp ${localVersion} → ${latestVersion}`
                    : `yt-dlp not found, installing ${latestVersion}`,
            });

            await this.#install(release);

            const installed = await this.getLocalVersion();
            if (!installed) throw new Error('New yt-dlp.exe was installed but failed to run');

            return this.#status('updated', {
                localVersion: installed, latestVersion,
                message: `yt-dlp updated to ${installed}`,
            });
        } catch (err) {
            // Allow a quick retry after a failure instead of waiting out the throttle.
            this.#lastCheck = 0;
            return this.#status('error', { message: `yt-dlp update failed: ${err.message}` });
        }
    }

    async #getLatestRelease(channel) {
        const repo = REPOS[channel];
        if (!repo) throw new Error(`Unknown channel "${channel}"`);

        const res = await fetch(`https://api.github.com/repos/${repo}/releases/latest`, {
            headers: { 'Accept': 'application/vnd.github+json', 'User-Agent': USER_AGENT },
            signal: AbortSignal.timeout(15000),
        });
        if (!res.ok) throw new Error(`GitHub API responded ${res.status} ${res.statusText}`);
        return res.json();
    }

    async #download(url, timeoutMs) {
        const res = await fetch(url, {
            headers: { 'User-Agent': USER_AGENT },
            redirect: 'follow',
            signal: AbortSignal.timeout(timeoutMs),
        });
        if (!res.ok) throw new Error(`Download failed (${res.status}) for ${url}`);
        return Buffer.from(await res.arrayBuffer());
    }

    async #install(release) {
        const exeAsset = release.assets.find(a => a.name === EXE_NAME);
        const sumsAsset = release.assets.find(a => a.name === 'SHA2-256SUMS');
        if (!exeAsset) throw new Error(`Release ${release.tag_name} has no ${EXE_NAME} asset`);

        const exeBuf = await this.#download(exeAsset.browser_download_url, 5 * 60 * 1000);

        // Verify checksum so a truncated/corrupt download never replaces a working exe.
        if (sumsAsset) {
            const sums = (await this.#download(sumsAsset.browser_download_url, 30000)).toString('utf8');
            const line = sums.split(/\r?\n/).find(l => l.trim().endsWith(` ${EXE_NAME}`) || l.trim().endsWith(`*${EXE_NAME}`));
            const expected = line?.trim().split(/\s+/)[0]?.toLowerCase();
            const actual = crypto.createHash('sha256').update(exeBuf).digest('hex');
            if (!expected) throw new Error('Could not find checksum for yt-dlp.exe');
            if (expected !== actual) throw new Error('Checksum mismatch on downloaded yt-dlp.exe');
        } else {
            console.warn('[yt-dlp updater] No SHA2-256SUMS in release, skipping verification');
        }

        await fsp.mkdir(DATA_DIR, { recursive: true });
        await this.#cleanupOldBinaries();

        const newPath = `${EXE_PATH}.new`;
        const oldPath = `${EXE_PATH}.old-${Date.now()}`;
        await fsp.writeFile(newPath, exeBuf);

        // Windows lets you *rename* an exe that is currently running, but not overwrite/delete it.
        // So: move the current one aside, then move the new one into place.
        let movedOld = false;
        try {
            await fsp.rename(EXE_PATH, oldPath);
            movedOld = true;
        } catch (err) {
            if (err.code !== 'ENOENT') throw err; // ENOENT = fresh install, nothing to move
        }

        try {
            await fsp.rename(newPath, EXE_PATH);
        } catch (err) {
            if (movedOld) await fsp.rename(oldPath, EXE_PATH).catch(() => {}); // roll back
            throw err;
        }

        await this.#cleanupOldBinaries();
    }

    // Old binaries still held by a running yt-dlp process can't be deleted; they'll go next time.
    async #cleanupOldBinaries() {
        const files = await fsp.readdir(DATA_DIR).catch(() => []);
        await Promise.all(files
            .filter(f => f.startsWith(`${EXE_NAME}.old`) || f === `${EXE_NAME}.new`)
            .map(f => fsp.unlink(path.join(DATA_DIR, f)).catch(() => {})));
    }

    #status(state, extra = {}) {
        this.lastStatus = { state, channel: this.channel, time: Date.now(), ...extra };
        const log = state === 'error' ? console.error : console.log;
        log(`[yt-dlp updater] ${this.lastStatus.message ?? state}`);
        this.emit('status', this.lastStatus);
        return this.lastStatus;
    }
}

// yt-dlp versions look like "2026.09.20" (stable) or "2026.09.20.232812" (nightly).
function compareVersions(a, b) {
    const pa = String(a).split('.').map(n => parseInt(n, 10) || 0);
    const pb = String(b).split('.').map(n => parseInt(n, 10) || 0);
    for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
        const diff = (pa[i] ?? 0) - (pb[i] ?? 0);
        if (diff !== 0) return diff;
    }
    return 0;
}

// Singleton: every require() in the bot process shares the same updater/lock.
module.exports = { ytdlpUpdater: new YtDlpUpdater(), compareVersions };