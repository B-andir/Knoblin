const { demuxProbe } = require ('@discordjs/voice');
const { Readable, Transform } = require('stream');
const { spawn } = require('child_process');
const https = require('https');
const http = require('http');
const path = require('path');
const { finished } = require('node:stream/promises');

class YouTubeStreamAdapter {
    constructor(options = {}) {
        this.youtube = null;
        this.initialized = false;

        // Options
        this.preferredQuality = options.quality || 'highest';  // 'highest', 'high', 'medium', 'low'
        this.preferredFormat = options.format || 'audioonly';  // 'audioonly', 'videoandaudio'
        this.useFFmpeg = options.useFFmpeg !== false;  // Enable by default
        this.ffmpegArgs = options.ffmpegArgs || [
            '-f', 's16le',
            '-ar', '48000',
            '-ac', '2'
        ];

        // Initialize YouTube client
        this.init();
    }

    async init() {
        try {
            this.initialized = true;
            console.log('YouTube.js client initialized successfully');
        } catch (error) {
            console.error('Failed to initialize YouTube.js client:', error);
            throw error;
        }
    }

    async ensureInitialized() {
        if (!this.initialized) {
            await this.init();
        }
    }

    // Convert ytdl-core style URL/ID to YouTube.js compatible format
    parseVideoIdentifier(input) {
        if (!input) throw new Error('No video URL or ID provided');

        // If it's already a video ID (11 characters)
        if (typeof input === 'string' && input.length === 11 && !/[^a-zA-Z0-9_-]/.test(input)) {
            return input;
        }

        // Extract video ID from various YouTube URL formats
        const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
        const match = input.match(regex);

        if (match && match[1]) {
            return match[1];
        }

        throw new Error('Invalid YouTube URL or video ID');
    }

    async getInfo(url) {
        await this.ensureInitialized();

        try {
            const videoId = this.parseVideoIdentifier(url);
            const info = await this.youtube.getInfo(videoId);

            return {
                videoId: videoId,
                title: info.basic_info.title,
                author: info.basic_info.author,
                duration: info.basic_info.duration?.seconds_total || 0,
                thumbnail: info.basic_info.thumbnail?.[0]?.url || null,
                streaming_data: info.streaming_data,
                // Compatibility fields for old ytdl-core code
                player_response: info,
                formats: this.convertFormats(info.streaming_data)
            };
        } catch (error) {
            console.error('Error getting video info:', error);
            throw new Error(`Failed to get video info: ${error.message}`);
        }
    }

    // Convert YouTube.js format data to ytdl-core style
    convertFormats(streamingData) {
        if (!streamingData) return [];
        
        const formats = [];
        
        // Add adaptive formats (audio-only)
        if (streamingData.adaptive_formats) {
            for (const format of streamingData.adaptive_formats) {
                if (format.mime_type?.includes('audio')) {
                    formats.push({
                        itag: format.itag,
                        url: format.url,
                        mimeType: format.mime_type,
                        bitrate: format.bitrate,
                        audioBitrate: format.bitrate,
                        audioQuality: format.audio_quality,
                        audioSampleRate: format.audio_sample_rate,
                        hasAudio: true,
                        hasVideo: false,
                        container: format.mime_type?.split('/')[1]?.split(';')[0],
                        quality: format.audio_quality
                    });
                }
            }
        }
        
        // Add regular formats
        if (streamingData.formats) {
            for (const format of streamingData.formats) {
                formats.push({
                    itag: format.itag,
                    url: format.url,
                    mimeType: format.mime_type,
                    bitrate: format.bitrate,
                    audioBitrate: format.bitrate,
                    hasAudio: true,
                    hasVideo: format.mime_type?.includes('video') || false,
                    container: format.mime_type?.split('/')[1]?.split(';')[0],
                    quality: format.quality_label || 'unknown'
                });
            }
        }
        
        return formats;
    }

    // Main method to create audio stream (replaces ytdl)
    async createAudioStream(url, options = {}) {
        console.log("Should create stream");

        const subprocess = this.youtube.exec(url, {
            output: '-',
            format: 'bestaudio[acodec=opus]/bestaudio',
            quiet: true,
            noPlaylist: true,
            bufferSize: 1024,
        }, {
            stdio: ['ignore', 'pipe', 'pipe']
        });

        console.log(`Running subprocess as ${subprocess.pid}`);

        // const out = fs.createWriteStream('stdout.txt');
        // const err = fs.createWriteStream('stderr.txt');

        subprocess.stderr.on('data', d => process.stderr.write(d));

        const { stream, type } = demuxProbe(subprocess.stdout);

        return { stream, type };

        // subprocess.stdout.pipe(out);
        // subprocess.stderr.pipe(err);

        // const timeout = setTimeout(() => {
        //     console.warn('Stream Creation timed out');
        //     subprocess.cancel();
        // }, 60000);

        // try {
        //     await Promise.all([subprocess, finished(out), finished(err)]);
        // } finally {
        //     console.log('Stream creation completed or failed');
        //     clearTimeout(timeout);
        //     out.close();
        //     err.close();
        // }
    }
    
