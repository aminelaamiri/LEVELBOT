/**
 * configShow.js — Commande /config
 * Affiche la configuration actuelle du bot
 */
const { EmbedBuilder } = require('discord.js');
const { isAuthorized } = require('../utils/permissions');
const { accessDeniedEmbed, COLORS } = require('../utils/embeds');
const { config } = require('../config');
const { getRoleMap, getBlacklist } = require('../database/db');

/**
 * @param {import('discord.js').ChatInputCommandInteraction} interaction
 */
async function handleConfigShow(interaction) {
    if (!isAuthorized(interaction)) {
        return interaction.reply({ embeds: [accessDeniedEmbed()], ephemeral: true });
    }

    const guildId = interaction.guild.id;
    const roleMap = getRoleMap(guildId);
    const blacklist = getBlacklist(guildId);

    // Formater le role map
    const roleMapStr = roleMap.length > 0
        ? roleMap.map(m => `Niveau **${m.level}** → <@&${m.role_id}>`).join('\n')
        : '*Aucun palier configuré*';

    // Formater la blacklist
    const blacklistUsers = blacklist.filter(b => b.target_type === 'user');
    const blacklistChannels = blacklist.filter(b => b.target_type === 'channel');
    const blUsersStr = blacklistUsers.length > 0
        ? blacklistUsers.map(b => `<@${b.target_id}>`).join(', ')
        : '*Aucun*';
    const blChannelsStr = blacklistChannels.length > 0
        ? blacklistChannels.map(b => `<#${b.target_id}>`).join(', ')
        : '*Aucun*';

    const embed = new EmbedBuilder()
        .setColor(COLORS.INFO)
        .setTitle('⚙️ Configuration du Bot de Leveling')
        .addFields(
            { name: '📊 XP par message', value: `${config.xpMin} — ${config.xpMax} XP`, inline: true },
            { name: '⏱️ Cooldown', value: `${config.xpCooldown}s`, inline: true },
            { name: '🎯 Multiplicateur XP', value: `×${config.xpMultiplier}`, inline: true },
            { name: '🔄 XP Réaction', value: config.reactionXpEnabled ? `Activé (${config.xpPerReaction} XP / ${config.xpReactionCooldown}s)` : 'Désactivé', inline: true },
            { name: '🎤 XP Vocal', value: config.voiceXpEnabled ? `Activé (${config.voiceXpRate} XP / ${config.voiceXpInterval}s)` : 'Désactivé', inline: true },
            { name: '📈 Niveau Max', value: `${config.maxLevel}`, inline: true },
            { name: '🗑️ Retirer rôle précédent', value: config.removePreviousRole ? 'Oui' : 'Non', inline: true },
            { name: '📝 Canal Logs', value: config.logChannelId ? `<#${config.logChannelId}>` : '*Non configuré*', inline: true },
            { name: '🎉 Canal Level-Up', value: config.levelupChannelId ? `<#${config.levelupChannelId}>` : '*DM uniquement*', inline: true },
            { name: '💬 Canal XP (r)', value: config.channelXpId ? `<#${config.channelXpId}>` : '*Non configuré*', inline: true },
            { name: '👑 Owner', value: `<@${config.ownerId}>`, inline: true },
            { name: '👥 Superviseurs', value: config.supervisorIds.length > 0 ? config.supervisorIds.map(id => `<@${id}>`).join(', ') : '*Aucun*', inline: true },
            { name: '🛡️ Rôle Superviseur', value: config.supervisorRoleId ? `<@&${config.supervisorRoleId}>` : '*Non configuré*', inline: true },
            { name: '🔧 Rôle Modérateur', value: config.modRoleId ? `<@&${config.modRoleId}>` : '*Non configuré*', inline: true },
            { name: '\u200b', value: '───────────────────', inline: false },
            { name: '🗺️ Mapping Niveaux → Rôles', value: roleMapStr, inline: false },
            { name: '🚫 Blacklist Utilisateurs', value: blUsersStr, inline: true },
            { name: '🚫 Blacklist Canaux', value: blChannelsStr, inline: true },
        )
        .setTimestamp();

    return interaction.reply({ embeds: [embed], ephemeral: true });
}

module.exports = { handleConfigShow };
