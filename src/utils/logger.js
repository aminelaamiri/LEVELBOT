/**
 * logger.js — Système de logs (DB + canal Discord)
 * Enregistre les événements importants et envoie optionnellement dans un canal de logs
 */
const { EmbedBuilder } = require('discord.js');
const { config } = require('../config');
const { COLORS } = require('./embeds');

/**
 * Envoyer un embed dans le canal de logs configuré
 * @param {import('discord.js').Guild} guild
 * @param {EmbedBuilder} embed
 */
async function sendLogEmbed(guild, embed) {
    try {
        if (!config.logChannelId) return;

        let logChannel = guild.channels.cache.get(config.logChannelId);
        if (!logChannel) {
            try {
                logChannel = await guild.channels.fetch(config.logChannelId);
            } catch {
                console.error(`⚠️ Canal de logs introuvable (ID: ${config.logChannelId})`);
                return;
            }
        }

        if (logChannel) {
            await logChannel.send({ embeds: [embed] });
        }
    } catch (err) {
        console.error('⚠️ Impossible d\'envoyer le log:', err.message);
    }
}

/**
 * Fallback pour level-up quand les DMs sont fermés
 * Envoie dans LOG_CHANNEL_ID ou LEVELUP_CHANNEL_ID
 * @param {import('discord.js').Guild} guild
 * @param {EmbedBuilder} embed
 */
async function sendLevelUpFallback(guild, embed) {
    try {
        // Essayer LOG_CHANNEL d'abord, puis LEVELUP_CHANNEL
        const channelId = config.logChannelId || config.levelupChannelId;
        if (!channelId) return;

        let channel = guild.channels.cache.get(channelId);
        if (!channel) {
            channel = await guild.channels.fetch(channelId).catch(() => null);
        }

        if (channel) {
            await channel.send({ embeds: [embed] });
        }
    } catch (err) {
        console.error('⚠️ Fallback level-up impossible:', err.message);
    }
}

/**
 * Logger un level-up dans le canal de logs
 */
async function logLevelUp(guild, userId, oldLevel, newLevel, totalXp) {
    const embed = new EmbedBuilder()
        .setColor(COLORS.LEVELUP)
        .setTitle('⬆️ Level Up')
        .addFields(
            { name: '👤 Membre', value: `<@${userId}>`, inline: true },
            { name: '📈 Niveau', value: `${oldLevel} → **${newLevel}**`, inline: true },
            { name: '✨ XP Total', value: totalXp.toLocaleString('fr-FR'), inline: true },
        )
        .setTimestamp();
    await sendLogEmbed(guild, embed);
}

/**
 * Logger une action admin (addxp, removexp)
 */
async function logAdminAction(guild, adminId, action, targetId, details) {
    const embed = new EmbedBuilder()
        .setColor(COLORS.ADMIN)
        .setTitle(`🔧 Action Admin : ${action}`)
        .addFields(
            { name: '👮 Admin', value: `<@${adminId}>`, inline: true },
            { name: '🎯 Cible', value: `<@${targetId}>`, inline: true },
            { name: '📝 Détails', value: details, inline: false },
        )
        .setTimestamp();
    await sendLogEmbed(guild, embed);
}

/**
 * Logger une erreur
 */
async function logError(guild, context, errorMessage) {
    const embed = new EmbedBuilder()
        .setColor(COLORS.ERROR)
        .setTitle('❌ Erreur')
        .addFields(
            { name: '📍 Contexte', value: context, inline: false },
            { name: '💬 Message', value: `\`\`\`${errorMessage}\`\`\``, inline: false },
        )
        .setTimestamp();
    await sendLogEmbed(guild, embed);
}

module.exports = {
    sendLogEmbed,
    sendLevelUpFallback,
    logLevelUp,
    logAdminAction,
    logError,
};
