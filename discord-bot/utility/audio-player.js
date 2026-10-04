const { joinVoiceChannel, demuxProbe, getVoiceConnection, createAudioPlayer, NoSubscriberBehavior, createAudioResource, StreamType } = require('@discordjs/voice');
const { spawn } = require('child_process');
const path = require('path');
// const { agent } = require('./ytdl-agent');
const bot = require('../bot-client');
const events = require('event-client-lib');
const { DiscordAudioManager } = require('./music/discordAudioManagerClass');
const { YoutubeAdapter } = require('./music/youtubeAdapter');
const { ytdlpUpdater } = require('./music/ytdlpUpdater');

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
        ytdlpUpdater.checkAndUpdate({ reason: 'failure' });
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

async function runDownload(requestId, work) {
    try {
        if (!youtubeAdapter) throw new Error('Bot is not connected to voice yet');
        const result = await work();
        events.emit('downloadFinished', { requestId, success: true, files: result?.files ?? [] });
    } catch (err) {
        console.error('[download] failed:', err.message);
        events.emit('downloadFinished', { requestId, success: false, error: err.message });
    }
}

ytdlpUpdater.on('status', (status) => events.emit('ytdlp-update-status', status));

events.on('ytdlp-update-request', (data) => {
    ytdlpUpdater.checkAndUpdate({ force: !!data?.force, reason: 'manual' });
});

events.on('ytdlp-status-request', () => events.emit('ytdlp-update-status', ytdlpUpdater.lastStatus));

events.on('playSong', (data) => {
    // data = { song: { title: "", url: "" } }
    const song = data.song;
    playSong(song, process.env.GUILD_ID);
});

events.on('downloadSong', (data) => runDownload(data.requestId, async () => {
    const check = await youtubeAdapter.validateUrl(data.song.url);
    if (!check.valid) throw new Error(`yt-dlp could not read ${data.song.url}: ${check.error}`);
    return  youtubeAdapter.createStream(data.song.url, { download: true });
}));

events.on('downloadPlaylist', (data) => runDownload(data.requestId, async () => {
    const check = await youtubeAdapter.validateUrl(data.song.url);
    if (!check.valid) throw new Error(`yt-dlp could not read ${data.song.url}: ${check.error}`);
    return  youtubeAdapter.createStream(data.song.url, { download: true, playlist: true });
}));


module.exports = { joinVoice, playSong }