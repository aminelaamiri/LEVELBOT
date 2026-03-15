/**
 * xp.js — Moteur d'attribution d'XP
 * Gère le cooldown, l'anti-spam, le multiplicateur, et l'attribution aléatoire d'XP
 */
const { config } = require('../config');
const { getUser, upsertUser, isBlacklisted, addLog } = require('../database/db');
const { levelForXp, maxXp } = require('./levels');

// Cache mémoire des cooldowns (user_id:guild_id → timestamp)
const cooldowns = new Map();
// Cache séparé pour les cooldowns de réaction
const reactionCooldowns = new Map();

/**
 * Nettoyer les entrées expirées d'un Map de cooldown
 * @param {Map} map
 * @param {number} maxAgeMs — Durée max en ms
 */
function cleanupCooldowns(map, maxAgeMs) {
    const now = Date.now();
    for (const [key, time] of map) {
        if (now - time > maxAgeMs) {
            map.delete(key);
        }
    }
}

// Nettoyage automatique toutes les 10 minutes
setInterval(() => {
    cleanupCooldowns(cooldowns, config.xpCooldown * 1000 * 2);
    cleanupCooldowns(reactionCooldowns, config.xpReactionCooldown * 1000 * 2);
}, 600_000);

/**
 * Vérifier si un utilisateur est en cooldown
 * @param {string} userId
 * @param {string} guildId
 * @returns {boolean}
 */
function isOnCooldown(userId, guildId) {
    const key = `${userId}:${guildId}`;
    const lastTime = cooldowns.get(key);
    if (!lastTime) return false;
    const elapsed = (Date.now() - lastTime) / 1000;
    return elapsed < config.xpCooldown;
}

/**
 * Vérifier si un utilisateur est en cooldown pour les réactions
 * @param {string} userId
 * @param {string} guildId
 * @returns {boolean}
 */
function isOnReactionCooldown(userId, guildId) {
    const key = `${userId}:${guildId}`;
    const lastTime = reactionCooldowns.get(key);
    if (!lastTime) return false;
    const elapsed = (Date.now() - lastTime) / 1000;
    return elapsed < config.xpReactionCooldown;
}

/**
 * Marquer le cooldown d'un utilisateur
 * @param {string} userId
 * @param {string} guildId
 */
function setCooldown(userId, guildId) {
    const key = `${userId}:${guildId}`;
    cooldowns.set(key, Date.now());
}

/**
 * Marquer le cooldown réaction d'un utilisateur
 * @param {string} userId
 * @param {string} guildId
 */
function setReactionCooldown(userId, guildId) {
    const key = `${userId}:${guildId}`;
    reactionCooldowns.set(key, Date.now());
}

/**
 * Générer un montant d'XP aléatoire entre xpMin et xpMax avec multiplicateur
 * @returns {number}
 */
function randomXp() {
    const base = Math.floor(Math.random() * (config.xpMax - config.xpMin + 1)) + config.xpMin;
    return Math.floor(base * config.xpMultiplier);
}

/**
 * Attribuer de l'XP à un utilisateur suite à un message
 * Vérifie le cooldown et la blacklist avant d'attribuer
 *
 * @param {string} userId — ID Discord de l'utilisateur
 * @param {string} guildId — ID du serveur
 * @param {string} channelId — ID du canal (pour vérif blacklist)
 * @returns {{ leveled: boolean, oldLevel: number, newLevel: number, xpGained: number, totalXp: number } | null}
 *   null si pas d'XP attribué (cooldown, blacklist, bot)
 */
function awardMessageXp(userId, guildId, channelId) {
    // Vérifier blacklist canal et utilisateur
    if (isBlacklisted(guildId, channelId) || isBlacklisted(guildId, userId)) {
        return null;
    }

    // Vérifier cooldown
    if (isOnCooldown(userId, guildId)) {
        return null;
    }

    const xpGained = randomXp();
    return addXpToUser(userId, guildId, xpGained, true);
}

/**
 * Attribuer de l'XP pour une réaction (avec cooldown anti-spam)
 * @param {string} userId
 * @param {string} guildId
 * @returns {object|null}
 */
