/**
 * config.js — Chargement et validation de la configuration
 * Priorité : Variables d'environnement > .env file
 */
const path = require('path');

// Charger .env si disponible (développement local)
try { require('dotenv').config({ path: path.join(__dirname, '..', '.env') }); } catch { /* pas de dotenv */ }

/**
 * Parse une liste d'IDs séparés par des virgules
 * @param {string} str — Chaîne "id1,id2,id3"
 * @returns {string[]}
 */
function parseIdList(str) {
    if (!str) return [];
    return str.split(',').map(s => s.trim()).filter(Boolean);
}

const config = {
    // ─── Discord ───
    token: process.env.DISCORD_TOKEN || '',
    clientId: process.env.CLIENT_ID || '',
    guildId: process.env.GUILD_ID || '',

    // ─── Permissions ───
    ownerId: process.env.OWNER_ID || '',
    supervisorIds: parseIdList(process.env.SUPERVISOR_IDS),
    supervisorRoleId: process.env.SUPERVISOR_ROLE_ID || '',
    modRoleId: process.env.MOD_ROLE_ID || '',

    // ─── Channels ───
    logChannelId: process.env.LOG_CHANNEL_ID || '',
    levelupChannelId: process.env.LEVELUP_CHANNEL_ID || '',
    channelXpId: process.env.CHANNEL_XP_ID || '',

    // ─── Database ───
    databaseUrl: process.env.DATABASE_URL || '',

    // ─── XP Settings ───
    xpMin: parseInt(process.env.XP_MIN, 10) || 15,
    xpMax: parseInt(process.env.XP_MAX, 10) || 25,
    xpCooldown: parseInt(process.env.XP_COOLDOWN, 10) || 60,
    xpPerReaction: parseInt(process.env.XP_PER_REACTION, 10) || 5,
    xpReactionCooldown: parseInt(process.env.XP_REACTION_COOLDOWN, 10) || 5,
    voiceXpRate: parseInt(process.env.VOICE_XP_RATE, 10) || 10,
    voiceXpInterval: parseInt(process.env.VOICE_XP_INTERVAL, 10) || 300,
    reactionXpEnabled: process.env.REACTION_XP_ENABLED !== 'false',
    voiceXpEnabled: process.env.VOICE_XP_ENABLED === 'true',
    xpMultiplier: parseFloat(process.env.XP_MULTIPLIER) || 1.0,

    // ─── Leveling ───
    maxLevel: parseInt(process.env.MAX_LEVEL, 10) || 80,
    removePreviousRole: process.env.REMOVE_PREVIOUS_ROLE === 'true',
};

/**
 * Valider les champs requis au démarrage
 */
function validateConfig() {
    const required = ['token', 'clientId', 'guildId', 'ownerId'];
    const missing = required.filter(key => !config[key]);
    if (missing.length > 0) {
        console.error(`❌ Configuration invalide — champs manquants : ${missing.join(', ')}`);
        console.error('   Vérifiez votre fichier .env ou vos variables d\'environnement.');
        process.exit(1);
    }
}

module.exports = { config, validateConfig };
