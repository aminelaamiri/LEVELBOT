/**
 * index.js — Point d'entrée principal du bot Discord de Leveling
 *
 * Ce bot attribue de l'XP aux membres via messages, réactions et voix,
 * gère les niveaux et assigne automatiquement des rôles par paliers.
 */
const {
    Client,
    GatewayIntentBits,
    Partials,
    Events,
    REST,
    Routes,
} = require('discord.js');

// ─── Configuration ───
const { config, validateConfig } = require('./config');
validateConfig();

// ─── Base de données ───
const { createDatabase } = require('./database/db');
const { runMigrations } = require('./database/migrations');

// ─── Commandes ───
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

// ─── Événements ───
const { handleMessageCreate } = require('./events/messageCreate');
const { handleReactionAdd } = require('./events/reactionAdd');
const { handleVoiceStateUpdate, startVoiceXpTimer } = require('./events/voiceState');

// ─── Utilitaires ───
const { errorEmbed } = require('./utils/embeds');

// ─────────────────────────────────────────────
//  DÉMARRAGE ASYNCHRONE
// ─────────────────────────────────────────────
async function main() {
    // Initialiser la base de données (async car sql.js charge le WASM)
    const db = await createDatabase(config.databaseUrl);
    runMigrations(db);

    // ─── CLIENT DISCORD ───
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

    // ─── Bot prêt ───
    client.once(Events.ClientReady, async (c) => {
        console.log(`✅ Bot connecté en tant que ${c.user.tag}`);
        console.log(`📊 Serveur cible : ${config.guildId}`);

        // Enregistrer les commandes slash
        const rest = new REST({ version: '10' }).setToken(config.token);
        try {
            const commands = getCommandDefinitions();
            await rest.put(
                Routes.applicationGuildCommands(config.clientId, config.guildId),
                { body: commands },
            );
            console.log(`✅ ${commands.length} commandes slash enregistrées.`);
        } catch (err) {
            console.error('❌ Erreur enregistrement commandes:', err);
        }

        // Démarrer le timer d'XP vocale si activé
        startVoiceXpTimer(client);

        console.log('─────────────────────────────────────────');
        console.log('  🚀 Bot de Leveling prêt !');
        console.log(`  📈 XP: ${config.xpMin}-${config.xpMax} | Cooldown: ${config.xpCooldown}s`);
        console.log(`  🎤 Voice XP: ${config.voiceXpEnabled ? 'ON' : 'OFF'}`);
        console.log(`  💬 Reaction XP: ${config.reactionXpEnabled ? 'ON' : 'OFF'}`);
        console.log('─────────────────────────────────────────');
    });

    // ─── Commandes Slash ───
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
            console.error(`❌ Erreur commande /${interaction.commandName}:`, err);

            const embed = errorEmbed(
                'Erreur',
                `Une erreur est survenue lors de l'exécution de **/${interaction.commandName}**.\n\`\`\`${err.message}\`\`\``,
            );

            try {
                if (interaction.replied || interaction.deferred) {
                    await interaction.followUp({ embeds: [embed], ephemeral: true });
                } else {
                    await interaction.reply({ embeds: [embed], ephemeral: true });
                }
            } catch {
                // Impossible de répondre — ignorer silencieusement
            }
        }
    });

    // ─── Événements ───
    client.on(Events.MessageCreate, handleMessageCreate);
    client.on(Events.MessageReactionAdd, handleReactionAdd);
    client.on(Events.VoiceStateUpdate, handleVoiceStateUpdate);

    // ─── Gestion globale des erreurs ───
    process.on('unhandledRejection', (err) => {
        console.error('⚠️ Unhandled Rejection:', err);
    });

    process.on('uncaughtException', (err) => {
        console.error('🔥 Uncaught Exception:', err);
    });

    // ─── Connexion ───
    await client.login(config.token).catch((err) => {
        console.error('❌ Impossible de se connecter à Discord:', err.message);
        console.error('   Vérifiez votre DISCORD_TOKEN.');
        process.exit(1);
    });
}

// Lancer le bot
main().catch((err) => {
    console.error('🔥 Erreur fatale au démarrage:', err);
    process.exit(1);
});
