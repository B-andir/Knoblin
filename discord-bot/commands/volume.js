const { SlashCommandBuilder } = require('discord.js');
const { adjustVolume } = require('../utility/audio-player.js');
const events = require('event-client-lib');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('volume')
        .setDescription('Adjust Volume of Player')
        .addNumberOption(option =>
            option
                .setName('new-value')
                .setDescription('New Volume Value between 0 and 100')
                .setMinValue(0)
                .setMaxValue(100)
                .setRequired(true)
        ),
    async execute(interaction) {
        if (interaction.isChatInputCommand()) {
            
            const newVolume = interaction.options.getNumber('new-value');

            events.emit('new-volume-main', { newVolume });

            interaction.reply(`New volume: ${newVolume}`);
        }
    },
};