const { Transform, PassThrough } = require('stream');
const { YoutubeAdapter } = require('./youtubeAdapter');
const { EventEmitter } = require('events');

class AudioStreamMixer extends EventEmitter {
    constructor(options = {}) {
        super();
        this.sampleRate = options.sampleRate || 48000;
        this.channels = options.channels || 2;
        this.bitDepth = options.bitDepth || 16;
        this.bytesPerSample = this.bitDepth / 8;
        this.frameSize = this.channels * this.bytesPerSample;

        // Store active streams
        this.streams = new Map();
        this.streamCounter = 0;

        // Create output stream
        this.outputStream = new PassThrough();
        this.isPlaying = false;
        this.mixingInterval = null;

        // Buffer for mixing
        this.bufferSize = 1920 * this.frameSize; // 40ms at 48kHz
        this.silenceBuffer = Buffer.alloc(this.bufferSize);
        
        // Fade settings
        this.defaultFadeDuration = options.defaultFadeDuration || 2000; // 2 seconds
        this.fadeSteps = 50; // Number of fade steps for smooth transition
    }

    addStream(stream, options = {}) {
        const streamId = `stream_${++this.streamCounter}`;

        const streamInfo = {
            id: streamId,
            stream: stream,
            ffmpegStream: options.ffmpegStream || null,
            volume: options.volume !== undefined ? options.volume : 1.0,
            baseVolume: options.volume !== undefined ? options.volume : 1.0, // Original volume for fade calculations
            isActive: true,
            isPaused: false,
            startTime: Date.now(),
            pausedDuration: 0,
            pauseStartTime: null,
            buffer: Buffer.alloc(0),
            hasEnded: false,
            duration: options.duration || null, // Duration in milliseconds if known
            metadata: options.metadata || {},
            // Fade properties
            fadeState: 'none', // 'none', 'fading_out', 'fading_in', 'crossfade_out', 'crossfade_in'
            fadeStartTime: null,
            fadeDuration: 0,
            fadeStartVolume: 0,
            fadeTargetVolume: 0,
            crossfadePartner: null, // For crossfade operations
        };

        this.streams.set(streamId, streamInfo);

        this.outputStream = stream;

        // Handle stream data
        stream.on('data', (chunk) => {
            // if (this.streams.has(streamId)) {
            //     const info = this.streams.get(streamId);
            //     if (info.isActive && !info.isPaused) {
            //         info.buffer = Buffer.concat([info.buffer, chunk]);
            //     }
            // }
        });

        // Handle stream end
        // stream.on('end', () => {
        //     if (this.streams.has(streamId)) {
        //         const info = this.streams.get(streamId);
        //         info.hasEnded = true;
        //         this.emit('streamEnded', streamId, info.metadata);

        //         // Auto-remove after a short delay to allow final mixing
        //         setTimeout(() => {
        //             this.removeStream(streamId);
        //         }, 100);
        //     }
        // });

        stream.on('error', (error) => {
            this.emit('streamError', streamId, error);
            this.removeStream(streamId);
        });
        

        // Start mixing if this is the first stream
        if (this.streams.size === 1 && !this.isPlaying) {
            this.startMixing();
        }

        this.emit('streamAdded', streamId, streamInfo.metadata);
        return streamId;
    }

    removeStream(streamId) {
        if (this.streams.has(streamId)) {
            const streamInfo = this.streams.get(streamId);
            this.streams.delete(streamId);
            this.emit('streamRemoved', streamId, streamInfo.metadata);

            // Stop mixing if no active streams
            if (this.streams.size === 0) {
                this.stopMixing();
            }
        }
    }

    pauseStream(streamId) {
        if (this.streams.has(streamId)) {
            const info = this.streams.get(streamId);
            if (!info.isPaused) {
                info.isPaused = true;
                info.pauseStartTime = Date.now();
                this.emit('streamPaused', streamId);
            }
        }
    }

    fadeOutAndPause(streamId, fadeDuration = this.defaultFadeDuration) {
        if (this.streams.has(streamId)) {
            const info = this.streams.get(streamId);
            if (!info.isPaused && info.fadeState === 'none') {
                this.startFade(info, 'fading_out', info.volume, 0, fadeDuration, () => {
                    info.isPaused = true;
                    info.pauseStartTime = Date.now();
                    info.fadeState = 'none';
                    this.emit('streamFadedAndPaused', streamId);
                });
                this.emit('streamFadeOutStarted', streamId);
            }
        }
    }

