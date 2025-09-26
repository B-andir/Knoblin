const { joinVoiceChannel, demuxProbe, getVoiceConnection, createAudioPlayer, NoSubscriberBehavior, createAudioResource, StreamType } = require('@discordjs/voice');
const { spawn } = require('child_process');
const path = require('path');
// const { agent } = require('./ytdl-agent');
const bot = require('../bot-client');
const events = require('event-client-lib');
const { DiscordAudioManager } = require('./music/discordAudioManagerClass');
const { YoutubeAdapter } = require('./music/youtubeAdapter');

let player = null;

let audioManager = null;
let youtubeAdapter = null;

async function joinVoice(channelId, guildId, forced = false) {
    player = createAudioPlayer({
        behaviors: {
            noSubscriber: NoSubscriberBehavior.Pause,
            maxMissedFrames: 100000
        }
    });

    player.on('stateChange', (args) => {
        console.log("Player State Change: ", args);
    })

    if (getVoiceConnection(guildId)) {
        const connection = getVoiceConnection(guildId);
        audioManager = new DiscordAudioManager(connection);
        youtubeAdapter = new YoutubeAdapter();
        audioManager.startPlaying();
        // connection.subscribe(player);
    }

    if (getVoiceConnection(guildId) && forced != true) return;

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
    
    audioManager = new DiscordAudioManager(connection);
    youtubeAdapter = new YoutubeAdapter();
    audioManager.startPlaying();
    // connection.subscribe(player);
}

async function playSong(song, guildId) {
    if (!await youtubeAdapter.isUrlValid(song.url)) {
        console.warn(`Invalid URL:`, song.url);
        return;
    }

    console.log('Valid URL, proceeding');

    const stream = await youtubeAdapter.createStream(song.url);

    // const resource = await createAudioResource(stream.stream, { inlineVolume: false, inputType: stream.type });
    // player.play(resource);

    // const player = createAudioPlayer();
    // const resource = createAudioResource(stream.stream, {
    //     inputType: stream.type
    // });

    // player.play(resource);

    // getVoiceConnection(guildId).subscribe(player);
    audioManager.addAudioStream(stream.stream, { url: song.url, title: song.title});
}

events.on('playSong', (data) => {
    // data = { song: { title: "", url: "" } }
    const song = data.song;
    playSong(song, process.env.GUILD_ID);
});

module.exports = { joinVoice, playSong }