    // Test if URL is accessible
    async testUrlAccess(url) {
        return new Promise((resolve, reject) => {
            const protocol = url.startsWith('https:') ? https : http;
            const request = protocol.request(url, { method: 'HEAD' }, (response) => {
                if (response.statusCode >= 200 && response.statusCode < 400) {
                    resolve();
                } else {
                    reject(new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`));
                }
            });
            
            request.on('error', reject);
            request.setTimeout(5000, () => {
                request.destroy();
                reject(new Error('URL test timeout'));
            });
            request.end();
        });
    }

    // Select the best audio format based on preferences
    selectBestFormat(formats, options = {}) {
        if (!formats || formats.length === 0) return null;

        const quality = options.quality || this.preferredQuality;
        const preferAudioOnly = options.format === 'audioonly' || this.preferredFormat === 'audioonly';

        // Filter audio formats
        let audioFormats = formats.filter(f => f.hasAudio);

        if (preferAudioOnly) {
            const audioOnlyFormats = audioFormats.filter(f => !f.hasVideo);
            if (audioOnlyFormats.length > 0) {
                audioFormats = audioOnlyFormats;
            }
        }

        if (audioFormats.length === 0) return null;

        // Sort by quality/bitrate
        audioFormats.sort((a, b) => {
            const aBitrate = a.audioBitrate || a.bitrate || 0;
            const bBitrate = b.audioBitrate || b.bitrate || 0;
            return bBitrate - aBitrate;
        });

        // Select based on quality preference
        switch (quality) {
            case 'highest':
                return audioFormats[0];
            case 'high':
                return audioFormats[Math.min(1, audioFormats.length - 1)];
            case 'medium':
                return audioFormats[Math.floor(audioFormats.length / 2)];
            case 'low':
                return audioFormats[audioFormats.length - 1];
            default:
                return audioFormats[0];
        }
    }

    // Create FFmpeg stream for Discord compatibility
    async createFFmpegStream(url, options = {}) {
        return new Promise((resolve, reject) => {
            // Properly escape the URL and add necessary headers
            const ffmpegArgs = [
                '-loglevel', 'debug',  // Reduce log verbosity
                '-reconnect', '1',
                '-reconnect_streamed', '1',
                '-reconnect_delay_max', '5',
                '-user_agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                '-headers', 'Accept: audio/webm,audio/ogg,audio/wav,audio/*;q=0.9,application/ogg;q=0.7,video/*;q=0.6,*/*;q=0.5',
                '-i', url,
                '-f', 's16le',
                '-ar', '48000',
                '-ac', '2',
                '-acodec', 'pcm_s16le',
                '-avoid_negative_ts', 'make_zero',
                'pipe:1'
            ];
            
            console.log('FFmpeg command:', 'ffmpeg', ffmpegArgs.join(' '));

            const ffmpeg = spawn('ffmpeg', ffmpegArgs, {
                stdio: ['ignore', 'pipe', 'pipe'],
                windowsHide: true
            });

            if (!ffmpeg.stdout) {
                reject(new Error('Failed to create FFmpeg stdout stream'));
                return;
            }
            
            let ffmpegStarted = false;
            let errorOutput = '';

            // Handle FFmpeg errors
            ffmpeg.stderr.on('data', (data) => {
                const message = data.toString();
                errorOutput += message;
                
                // Check for successful start indicators
                if (message.includes('Stream mapping:') || message.includes('Output #0')) {
                    ffmpegStarted = true;
                }
                
                // Only log actual errors, not info/debug messages
                if (message.toLowerCase().includes('error') && !message.includes('Last message repeated')) {
                    console.error('FFmpeg error:', message.trim());
                }
            });

            ffmpeg.on('error', (error) => {
                console.error('FFmpeg spawn error:', error);
                reject(new Error(`FFmpeg spawn failed: ${error.message}`));
            });

            ffmpeg.on('close', (code) => {
                if (code !== 0 && code !== null && !ffmpegStarted) {
                    console.error(`FFmpeg process exited with code ${code}`);
                    console.error('Full FFmpeg error output:', errorOutput);
                    reject(new Error(`FFmpeg failed with exit code ${code}. Error: ${errorOutput}`));
                }
            });
            
            // Add timeout for FFmpeg startup
            const startupTimeout = setTimeout(() => {
                if (!ffmpegStarted) {
                    ffmpeg.kill('SIGKILL');
                    reject(new Error('FFmpeg startup timeout - URL may be invalid or inaccessible'));
                }
            }, 15000); // 15 second timeout
            
            // Clear timeout once stream starts producing data
            ffmpeg.stdout.once('data', () => {
                clearTimeout(startupTimeout);
                ffmpegStarted = true;
            });

            resolve(ffmpeg.stdout);
        });
    }

    // Create direct HTTP stream
    async createDirectStream(url, options = {}) {
        return new Promise((resolve, reject) => {
            const protocol = url.startsWith('https:') ? https : http;

            const request = protocol.get(url, (response) => {
                if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
                    // Handle redirects
                    this.createDirectStream(response.headers.location, options)
                        .then(resolve)
                        .catch(reject);
                    return;
                }

                if (response.statusCode < 200 || response.statusCode >= 300) {
                    reject(new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`));
                    return;
                }

                resolve(response);
            });

            request.on('error', reject);
            request.setTimeout(30000, () => {
                request.destroy();
                reject(new Error('Request timeout'));
            });
        });
    }

    // Search for videos
    async search(query, options = {}) {
        await this.ensureInitialized();

        try {
            const results = await this.youtube.search(query, {
                type: 'video',
                ...options
            });

            return results.videos.map(video => ({
                id: video.id,
                title: video.title.text,
                author: video.author.name,
                duration: video.duration?.seconds_total || 0,
                thumbnail: video.thumbnails[0]?.url || null,
                url: `https://www.youtube.com/watch?v=${video.id}`,
            }));
        } catch (error) {
            console.error('Search error:', error);
            throw error;
        }
    }

    // Validate URL/ID
    static validateURL(url) {
        try {
            const adapter = new YouTubeStreamAdapter();
            adapter.parseVideoIdentifier(url);
            return true;
        } catch {
            return false;
        }
    }

    destroy() {
        if (this.cache) {
            this.cache.delete();
        }
    }
}