    resumeStream(streamId) {
        if (this.streams.has(streamId)) {
            const info = this.streams.get(streamId);
            if (info.isPaused) {
                info.isPaused = false;
                if (info.pauseStartTime) {
                    info.pausedDuration += Date.now() - info.pauseStartTime;
                    info.pauseStartTime = null;
                }
                this.emit('streamResumed', streamId);
            }
        }
    }

    fadeInAndResume(streamId, fadeDuration = this.defaultFadeDuration) {
        if (this.streams.has(streamId)) {
            const info = this.streams.get(streamId);
            if (info.isPaused && info.fadeState === 'none') {
                // Resume the stream first
                info.isPaused = false;
                if (info.pauseStartTime) {
                    info.pausedDuration += Date.now() - info.pauseStartTime;
                    info.pauseStartTime = null;
                }

                // Start fade in from 0 to base volume
                this.startFade(info, 'fading_in', 0, info.baseVolume, fadeDuration, () => {
                    info.fadeState = 'none';
                    this.emit('streamFadedAndResumed', streamId);
                });
                this.emit('streamFadeInStarted', streamId);
            }
        }
    }

    stopStream(streamId) {
        if (this.streams.has(streamId)) {
            const info = this.streams.get(streamId);
            info.isActive = false;
            this.emit('streamStopped', streamId);
            this.removeStream(streamId);
        }
    }

    setStreamVolume(streamId, volume) {
        if (this.streams.has(streamId)) {
            // Clamp volume between 0 and 2 (0% and 200%)
            volume = Math.max(0, Math.min(2, volume));
            const info = this.streams.get(streamId);
            info.volume = volume;
            info.baseVolume = volume;
            this.emit('streamVolumeChanged', streamId, volume);
        }
    }

    crossfadeStreams(outStreamId, inStreamId, fadeDuration = this.defaultFadeDuration) {
        const outStream = this.streams.get(outStreamId);
        const inStream = this.streams.get(inStreamId);

        if (!outStream || !inStream) {
            throw new Error('One or both streams not found for crossfade');
        }

        if (outStream.fadeState !== 'none' || inStream.fadeState !== 'none') {
            throw new Error('Cannot crossfade streams that are already fading');
        }

        // Set up crossfade partners
        outStream.crossfadePartner = inStreamId;
        inStream.crossfadePartner = outStreamId;

        // Start fade out for the outgoing stream
        this.startFade(outStream, 'crossfade_out', outStream.volume, 0, fadeDuration, () => {
            outStream.fadeState = 'none';
            outStream.crossfadePartner = null;
            this.emit('streamCrossfadeComplete', outStreamId, 'out');
            // Optionally stop or remove the faded out stream
            this.stopStream(outStreamId);
        });

        // Start fade in for the incoming stream (make sure it's not paused)
        if (inStream.isPaused) {
            inStream.isPaused = false;
            if (inStream.pauseStartTime) {
                inStream.pausedDuration += Date.now() - inStream.pauseStartTime;
                inStream.pauseStartTime = null;
            }
        }

        // Set initial volume to 0 for fade in
        const originalInVolume = inStream.baseVolume;
        inStream.volume = 0;

        this.startFade(inStream, 'crossfade_in', 0, originalInVolume, fadeDuration, () => {
            inStream.fadeState = 'none';
            inStream.crossfadePartner = null;
            this.emit('streamCrossfadeComplete', inStreamId, 'in');
        });

        this.emit('crossfadeStarted', outStreamId, inStreamId, fadeDuration);
    }

    // Helper method to start a fade operation
    startFade(streamInfo, fadeType, startVolume, targetVolume, duration, onComplete) {
        streamInfo.fadeState = fadeType;
        streamInfo.fadeStartTime = Date.now();
        streamInfo.fadeDuration = duration;
        streamInfo.fadeStartVolume = startVolume;
        streamInfo.fadeTargetVolume = targetVolume;
        streamInfo.volume = startVolume;

        // Set up fade completion
        setTimeout(() => {
            if (streamInfo.fadeState === fadeType) {  // Make sure fade wasn't interrupted
                streamInfo.volume = targetVolume;
                if (onComplete) onComplete();
            }
        }, duration);
    }

    // Update fade volumes during mixing
    updateFadeVolumes() {
        const now = Date.now();

        for (const [streamId, info] of this.streams) {
            if (info.fadeState !== 'none' && info.fadeStartTime) {
                const elapsed = now - info.fadeStartTime;
                const progress = Math.min(elapsed / info.fadeDuration, 1);

                // Use smooth easing curve (ease-in-out)
                const easedProgress = this.easeInOutCubic(progress);

                // Calculate current volume
                const volumeDiff = info.fadeTargetVolume - info.fadeStartVolume;
                info.volume = info.fadeStartVolume + (volumeDiff * easedProgress);

                // Emit progress events
                this.emit('fadeProgress', streamId, {
                    progress: progress,
                    currentVolume: info.volume,
                    fadeType: info.fadeState
                });
            }
        }
    }

