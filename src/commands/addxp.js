/**
 * addxp.js — Commande /addxp
 * Permet à un owner/superviseur/modérateur d'ajouter de l'XP manuellement
 * Envoie un DM de level-up si le niveau monte
 */
const { isAuthorized } = require('../utils/permissions');
const { accessDeniedEmbed, successEmbed, levelUpEmbed } = require('../utils/embeds');
const { addXpManual } = require('../systems/xp');
const { handleLevelUpRole } = require('../systems/roles');
const { logAdminAction } = require('../utils/logger');
const { sendLevelUpFallback } = require('../utils/logger');

/**
 * @param {import('discord.js').ChatInputCommandInteraction} interaction
 */
async function handleAddXp(interaction) {
    if (!isAuthorized(interaction)) {
        return interaction.reply({ embeds: [accessDeniedEmbed()], ephemeral: true });
    }

    const targetUser = interaction.options.getUser('user');
    const amount = interaction.options.getInteger('amount');
    const guildId = interaction.guild.id;

    const result = addXpManual(targetUser.id, guildId, amount, interaction.user.id);

    // Si level-up, gérer les rôles et envoyer le DM
    if (result.leveled) {
        const member = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
        let roleName = null;
        let roleId = null;

        if (member) {
            const roleResult = await handleLevelUpRole(member, result.newLevel);
            roleName = roleResult.roleName;
            roleId = roleResult.roleId;
        }

        // Envoyer le DM de Level Up avec fallback
        const dmEmbed = levelUpEmbed(targetUser, result.newLevel, result.totalXp, { roleName, roleId });
        try {
            await targetUser.send({ embeds: [dmEmbed] });
        } catch (err) {
            console.warn(`⚠️ DMs fermés pour ${targetUser.tag} via /addxp — fallback`);
            await sendLevelUpFallback(interaction.guild, dmEmbed);
        }
    }

    const embed = successEmbed(
        'XP Ajouté',
        `**+${amount.toLocaleString('fr-FR')} XP** ajouté à <@${targetUser.id}>.\n\n` +
        `📊 Niveau : **${result.newLevel}** • XP total : **${result.totalXp.toLocaleString('fr-FR')}**` +
        (result.leveled ? `\n🎉 Level up ! Niveau ${result.oldLevel} → **${result.newLevel}**` : ''),
    );

    await interaction.reply({ embeds: [embed], ephemeral: true });
    await logAdminAction(interaction.guild, interaction.user.id, 'addxp', targetUser.id, `+${amount} XP (total: ${result.totalXp})`);
}

module.exports = { handleAddXp };
