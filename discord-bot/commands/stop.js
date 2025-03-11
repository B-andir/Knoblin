const { SlashCommandBuilder } = require('discord.js');
const { stop } = require('../utility/audio-player.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('stop')
        .setDescription('Stop playing'),
    async execute(interaction) {
        stop();
        await interaction.reply('Audio player stopped.');
    },
};