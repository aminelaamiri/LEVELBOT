/**
 * permissions.js — Vérification des permissions (owner / superviseurs / modérateurs)
 * Supporte la vérification par user ID ET par rôle Discord
 */
const { config } = require('../config');

/**
 * Vérifier si un utilisateur est le owner ou un superviseur (par user ID)
 * @param {string} userId — ID Discord de l'utilisateur
 * @returns {boolean}
 */
function isOwnerOrSupervisor(userId) {
    if (userId === config.ownerId) return true;
    if (config.supervisorIds.includes(userId)) return true;
    return false;
}

/**
 * Vérifier si une interaction provient d'un utilisateur autorisé
 * Vérifie : Owner ID → Supervisor IDs → Supervisor Role → Mod Role
 * @param {import('discord.js').ChatInputCommandInteraction} interaction
 * @returns {boolean}
 */
function isAuthorized(interaction) {
    const userId = interaction.user.id;

    // 1. Owner par user ID
    if (userId === config.ownerId) return true;

    // 2. Superviseur par user ID
    if (config.supervisorIds.includes(userId)) return true;

    // 3. Superviseur par rôle Discord
    if (config.supervisorRoleId && interaction.member?.roles?.cache?.has(config.supervisorRoleId)) {
        return true;
    }

    // 4. Modérateur par rôle Discord
    if (config.modRoleId && interaction.member?.roles?.cache?.has(config.modRoleId)) {
        return true;
    }

    return false;
}

module.exports = { isOwnerOrSupervisor, isAuthorized };
