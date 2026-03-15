/**
 * index.js â€” Point d'entrÃ©e principal du bot Discord de Leveling
 *
 * Ce bot attribue de l'XP aux membres via messages, rÃ©actions et voix,
 * gÃ¨re les niveaux et assigne automatiquement des rÃ´les par paliers.
 */
const {
    Client,
    GatewayIntentBits,
    Partials,
    Events,
    REST,
    Routes,
} = require('discord.js');

// â”€â”€â”€ Configuration â”€â”€â”€
const { config, validateConfig } = require('./config');
validateConfig();

// â”€â”€â”€ Base de donnÃ©es â”€â”€â”€
const { createDatabase } = require('./database/db');
const { runMigrations } = require('./database/migrations');

// â”€â”€â”€ Commandes â”€â”€â”€
const { getCommandDefinitions } = require('./commands/register');
const { handleRank } = require('./commands/rank');
const { handleLeaderboard } = require('./commands/leaderboard');
const { handleAddXp } = require('./commands/addxp');
const { handleRemoveXp } = require('./commands/removexp');
const { handleSetRoleMap, handleRemoveRoleMap } = require('./commands/setrolemap');
const { handleSetChannel } = require('./commands/setchannel');
const { handleConfigShow } = require('./commands/configShow');
const { handleBlacklist } = require('./commands/blacklist');
const { handleExport, handleImport } = require('./commands/exportimport');

// â”€â”€â”€ Ã‰vÃ©nements â”€â”€â”€
const { handleMessageCreate } = require('./events/messageCreate');
const { handleReactionAdd } = require('./events/reactionAdd');
const { handleVoiceStateUpdate, startVoiceXpTimer } = require('./events/voiceState');

// â”€â”€â”€ Utilitaires â”€â”€â”€
const { errorEmbed } = require('./utils/embeds');

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
//  DÃ‰MARRAGE ASYNCHRONE
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
async function main() {
    // Initialiser la base de donnÃ©es (async car sql.js charge le WASM)
    const db = await createDatabase(config.databaseUrl);
    await runMigrations(db);

    // â”€â”€â”€ CLIENT DISCORD â”€â”€â”€
    const client = new Client({
        intents: [
            GatewayIntentBits.Guilds,
            GatewayIntentBits.GuildMembers,
            GatewayIntentBits.GuildMessages,
            GatewayIntentBits.MessageContent,
            GatewayIntentBits.GuildMessageReactions,
            GatewayIntentBits.GuildVoiceStates,
        ],
        partials: [
            Partials.Message,
            Partials.Channel,
            Partials.Reaction,
        ],
    });

    // â”€â”€â”€ Bot prÃªt â”€â”€â”€
    client.once(Events.ClientReady, async (c) => {
        console.log(`âœ… Bot connectÃ© en tant que ${c.user.tag}`);
        console.log(`ðŸ“Š Serveur cible : ${config.guildId}`);

        // Enregistrer les commandes slash
        const rest = new REST({ version: '10' }).setToken(config.token);
        try {
            const commands = getCommandDefinitions();
            await rest.put(
                Routes.applicationGuildCommands(config.clientId, config.guildId),
                { body: commands },
            );
            console.log(`âœ… ${commands.length} commandes slash enregistrÃ©es.`);
        } catch (err) {
            console.error('âŒ Erreur enregistrement commandes:', err);
        }

        // DÃ©marrer le timer d'XP vocale si activÃ©
        startVoiceXpTimer(client);

        console.log('â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€');
        console.log('  ðŸš€ Bot de Leveling prÃªt !');
        console.log(`  ðŸ“ˆ XP: ${config.xpMin}-${config.xpMax} | Cooldown: ${config.xpCooldown}s`);
        console.log(`  ðŸŽ¤ Voice XP: ${config.voiceXpEnabled ? 'ON' : 'OFF'}`);
        console.log(`  ðŸ’¬ Reaction XP: ${config.reactionXpEnabled ? 'ON' : 'OFF'}`);
        console.log('â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€');
    });

    // â”€â”€â”€ Commandes Slash â”€â”€â”€
    const commandHandlers = {
        rank: handleRank,
        leaderboard: handleLeaderboard,
        addxp: handleAddXp,
        removexp: handleRemoveXp,
        setrolemap: handleSetRoleMap,
        removerolemap: handleRemoveRoleMap,
        setchannel: handleSetChannel,
        config: handleConfigShow,
        blacklist: handleBlacklist,
        export: handleExport,
        import: handleImport,
    };

    client.on(Events.InteractionCreate, async (interaction) => {
        if (!interaction.isChatInputCommand()) return;

        const handler = commandHandlers[interaction.commandName];
        if (!handler) return;

        try {
            await handler(interaction);
        } catch (err) {
            console.error(`âŒ Erreur commande /${interaction.commandName}:`, err);

            const embed = errorEmbed(
                'Erreur',
                `Une erreur est survenue lors de l'exÃ©cution de **/${interaction.commandName}**.\n\`\`\`${err.message}\`\`\``,
            );

            try {
                if (interaction.replied || interaction.deferred) {
                    await interaction.followUp({ embeds: [embed], ephemeral: true });
                } else {
                    await interaction.reply({ embeds: [embed], ephemeral: true });
                }
            } catch {
                // Impossible de rÃ©pondre â€” ignorer silencieusement
            }
        }
    });

    // â”€â”€â”€ Ã‰vÃ©nements â”€â”€â”€
    client.on(Events.MessageCreate, handleMessageCreate);
    client.on(Events.MessageReactionAdd, handleReactionAdd);
    client.on(Events.VoiceStateUpdate, handleVoiceStateUpdate);

    // â”€â”€â”€ Gestion globale des erreurs â”€â”€â”€
    process.on('unhandledRejection', (err) => {
        console.error('âš ï¸ Unhandled Rejection:', err);
    });

    process.on('uncaughtException', (err) => {
        console.error('ðŸ”¥ Uncaught Exception:', err);
    });

    // â”€â”€â”€ Connexion â”€â”€â”€
    await client.login(config.token).catch((err) => {
        console.error('âŒ Impossible de se connecter Ã  Discord:', err.message);
        console.error('   VÃ©rifiez votre DISCORD_TOKEN.');
        process.exit(1);
    });
}

// Lancer le bot
main().catch((err) => {
    console.error('ðŸ”¥ Erreur fatale au dÃ©marrage:', err);
    process.exit(1);
});
