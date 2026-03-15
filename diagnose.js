/**
 * Script de diagnostic — teste l'enregistrement des commandes slash
 */
require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const { REST, Routes } = require('discord.js');
const { getCommandDefinitions } = require('./src/commands/register');

const token = process.env.DISCORD_TOKEN;
const clientId = process.env.CLIENT_ID;
const guildId = process.env.GUILD_ID;

console.log('=== DIAGNOSTIC ===');
console.log('Client ID:', clientId);
console.log('Guild ID:', guildId);
console.log('Token present:', !!token);
console.log('');

const rest = new REST({ version: '10' }).setToken(token);

async function test() {
    try {
        const commands = getCommandDefinitions();
        console.log(`Enregistrement de ${commands.length} commandes...`);

        const result = await rest.put(
            Routes.applicationGuildCommands(clientId, guildId),
            { body: commands },
        );

        console.log('SUCCESS! Commandes enregistrees:', result.length);
        result.forEach(cmd => console.log(`  - /${cmd.name}`));
    } catch (err) {
        console.log('ERREUR:', err.message);
        console.log('Code:', err.code);
        console.log('Status:', err.status);
        if (err.rawError) {
            console.log('Details:', JSON.stringify(err.rawError, null, 2));
        }
    }
}

test();
