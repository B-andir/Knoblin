const fs = require('node:fs');
const path = require('node:path');
const { connectToEventServer } = require('event-client-lib');

const { Client, GatewayIntentBits, Collection, Events, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const audioPlayer = require('./utility/audio-player.js');

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildMessages, GatewayIntentBits.GuildVoiceStates] })

// Register slash commands from commands in the 'commands' subfolder.
client.commands = new Collection();

// create a list of folders in command directory that end with .js
// Grab all the command files from the commands directory you created earlier
const foldersPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(foldersPath).filter(file => file.endsWith('.js'));

// Grab the SlashCommandBuilder#toJSON() output of each command's data for deployment
for (const file of commandFiles) {
    const filePath = path.join(foldersPath, file);
    const command = require(filePath);
    if ('data' in command && 'execute' in command) {
        client.commands.set(command.data.name, command);
    } else {
        console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
    }
}

client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
    
	connectToEventServer('DiscordBot');
    audioPlayer.joinVoice(process.env.VOICE_CHANNEL_ID, process.env.GUILD_ID, true);
});


client.on(Events.InteractionCreate, async interaction => {
	
	if (interaction.isButton()) {

		if (interaction.customId === "rollDiceButton") {
			
			try {
				const rollCommand = interaction.client.commands.get('r');

				await rollCommand.execute(interaction);
			} catch (error) {
				console.error(error);
				if (interaction.replied || interaction.deferred) {
					await interaction.followUp({ content: 'There was an error while executing this command!', ephemeral: true });
				} else {
					await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
				}
			}
		}
	}

	if (interaction.isChatInputCommand()) {
		const command = interaction.client.commands.get(interaction.commandName);

		if (!command) {
			console.error(`No command matching ${interaction.commandName} was found.`);
			return;
		}
		
		// await command.execute(interaction);
		try {
			await command.execute(interaction);
		} catch (error) {
			console.error(error);
			if (interaction.replied || interaction.deferred) {
				await interaction.followUp({ content: 'There was an error while executing this command!', ephemeral: true });
			} else {
				await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
			}
		}
	}

});


async function clientLogin() {
	await client.login(process.env.BOT_TOKEN).then(async () => {
	});
}


// ----- EXPORTS -----

module.exports = { clientLogin, client };
exports.client = client;