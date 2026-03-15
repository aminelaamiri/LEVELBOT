/**
 * setrolemap.js — Commande /setrolemap et /removerolemap
 * Configurer le mapping niveau → rôle
 */
const { isAuthorized } = require('../utils/permissions');
const { accessDeniedEmbed, successEmbed, infoEmbed } = require('../utils/embeds');
const { setRoleMapping, removeRoleMapping, getRoleMap } = require('../database/db');
const { logAdminAction } = require('../utils/logger');

/**
 * /setrolemap — Définir un palier niveau→rôle
 * @param {import('discord.js').ChatInputCommandInteraction} interaction
 */
async function handleSetRoleMap(interaction) {
    if (!isAuthorized(interaction)) {
        return interaction.reply({ embeds: [accessDeniedEmbed()], ephemeral: true });
    }

    const level = interaction.options.getInteger('level');
    const role = interaction.options.getRole('role');
    const guildId = interaction.guild.id;

    setRoleMapping(guildId, level, role.id);

    const embed = successEmbed(
        'Mapping Configuré',
        `Niveau **${level}** → <@&${role.id}> (**${role.name}**)\n\n` +
        `Les membres atteignant le niveau ${level} recevront automatiquement ce rôle.`,
    );

    await interaction.reply({ embeds: [embed], ephemeral: true });
    await logAdminAction(interaction.guild, interaction.user.id, 'setrolemap', '-', `Niveau ${level} → ${role.name} (${role.id})`);
}

/**
 * /removerolemap — Supprimer un palier
 */
async function handleRemoveRoleMap(interaction) {
    if (!isAuthorized(interaction)) {
        return interaction.reply({ embeds: [accessDeniedEmbed()], ephemeral: true });
    }

    const level = interaction.options.getInteger('level');
    const guildId = interaction.guild.id;

    removeRoleMapping(guildId, level);

    const embed = successEmbed(
        'Mapping Supprimé',
        `Le palier au niveau **${level}** a été supprimé.`,
    );

    await interaction.reply({ embeds: [embed], ephemeral: true });
}

module.exports = { handleSetRoleMap, handleRemoveRoleMap };
