// TEMP
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
                url
            ];

            const result = await this.#executeYtDlpCommand(args);
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

    // Retrieve metadata for a single video/URL
    async getInfo(url) {
        try {
            const args = [
                '--dump-json',
                '--no-download',
                '--no-playlist',
                '--quiet',
                url
            ];

            const result = await this.#executeYtDlpCommand(args);
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
                playlistUrl
            ];

            const result = await this.#executeYtDlpCommand(args);

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
                playlistUrl
            ];

            const result = await this.#executeYtDlpCommand(args);

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

    #createDataStream(url, opts = {}) {
        const args = [
            '-f', 'bestaudio[acodec=opus]/bestaudio/best',
            '-o', '-',
            '--no-playlist',
            '--quiet',
            '--no-part',
            '--no-progress',
            '--no-warnings',
            '--no-write-info-json',
            '--buffer-size', '2048',
            url
        ];
        
        if (opts.cookies) args.splice(-1, 0, '--cookies', opts.cookies);
    
        const ytdlp = spawn(this.ytdlpPath, args, {
            stdio: ['ignore', 'pipe', 'pipe'],
            windowsHide: true,
            shell: false
        });
    
        let streamStarted = false;
        let streamStopped = false;
    
        ytdlp.stderr.on('data', d => console.log(`[yt-dlp err] ${d}`));
        ytdlp.on('error', err => {
            console.error('yt-dlp spawn error:', err);
            this.emit('error', err);
        });
    
        ytdlp.stdout.on('data', (chunk) => {
            if (!streamStarted) {
                streamStarted = true;
                console.log('[yt-dlp] Stream started');
                this.emit('dataStreamStarted', url);
            }
        });

        ytdlp.stdout.on('end', () => {
            if (!streamStopped) {
                streamStopped = true;
                console.log('[yt-dlp] Stream ended');
                this.emit('dataStreamEnded', url);
            }
        });

        ytdlp.on('close', (code) => {
            if (code !== 0) {
                this.emit('error', new Error(`yt-dlp exited with code ${code}`));
            }
        });
    
        return ytdlp;
    }

    #createAudioStream(opts = {}) {
        const transcode = opts.transcode !== false; // Default to true
        
        // Always transcode to PCM for mixing compatibility
        const args = [
            '-hide_banner', 
            '-loglevel', 'error',
            '-i', 'pipe:0',
            '-vn',
            '-ac', '2',          // Stereo
            '-ar', '48000',      // 48kHz sample rate
            '-f', 's16le',       // 16-bit little-endian PCM
            'pipe:1'
        ];
        
        const ff = spawn(this.ffmpegPath, args, {
            stdio: ['pipe', 'pipe', 'pipe'],
            windowsHide: true,
            shell: false
        });
        
        let audioStarted = false;
    
        ff.stderr.on('data', d => console.log(`[ffmpeg] ${d}`));
        ff.on('error', err => {
            console.error('ffmpeg spawn error:', err);
            this.emit('error', err);
        });
    
        ff.stdout.on('data', (chunk) => {
            if (!audioStarted) {
                audioStarted = true;
                console.log('[ffmpeg] Audio processing started');
                this.emit('audioStreamStarted');
            }
        });
    
        ff.stdout.on('end', () => {
            console.log('[ffmpeg] Audio stream ended');
            this.emit('audioStreamEnded');
        });

        ff.on('close', (code) => {
            if (code !== 0) {
                this.emit('error', new Error(`ffmpeg exited with code ${code}`));
            }
        });
    
        return ff;
    }

    async createStream(url, opts = {}) {
        return new Promise((resolve, reject) => {
            const dataStream = this.#createDataStream(url, opts);
            const audioStream = this.#createAudioStream(opts);

            dataStream.stdout.pipe(audioStream.stdin);

            dataStream.on('close', () => {
                if (!audioStream.stdin.destroyed) {
                    audioStream.stdin.end();
                }
            });

            let resolved = false;

            // Resolve with the PCM stream once audio processing starts
            this.once('audioStreamStarted', () => {
                if (!resolved) {
                    resolved = true;
                    resolve(audioStream.stdout);
                }
            });

            // Handle errors
            const handleError = (err) => {
                if (!resolved) {
                    resolved = true;
                    reject(err);
                }
            };

            this.once('error', handleError);
            dataStream.on('error', handleError);
            audioStream.on('error', handleError);

            // Timeout after 30 seconds
            setTimeout(() => {
                if (!resolved) {
                    resolved = true;
                    reject(new Error('Stream creation timeout'));
                }
            }, 30000);
        });
    }
}

module.exports = { YoutubeAdapter };