// Integration with audio mixer
class YouTubeAudioManager {
    constructor(audioManager, options = {}) {
        this.audioManager = audioManager;
        this.youtubeAdapter = new YouTubeStreamAdapter(options);
        this.activeStreams = new Map();
    }

    async playYouTubeAudio(url, options = {}) {
        try {
            const audioStream = await this.youtubeAdapter.createAudioStream(url, options);
            const info = audioStream.videoInfo;

            const metadata = {
                title: info.title,
                author: info.author,
                duration: info.duration * 1000, // Convert to milliseconds
                thumbnail: info.thumbnail,
                url: url,
                source: 'youtube'
            };

            const streamId = this.audioManager.addAudioStream(audioStream, {
                volume: options.volume || 1.0,
                metadata: metadata,
                duration: metadata.duration
            });

            this.activeStreams.set(streamId, {
                videoInfo: info,
                audioStream: audioStream,
                url: url
            });

            console.log(`Added YouTube stream: ${info.title} by ${info.author}`);
            return streamId;
            
        } catch (error) {
            console.error('Error playing YouTube audio:', error);
            throw error;
        }
    }

    async searchAndPlay(query, options = {}) {
        try {
            const results = await this.youtubeAdapter.search(query, { limit: 1 });
            if (results.length === 0) {
                throw new Error('No search results found');
            }

            const video = results[0];
            console.log(`Found: ${video.title} by ${video.author}`);

            return await this.playYouTubeAudio(video.url, options);
        } catch (error) {
            console.error('Error in search and play:', error);
            throw error;
        }
    }

    getYouTubeStreamInfo(streamId) {
        const streamInfo = this.audioManager.getAudioStreamInfo(streamId);
        const youtubeInfo = this.activeStreams.get(streamId);

        if (streamInfo && youtubeInfo) {
            return {
                ...streamInfo,
                videoInfo: youtubeInfo.videoInfo,
                originalUrl: youtubeInfo.url
            };
        }

        return streamInfo;
    }

    removeYouTubeStream(streamId) {
        this.audioManager.removeAudioStream(streamId);
        this.activeStreams.delete(streamId);
    }

    destroy() {
        this.youtubeAdapter.destroy();
        this.activeStreams.clear();
    }
}

module.exports = { YouTubeStreamAdapter, YouTubeAudioManager };