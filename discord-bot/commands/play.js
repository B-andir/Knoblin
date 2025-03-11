const { SlashCommandBuilder } = require('discord.js');
const { playSong } = require('../utility/audio-player.js');
const ytdl = require('@distube/ytdl-core');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('play')
        .setDescription('Play a YouTube video')
        .addStringOption(option => 
            option
                .setName('url')
                .setDescription('YouTube URL of the video to play')
                .setRequired(true)
        ),
    async execute(interaction) {
        if (interaction.isChatInputCommand()) {
            const url = interaction.options.getString('url');
            if (url) {
                if (!ytdl.validateURL(url)) {
                    throw new Error('Invalid YouTube URL: ', url);
                }

                const info = await ytdl.getInfo(url);
                const song = {
                    title: info.videoDetails.title,
                    url: url,
                };

                playSong(song, process.env.GUILD_ID)

                interaction.reply(`${song.title} started playing!`);
            }
        }
    },
};