    // Smooth easing function for natural fade curves
    easeInOutCubic(t) {
        return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    }

    getStreamInfo(streamId) {
        if (!this.streams.has(streamId)) {
            return null;
        }

        const info = this.streams.get(streamId);
        const now = Date.now();

        let elapsedTime = now - info.startTime - info.pausedDuration;

        if (info.isPaused && info.pauseStartTime) {
            elapsedTime -= (now - info.pauseStartTime);
        }

        return {
            id: streamId,
            isActive: info.isActive,
            isPaused: info.isPaused,
            hasEnded: info.hasEnded,
            volume: info.volume,
            baseVolume: info.baseVolume,
            elapsedTime: elapsedTime,
            duration: info.duration,
            remainingTime: info.duration ? Math.max(0, info.duration - elapsedTime) : null,
            metadata: info.metadata,
            fadeState: info.fadeState,
            fadeProgress: info.fadeStartTime ? Math.min((now - info.fadeStartTime) / info.fadeDuration, 1) : 0
        };
    }

    getAllStreamsInfo() {
        const streamsInfo = {};
        for (const streamId of this.streams.keys()) {
            streamsInfo[streamId] = this.getStreamInfo(streamId);
        }
        return streamsInfo;
    }

    startMixing() {
        if (this.isPlaying) return;

        this.isPlaying = true;
        this.mixingInterval = setInterval(() => {
            // this.mixAndOutput();
        }, 20); // Mix every 20ms for smooth playback
    }

    stopMixing() {
        if (!this.isPlaying) return;

        this.isPlaying = false;
        if (this.mixingInterval) {
            clearInterval(this.mixingInterval);
            this.mixingInterval = null;
        }

        // Push final silence to end the stream properly
        this.outputStream.push(this.silenceBuffer);
    }

    mixAndOutput() {
        // Update fade volumes first
        this.updateFadeVolumes();

        const mixBuffer = Buffer.alloc(this.bufferSize);
        let hasActiveStreams = false;

        mixBuffer.fill(0);

        // Mix all active streams
        for (const [streamId, streamInfo] of this.streams) {
            if (!streamInfo.isActive || streamInfo.isPaused || streamInfo.volume === 0) {
                continue;
            }

            // Check if we have enough data in the buffer
            if (streamInfo.buffer.length < this.bufferSize) {
                continue;
            }

            hasActiveStreams = true;

            // Extract samples from stream buffer
            const streamSamples = streamInfo.buffer.subarray(0, this.bufferSize);
            streamInfo.buffer = streamInfo.buffer.subarray(this.bufferSize);

            // Mix samples with volume control (including fade volume)
            for (let i = 0; i < this.bufferSize; i += 2) {
                try {
                    // Read 16-bit sample (little endian)
                    const sample = streamSamples.readInt16LE(i);

                    // Apply volume
                    const adjustedSample = Math.round(sample * streamInfo.volume);

                    // Read current mix value
                    const currentMix = mixBuffer.readInt16LE(i);

                    // Add to mix with clipping protection
                    let newMix = currentMix + adjustedSample;

                    // Clamp to 16-bit range to prevent distortion
                    newMix = Math.max(-32768, Math.min(32767, currentMix + adjustedSample));

                    // Write back to mix buffer
                    mixBuffer.writeInt16LE(newMix, i);
                } catch (error) {
                    // Handle buffer read errors gracefully
                    console.error(`Error mixing sample at position ${i}:`, error);
                    break;
                }
                
            }
        }

        // Output mixed buffer or silence
        if (hasActiveStreams && mixBuffer.length > 0) {
            this.outputStream.push(mixBuffer);
        } else {
            // Push silence when no active streams
            this.outputStream.push(this.silenceBuffer);
        }

        // Clean up streams that have ended and emptied their buffers
        for (const [streamId, streamInfo] of this.streams) {
            if (streamInfo.hasEnded && streamInfo.buffer.length === 0) {
                setTimeout(() => {
                    if (this.streams.has(streamId) && this.streams.get(streamId).hasEnded) {
                        this.removeStream(streamId);
                    }
                }, 100);
            }
        }
    }

    getOutputStream() {
        return this.outputStream;
    }

    destroy() {
        this.stopMixing();
        this.streams.clear();
        this.outputStream.destroy();
        this.removeAllListeners();
    }
}

module.exports = { AudioStreamMixer }