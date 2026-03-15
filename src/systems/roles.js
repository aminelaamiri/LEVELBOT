/**
 * roles.js — Système de mapping niveaux → rôles
 * Gère l'attribution automatique de rôles quand un membre atteint un palier
 */
const { getRoleMap } = require('../database/db');
const { config } = require('../config');

/**
 * Récupérer le rôle correspondant à un niveau exact
 * @param {string} guildId
 * @param {number} level
 * @returns {string|null} — Role ID ou null
 */
function getRoleForLevel(guildId, level) {
    const map = getRoleMap(guildId);
    const entry = map.find(m => m.level === level);
    return entry ? entry.role_id : null;
}

/**
 * Récupérer le rôle le plus élevé qu'un utilisateur devrait avoir
 * en fonction de son niveau actuel
 * @param {string} guildId
 * @param {number} level
 * @returns {string|null} — Role ID du palier le plus élevé atteint
 */
function getHighestRoleForLevel(guildId, level) {
    const map = getRoleMap(guildId);
    let highestRole = null;
    let highestLevel = 0;

    for (const entry of map) {
        if (entry.level <= level && entry.level >= highestLevel) {
            highestLevel = entry.level;
            highestRole = entry.role_id;
        }
    }

    return { roleId: highestRole, level: highestLevel };
}

/**
 * Récupérer tous les rôles de paliers inférieurs (pour retrait éventuel)
 * @param {string} guildId
 * @param {number} currentLevel — Niveau actuel du membre
 * @returns {string[]} — Liste des role IDs des paliers inférieurs
 */
function getPreviousLevelRoles(guildId, currentLevel) {
    const map = getRoleMap(guildId);
    return map
        .filter(m => m.level < currentLevel)
        .map(m => m.role_id);
}

/**
 * Gérer l'attribution de rôle après un level-up ou ajout manuel d'XP
 * Vérifie les permissions, assigne le nouveau rôle et retire l'ancien si configuré
 *
 * @param {import('discord.js').GuildMember} member — Le membre Discord
 * @param {number} newLevel — Nouveau niveau atteint
 * @returns {{ roleAssigned: boolean, roleName: string|null, roleId: string|null, error: string|null }}
 */
async function handleLevelUpRole(member, newLevel) {
    const guildId = member.guild.id;
    // On prend le rôle le plus élevé que le joueur a pu débloquer pour le niveau actuel
    const highestData = getHighestRoleForLevel(guildId, newLevel);
    const roleId = highestData.roleId;
    const highestRoleLevel = highestData.level;

    // Pas de rôle configuré pour ce niveau
    if (!roleId) {
        return { roleAssigned: false, roleName: null, roleId: null, error: null };
    }

    try {
        const guild = member.guild;
        const role = guild.roles.cache.get(roleId);

        if (!role) {
            return { roleAssigned: false, roleName: null, roleId, error: `Rôle introuvable (ID: ${roleId})` };
        }

        // Vérifier que le bot peut gérer ce rôle (hiérarchie)
        const botMember = await guild.members.fetchMe();
        if (role.position >= botMember.roles.highest.position) {
            return {
                roleAssigned: false,
                roleName: role.name,
                roleId,
                error: `Le rôle **${role.name}** (pos: ${role.position}) est au-dessus du bot (pos: ${botMember.roles.highest.position}) dans la hiérarchie.`,
            };
        }

        // Vérifier que le bot a la permission ManageRoles
        if (!botMember.permissions.has('ManageRoles')) {
            return {
                roleAssigned: false,
                roleName: role.name,
                roleId,
                error: 'Le bot n\'a pas la permission **Gérer les rôles**.',
            };
        }

        // Retirer les rôles de paliers précédents si configuré
        if (config.removePreviousRole) {
            const previousRoles = getPreviousLevelRoles(guildId, highestRoleLevel);
            for (const prevRoleId of previousRoles) {
                if (member.roles.cache.has(prevRoleId)) {
                    try {
                        await member.roles.remove(prevRoleId);
                    } catch (err) {
                        console.warn(`⚠️ Impossible de retirer le rôle précédent ${prevRoleId}:`, err.message);
                    }
                }
            }
        }

        // Assigner le nouveau rôle
        if (!member.roles.cache.has(roleId)) {
            await member.roles.add(roleId);
        }

        return { roleAssigned: true, roleName: role.name, roleId, error: null };
    } catch (err) {
        console.error(`❌ Erreur (exception) lors de l'assignation du rôle (level ${newLevel}):`, err);
        return { roleAssigned: false, roleName: null, roleId, error: err.message };
    }
}

module.exports = {
    getRoleForLevel,
    getHighestRoleForLevel,
    getPreviousLevelRoles,
    handleLevelUpRole,
};