function awardReactionXp(userId, guildId) {
    if (!config.reactionXpEnabled) return null;
    if (isBlacklisted(guildId, userId)) return null;
    if (isOnReactionCooldown(userId, guildId)) return null;

    setReactionCooldown(userId, guildId);
    const amount = Math.floor(config.xpPerReaction * config.xpMultiplier);
    return addXpToUser(userId, guildId, amount, false);
}

/**
 * Attribuer de l'XP pour activité vocale
 * @param {string} userId
 * @param {string} guildId
 * @returns {object|null}
 */
function awardVoiceXp(userId, guildId) {
    if (!config.voiceXpEnabled) return null;
    if (isBlacklisted(guildId, userId)) return null;
    const amount = Math.floor(config.voiceXpRate * config.xpMultiplier);
    return addXpToUser(userId, guildId, amount, false);
}

/**
 * Ajouter de l'XP à un utilisateur (fonction interne)
 * Cap l'XP au maximum autorisé (level max)
 * @param {string} userId
 * @param {string} guildId
 * @param {number} amount — Montant d'XP à ajouter
 * @param {boolean} isMessage — Si true, incrémenter total_messages et mettre le cooldown
 * @returns {{ leveled: boolean, oldLevel: number, newLevel: number, xpGained: number, totalXp: number }}
 */
function addXpToUser(userId, guildId, amount, isMessage) {
    let userData = getUser(userId, guildId);

    if (!userData) {
        userData = { user_id: userId, guild_id: guildId, xp: 0, level: 0, total_messages: 0, last_xp_at: 0 };
    }

    const oldLevel = userData.level;
    // Cap l'XP au maximum (level max)
    const newXp = Math.min(userData.xp + amount, maxXp());
    const newLevel = levelForXp(newXp);
    const now = Math.floor(Date.now() / 1000);

    upsertUser(userId, guildId, {
        xp: newXp,
        level: newLevel,
        total_messages: isMessage ? userData.total_messages + 1 : userData.total_messages,
        last_xp_at: now,
    });

    if (isMessage) {
        setCooldown(userId, guildId);
    }

    const leveled = newLevel > oldLevel;

    if (leveled) {
        addLog(guildId, 'LEVEL_UP', userId, `Level ${oldLevel} → ${newLevel} (XP: ${newXp})`);
    }

    return {
        leveled,
        oldLevel,
        newLevel,
        xpGained: amount,
        totalXp: newXp,
    };
}

/**
 * Ajouter de l'XP manuellement (commande admin)
 * L'XP est capé au maximum autorisé
 * @param {string} userId
 * @param {string} guildId
 * @param {number} amount
 * @param {string} adminId — ID de l'admin qui effectue l'action
 * @returns {object}
 */
function addXpManual(userId, guildId, amount, adminId) {
    const result = addXpToUser(userId, guildId, Math.abs(amount), false);
    addLog(guildId, 'ADMIN_ADD_XP', adminId, `+${amount} XP to ${userId} (total: ${result.totalXp})`);
    return result;
}

/**
 * Retirer de l'XP manuellement (commande admin)
 * @param {string} userId
 * @param {string} guildId
 * @param {number} amount
 * @param {string} adminId
 * @returns {object}
 */
function removeXpManual(userId, guildId, amount, adminId) {
    let userData = getUser(userId, guildId);
    if (!userData) {
        userData = { user_id: userId, guild_id: guildId, xp: 0, level: 0, total_messages: 0, last_xp_at: 0 };
    }

    const newXp = Math.max(0, userData.xp - Math.abs(amount));
    const newLevel = levelForXp(newXp);
    const now = Math.floor(Date.now() / 1000);

    upsertUser(userId, guildId, {
        xp: newXp,
        level: newLevel,
        total_messages: userData.total_messages,
        last_xp_at: now,
    });

    addLog(guildId, 'ADMIN_REMOVE_XP', adminId, `-${amount} XP from ${userId} (total: ${newXp})`);

    return {
        leveled: newLevel < userData.level,
        oldLevel: userData.level,
        newLevel,
        xpRemoved: Math.abs(amount),
        totalXp: newXp,
    };
}

module.exports = {
    awardMessageXp,
    awardReactionXp,
    awardVoiceXp,
    addXpManual,
    removeXpManual,
    isOnCooldown,
    randomXp,
};
