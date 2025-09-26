const { spawn } = require('child_process');
const { EventEmitter } = require('events');
const { demuxProbe } = require('@discordjs/voice');
const path = require('path');

class YoutubeAdapter extends EventEmitter {
    constructor() {
        super();
        this.ytdlpPath = path.resolve(__dirname, '../../.data/yt-dlp.exe');
        this.ffmpegPath = path.resolve(__dirname, '../../.data/ffmpeg.exe');
    }

    async #executeYtDlpCommand(args) {
        return new Promise((resolve, reject) => {
            const process = spawn(this.ytdlpPath, args);
            let stdout = '';
            let stderr = '';

            process.stdout.on('data', (data) => {
                stdout += data.toString();
            });

            process.stderr.on('data', (data) => {
                stderr += data.toString();
            });

            process.on('close', (code) => {
                if (code === 0) {
                    try {
                        // Parse JSON output if it exists
                        const lines = stdout.trim().split('\n').filter(line => line.trim());
                        const jsonResults = lines.map(line => {
                            try {
                                return JSON.parse(line);
                            } catch {
                                return line;  // Return as string if not JSON
                            }
                        });
                        resolve(jsonResults);
                    } catch (error) {
                        resolve(stdout.trim());
                    }
                } else {
                    reject(new Error(`yt-dlp exited with code ${code}: ${stderr}`));
                }
            });

            process.on('error', (error) => {
                reject(new Error(`Failed to spawn yt-dlp: ${error.message}`));
            });
        });
    }

    // Validate a URL by attempting to extract info without downloading
    async validateUrl(url) {
        try {
            const args = [
                '--dump-json',
                '--no-download',
                '--no-warnings',
                '--no-playlist',
                '--quiet',
            ];

            const result = await this.#executeYtDlpCommand(args.concat(url));
            return {
                valid: true,
                info: Array.isArray(result) ? result[0] : result
            };
        } catch (error) {
            return {
                valid: false,
                error: error.message
            };
        }
    }

    async isUrlValid(url) {
        const result = await this.validateUrl(url);
        return result.valid;
    }

    // Retrieve metadata for a single video/URL
    async getInfo(url) {
        try {
            const args = [
                '--dump-json',
                '--no-download',
                '--no-playlist',
                '--quiet',
            ];

            const result = await this.#executeYtDlpCommand(args.concat(url));
            const info = Array.isArray(result) ? result[0] : result;

            return {
                success: true,
                info: {
                    title: info.title,
                    duration: info.duration, // in seconds
                    author: info.uploader || info.channel,
                    url: info.webpage_url,
                    id: info.id,
                    thumbnail: info.thumbnail
                }
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    async getPlaylistUrls(playlistUrl) {
        try {
            const args = [
                '--flat-playlist',
                '--dump-json',
                '--no-download',
                '--quiet',
            ];

            const result = await this.#executeYtDlpCommand(args.concat(playlistUrl));

            if (!Array.isArray(result)) {
                throw new Error('Expected array of playlist items');
            }

            const urls = result.map(item => {
                if (typeof item === 'object' && item.url) {
                    return item.url;
                } else if (typeof item === 'object' && item.id) {
                    return `https://www.youtube.com/watch?v=${item.id}`;
                }
                return null;
            }).filter(url => url !== null);

            return {
                success: true,
                urls: urls,
                count: urls.length
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    async getPlaylistInfo(playlistUrl) {
        try {
            const args = [
                '--flat-playlist',
                '--dump-json',
                '--no-download',
                '--quiet',
            ];

            const result = await this.#executeYtDlpCommand(args.concat(playlistUrl));

            if (!Array.isArray(result)) {
                throw new Error('Expected array of playlist items');
            }

            const items = result.map(item => ({
                title: item.title,
                duration: item.duration,
                author: item.uploader || item.channel,
                url: item.url || (item.id ? `https://www.youtube.com/watch?v=${item.id}` : null),
                id: item.id,
                thumbnail: item.thumbnail
            })).filter(item => item.url !== null);

            return {
                success: true,
                items: items,
                urls: items.map(item => item.url),
                count: items.length
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    async #createYtDlptream(url, opts = {}) {
        const args = [
            // '-f', 'bestaudio[acodec=opus]/bestaudio/best',
            '-f', 'bestaudio[ext=m4a]/bestaudio[ext=webm]/bestaudio/best',
            '-o', '-',
            '--no-playlist',
            '--quiet',
            '--no-part',
            '--no-progress',
            '--no-warnings',
            '--no-write-info-json',
            '--buffer-size', '2048',
        ];
        
        if (opts.cookies) args.push('--cookies', opts.cookies);
    
        const ytdlp = spawn(this.ytdlpPath, args.concat(url), {
            stdio: ['ignore', 'pipe', 'pipe'],
            windowsHide: true,
            shell: false
        });
    
        ytdlp.stderr.on('data', d => console.log(`[yt-dlp err] ${d}`));
    
        return ytdlp;
    }

    /* Old Args
    const args = [
            '-hide_banner', 
            '-loglevel', 'warning',
            '-i', 'pipe:0',
            '-vn',
            '-map', '0:a:0',
            '-ac', '2',  // Stereo
            '-ar', '48000',  // 48kHz sample rate
            // '-b:a', '128k',
            // '-c:a', 'libopus',
            '-f', 's16le',
            '-flush_packets', '1',
            'pipe:1'
        ];
    */

    async #createFfmpegStream(opts = {}) {
        // Always transcode to PCM for mixing compatibility
        const args = [
            '-hide_banner', 
            '-loglevel', 'warning',
            '-i', 'pipe:0',
            '-vn',
            '-map', '0:a:0',
            '-ac', '2',  // Stereo
            '-ar', '48000',  // 48kHz sample rate
            '-b:a', '128k',
            '-f', 's16le',
            '-flush_packets', '1',
            'pipe:1'
        ];
        
        const ff = spawn(this.ffmpegPath, args, {
            stdio: ['pipe', 'pipe', 'pipe'],
            windowsHide: true,
            shell: false
        });
    
        ff.stderr.on('data', d => console.log(`[ffmpeg] ${d}`));

        
    
        return ff;
    }

    async createStream(url, opts = {}) {

        const ytdlp = await this.#createYtDlptream(url, opts);
        const ffmpeg = await this.#createFfmpegStream(opts);

        ytdlp.stdout.pipe(ffmpeg.stdin);

        const cleanup = (why) => {
            try { ytdlp.stdout.unpipe(ffmpeg.stdin); } catch{}
            try { ffmpeg.stdin.end(); } catch{}
            try { ytdlp.kill('SIGKILL'); } catch{}
            console.log(`[pipeline] cleaned up (${why})`);
        }

        ffmpeg.stdin.on('error', (err) => {
            console.warn(`[pipeline] ffmpeg stdin error: ${err.code}`);
        });

        ffmpeg.on('close', (code) => {
            if (code !== 0) console.warn(`[pipeline] ffmpeg exit ${code}`);
            cleanup('ffmpeg closed');
        });

        ytdlp.stdout.on('error', (err) => {
            console.warn(`[pipeline] ytdlp spawn error: ${err.code}`);
            cleanup('ytdlp stdout error');
        });

        ytdlp.on('error', (err) => {
            console.warn(`[pipeline] spawn error: ${err.message}`);
            cleanup('ytdlp spawn error');
        });

        ytdlp.on('close', () => {
            try { ffmpeg.stdin.end(); } catch {}
        });

        const started = new Promise((resolve, reject) => {
            let dataRecieved = false;

            const timeout = setTimeout(() => {
                if (!dataRecieved) reject(new Error('Ffmpeg timeout'));
            }, 10000)

            const onData = (chunk) => {
                if (chunk.length > 0) {
                    dataRecieved = true;
                    clearTimeout(timeout);
                    ffmpeg.stdout.off('error', onErr);
                    resolve();
                }
            }

            const onErr = (err) => {
                clearTimeout(timeout);
                reject(err);
            }

            ffmpeg.stdout.on('data', onData);
            ffmpeg.stdout.once('error', onErr);
        });

        await started;

        return { stream: ffmpeg.stdout, type: 'raw' };
    }
}

module.exports = { YoutubeAdapter };