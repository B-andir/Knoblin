const events = require('event-client-lib');
const { v4: uuidv4 } = require('uuid');

class Playlist {
    constructor(name, layer = 0, playlistType = PlaylistTypes.Playlist) {
        this.id = uuidv4();
        this.isPlaying = false;
        this.repeat = false;
        this.shuffle = false;
        this.type = PlaylistTypes[playlistType];
        this.layer = layer;
        this.name = name;
        this.playlist = [];

        events.on('trackFinished', (payload) => {
            if (this.isPlaying && payload.layer == this.layer) {
                console.log(`Track finished on layer: ${payload.layer}`);
                this.handleTrackFinished(payload.currentTrack);
            }
        });
    };

    static PlaylistTypes = {
        SingleFire: 'SingleFire',
        Playlist: 'Playlist'
    }

    addTrack(track) {
        this.playlist.push(track);
        console.log(`Added track "${track.title}" to playlist "${this.name}"`);
        this.emitPlaylistUpdate();
    }

    updateTrack(index, options) {
        return (this.playlist[index] = { ...options });
    }

    removeTrack(index) {
        if (index < 0 || index >= this.playlist.length) return;
        const removed = this.playlist.splice(index, 1)[0];
        console.log(`Removed track "${removed.title}" from playlist "${this.name}"`);
        this.emitPlaylistUpdate();
    }

    getPlaylist() {
        return this.playlist;
    }

    handleTrackFinished(currentTrack) {
        const currentIndex = this.playlist.indexOf(currentTrack);

        if (currentIndex === -1) {
            console.warn(`Track "${currentTrack.title}" could not be found in playlist "${this.name}"`);
        }
        
        // TODO: Continue to check if the current track is set to loop, and if not continue to the next entry in the playlist.
        // If this is the last track on the playlist, then stop unless playlist is set to repeat, in which case play the first one again.
    }
}

module.exports = Playlist;