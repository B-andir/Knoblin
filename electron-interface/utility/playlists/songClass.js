const { v4: uuidv4 } = require('uuid');

class Song {
    constructor(title, url) {
        this.id = uuidv4();
        this.title = title;
        this.url = url;
        this.startTime = null;
        this.stopTime = null;
        this.repeat = false;
        this.isPlaying = false;
    }
}

module.exports = Song;