const { AudioStreamMixer } = require('./audioStreamMixerClass');
const { createAudioPlayer, createAudioResource, AudioPlayerStatus, NoSubscriberBehavior } = require('@discordjs/voice');

// Usage example for Discord.js
class DiscordAudioManager {
    constructor(connection) {
        this.connection = connection;
        this.mixer = new AudioStreamMixer();
        this.player = null;

        // Set up event listeners
        this.mixer.on('streamAdded', (streamId, metadata) => {
            console.log(`Stream ${streamId} added:`, metadata);
        });

        this.mixer.on('streamEnded', (streamId, metadata) => {
            console.log(`Stream ${streamId} ended:`, metadata);
        });

        this.mixer.on('streamError', (streamId, error) => {
            console.error(`Stream ${streamId} error:`, error);
        });

        // Fade event listeners
        this.mixer.on('streamFadeOutStarted', (streamId) => {
            console.log(`Stream ${streamId} started fading out`);
        });

        this.mixer.on('streamFadeInStarted', (streamId) => {
            console.log(`Stream ${streamId} started fading in`);
        });

        this.mixer.on('streamFadedAndPaused', (streamId) => {
            console.log(`Stream ${streamId} faded out and paused`);
        });

        this.mixer.on('streamFadedAndResumed', (streamId) => {
            console.log(`Stream ${streamId} faded in and resumed`);
        });

        this.mixer.on('crossfadeStarted', (outStreamId, inStreamId, duration) => {
            console.log(`Crossfade started: ${outStreamId} -> ${inStreamId} (${duration}ms)`);
        });

        this.mixer.on('streamCrossfadeComplete', (streamId, direction) => {
            console.log(`Stream ${streamId} crossfade ${direction} complete`);
        });
        
        this.mixer.on('fadeProgress', (streamId, progress) => {
            // Uncomment for detailed fade progress logging
            // console.log(`Stream ${streamId} fade progress: ${Math.round(progress.progress * 100)}%`);
        });
    }

    startPlaying() {
        if (!this.player) {
            console.log('Audio Manager Start Playing ...');
            // const { createAudioPlayer, createAudioResource, AudioPlayerStatus, NoSubscriberBehavior } = require('@discordjs/voice');

            this.player = createAudioPlayer({
                behaviors: {
                    noSubscriber: NoSubscriberBehavior.Pause,
                    maxMissedFrames: 100000
                }
            });

            this.player.on(AudioPlayerStatus.Playing, () => {
                console.log('Audio player started playing');
            });

            this.player.on(AudioPlayerStatus.Idle, () => {
                console.log('Audio player is idle');
            });

            this.player.on('error', error => {
                console.error('Audio player error:', error);
            });

            // Create resource from mixer output
            const resource = createAudioResource(this.mixer.getOutputStream(), {
                inputType: 'raw',
                inlineVolume: false
            });

            this.player.play(resource);
            this.connection.subscribe(this.player);

            this.mixer.startMixing();
            console.log('Audio Manager is started');
        }
    }

    addAudioStream(stream, metadata = {}) {
        this.mixer.addStream(stream, { metadata });
        const resource = createAudioResource(this.mixer.getOutputStream(), {
            inputType: 'raw',
            inlineVolume: false
        });

        this.player.play(resource);
        return;
    }

    removeAudioStream(streamId) {
        this.mixer.removeStream(streamId);
    }

    pauseAudioStream(streamId) {
        this.mixer.pauseStream(streamId);
    }
    
    fadeOutAndPauseAudioStream(streamId, fadeDuration) {
        this.mixer.fadeOutAndPause(streamId, fadeDuration);
    }

    resumeAudioStream(streamId) {
        this.mixer.resumeStream(streamId);
    }
    
    fadeInAndResumeAudioStream(streamId, fadeDuration) {
        this.mixer.fadeInAndResume(streamId, fadeDuration);
    }
    
    crossfadeAudioStreams(outStreamId, inStreamId, fadeDuration) {
        this.mixer.crossfadeStreams(outStreamId, inStreamId, fadeDuration);
    }

    stopAudioStream(streamId) {
        this.mixer.stopStream(streamId);
    }

    setAudioStreamVolume(streamId, volume) {
        this.mixer.setStreamVolume(streamId, volume);
    }

    getAudioStreamInfo(streamId) {
        return this.mixer.getStreamInfo(streamId);
    }

    getAllAudioStreamsInfo() {
        return this.mixer.getAllStreamsInfo();
    }

    destroy() {
        if (this.player) {
            this.player.stop();
            this.player = null;
        }
        this.mixer.destroy();
    }
}

module.exports = { DiscordAudioManager }