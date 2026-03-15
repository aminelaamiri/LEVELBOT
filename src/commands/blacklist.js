/**
 * blacklist.js — Commande /blacklist
 * Gérer la blacklist (utilisateurs/canaux exclus de l'attribution d'XP)
 */
const { EmbedBuilder } = require('discord.js');
const { isAuthorized } = require('../utils/permissions');
const { accessDeniedEmbed, successEmbed, errorEmbed, COLORS } = require('../utils/embeds');
const { addToBlacklist, removeFromBlacklist, getBlacklist } = require('../database/db');
const { logAdminAction } = require('../utils/logger');

/**
 * @param {import('discord.js').ChatInputCommandInteraction} interaction
 */
async function handleBlacklist(interaction) {
    if (!isAuthorized(interaction)) {
        return interaction.reply({ embeds: [accessDeniedEmbed()], ephemeral: true });
    }

    const action = interaction.options.getString('action');
    const guildId = interaction.guild.id;

    // ─── LIST ───
    if (action === 'list') {
        const list = getBlacklist(guildId);
        const users = list.filter(b => b.target_type === 'user');
        const channels = list.filter(b => b.target_type === 'channel');

        const embed = new EmbedBuilder()
            .setColor(COLORS.INFO)
            .setTitle('🚫 Blacklist XP')
            .addFields(
                {
                    name: `👤 Utilisateurs (${users.length})`,
                    value: users.length > 0 ? users.map(b => `<@${b.target_id}>`).join('\n') : '*Aucun*',
                    inline: true,
                },
                {
                    name: `📝 Canaux (${channels.length})`,
                    value: channels.length > 0 ? channels.map(b => `<#${b.target_id}>`).join('\n') : '*Aucun*',
                    inline: true,
                },
            )
            .setFooter({ text: 'Les cibles blacklistées ne gagnent pas d\'XP.' })
            .setTimestamp();

        return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    // ─── ADD / REMOVE ───
    const type = interaction.options.getString('type');
    const target = interaction.options.getString('target');

    if (!type || !target) {
        return interaction.reply({
            embeds: [errorEmbed('Paramètres manquants', 'Vous devez spécifier le `type` (user/channel) et la `target` (ID).')],
            ephemeral: true,
        });
    }

    // Extraire l'ID depuis une mention (@user, #channel) ou ID brut
    const targetId = target.replace(/[<@!#&>]/g, '');

    if (!/^\d{17,20}$/.test(targetId)) {
        return interaction.reply({
            embeds: [errorEmbed('ID Invalide', `\`${target}\` n'est pas un ID Discord valide.`)],
            ephemeral: true,
        });
    }

    if (action === 'add') {
        addToBlacklist(guildId, targetId, type);

        const mention = type === 'user' ? `<@${targetId}>` : `<#${targetId}>`;
        const embed = successEmbed(
            'Ajouté à la Blacklist',
            `${mention} ne gagnera plus d'XP sur ce serveur.`,
        );

        await interaction.reply({ embeds: [embed], ephemeral: true });
        await logAdminAction(interaction.guild, interaction.user.id, 'blacklist add', targetId, `Type: ${type}`);
    } else if (action === 'remove') {
        removeFromBlacklist(guildId, targetId);

        const mention = type === 'user' ? `<@${targetId}>` : `<#${targetId}>`;
        const embed = successEmbed(
            'Retiré de la Blacklist',
            `${mention} peut de nouveau gagner de l'XP.`,
        );

        await interaction.reply({ embeds: [embed], ephemeral: true });
        await logAdminAction(interaction.guild, interaction.user.id, 'blacklist remove', targetId, `Type: ${type}`);
    }
}

module.exports = { handleBlacklist };
