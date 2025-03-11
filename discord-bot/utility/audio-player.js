const { joinVoiceChannel, getVoiceConnection, createAudioPlayer, createAudioResource, AudioPlayerStatus, NoSubscriberBehavior, VoiceConnection } = require('@discordjs/voice');
const ytdl = require('@distube/ytdl-core');
const { agent } = require('./ytdl-agent');
const bot = require('../bot-client');
const events = require('event-client-lib');

let player;

async function joinVoice(channelId, guildId, forced = false) {
    if (getVoiceConnection(guildId) && forced != true) return;
    
    player = createAudioPlayer({
        behaviors: {
            noSubscriber: NoSubscriberBehavior.Pause,
            maxMissedFrames: 100000
        }
    });

    player.on('playing', () => {
        
    });

    player.on('error', error => {
        console.error(`Error: ${error.message} with resource. Error:`);
        console.log(error)
    });

    const guild = await bot.client.guilds.fetch(guildId);
    if (!guild) {
        console.error("Error fetching guild of ID: ", guildId);
        return;
    }

    const voiceAdapterCreator = guild.voiceAdapterCreator;

    const connection = joinVoiceChannel({
        channelId: channelId,
        guildId: guildId,
        adapterCreator: voiceAdapterCreator
    });

    connection.subscribe(player);
}

async function playSong(song, guildId) {
    const connection = getVoiceConnection(guildId);

    if (!connection) {
        return;
    }

    const stream = ytdl(song.url, { 
        filter: 'audioonly', 
        quality: 'highestaudio', 
        highWaterMark: 1 << 25, 
        requestOptions: {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        },
        agent});
    const resource = await createAudioResource(stream, { inlineVolume: true });

    player.play(resource);
    player.currentResource = resource;
}

async function stop() {
    player.stop(true);
}

async function adjustVolume(dbValue) {
    player.currentResource.volume.setVolumeDecibels(dbValue)
}

events.on('playSong', (data) => {
    // data = { song: { title: "", url: "" } }
    const song = data.song;
    playSong(song, process.env.GUILD_ID);
});

module.exports = { joinVoice, playSong, stop, adjustVolume, }