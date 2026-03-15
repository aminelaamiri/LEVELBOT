/**
 * removexp.js — Commande /removexp
 * Permet à un owner/superviseur/modérateur de retirer de l'XP
 * Gère le retrait/attribution de rôle si le niveau change
 */
const { isAuthorized } = require('../utils/permissions');
const { accessDeniedEmbed, successEmbed } = require('../utils/embeds');
const { removeXpManual } = require('../systems/xp');
const { handleLevelUpRole } = require('../systems/roles');
const { logAdminAction } = require('../utils/logger');

/**
 * @param {import('discord.js').ChatInputCommandInteraction} interaction
 */
async function handleRemoveXp(interaction) {
    if (!isAuthorized(interaction)) {
        return interaction.reply({ embeds: [accessDeniedEmbed()], ephemeral: true });
    }

    const targetUser = interaction.options.getUser('user');
    const amount = interaction.options.getInteger('amount');
    const guildId = interaction.guild.id;

    const result = removeXpManual(targetUser.id, guildId, amount, interaction.user.id);

    // Si le niveau a baissé, mettre à jour les rôles
    if (result.leveled) {
        const member = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
        if (member) {
            // handleLevelUpRole gère aussi la descente : il attribue le bon rôle
            // et retire ceux qui ne correspondent plus
            await handleLevelUpRole(member, result.newLevel);
        }
    }

    const embed = successEmbed(
        'XP Retiré',
        `**-${amount.toLocaleString('fr-FR')} XP** retiré de <@${targetUser.id}>.\n\n` +
        `📊 Niveau : **${result.newLevel}** • XP total : **${result.totalXp.toLocaleString('fr-FR')}**` +
        (result.leveled ? `\n⬇️ Niveau réduit : ${result.oldLevel} → **${result.newLevel}**` : ''),
    );

    await interaction.reply({ embeds: [embed], ephemeral: true });
    await logAdminAction(interaction.guild, interaction.user.id, 'removexp', targetUser.id, `-${amount} XP (total: ${result.totalXp})`);
}

module.exports = { handleRemoveXp };
