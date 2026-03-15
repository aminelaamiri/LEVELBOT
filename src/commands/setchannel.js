/**
 * setchannel.js — Commande /setchannel
 * Configurer les canaux spéciaux (logs, level-up, xp)
 */
const { isAuthorized } = require('../utils/permissions');
const { accessDeniedEmbed, successEmbed } = require('../utils/embeds');
const { config } = require('../config');
const { logAdminAction } = require('../utils/logger');

/**
 * @param {import('discord.js').ChatInputCommandInteraction} interaction
 */
async function handleSetChannel(interaction) {
    if (!isAuthorized(interaction)) {
        return interaction.reply({ embeds: [accessDeniedEmbed()], ephemeral: true });
    }

    const type = interaction.options.getString('type');
    const channel = interaction.options.getChannel('channel');

    // Mettre à jour la config en mémoire
    if (type === 'log') {
        config.logChannelId = channel.id;
    } else if (type === 'levelup') {
        config.levelupChannelId = channel.id;
    } else if (type === 'xp') {
        config.channelXpId = channel.id;
    }

    const typeLabels = {
        log: 'Logs Admin',
        levelup: 'Annonces Level-Up',
        xp: 'Commande r (Progression XP)',
    };
    const typeLabel = typeLabels[type] || type;

    const embed = successEmbed(
        'Canal Configuré',
        `**${typeLabel}** → <#${channel.id}>\n\n` +
        `Les messages de type **${typeLabel.toLowerCase()}** seront envoyés dans ce canal.\n\n` +
        `⚠️ *Ce paramètre est sauvegardé en mémoire. Pour le rendre permanent, ajoutez-le dans votre fichier \`.env\`.*`,
    );

    await interaction.reply({ embeds: [embed], ephemeral: true });
    await logAdminAction(interaction.guild, interaction.user.id, 'setchannel', '-', `${typeLabel} → #${channel.name} (${channel.id})`);
}

module.exports = { handleSetChannel };
