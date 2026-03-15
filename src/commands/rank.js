/**
 * rank.js — Commande /rank
 * Affiche l'XP, le niveau et la position d'un membre via une image Canvas premium
 */
const { getUser, getUserRank, getUserCount } = require('../database/db');
const { createRankCardAttachment } = require('../utils/rankCard');

/**
 * @param {import('discord.js').ChatInputCommandInteraction} interaction
 */
async function handleRank(interaction) {
    const targetUser = interaction.options.getUser('user') || interaction.user;
    const guildId = interaction.guild.id;

    const userData = getUser(targetUser.id, guildId);

    if (!userData || userData.xp === 0) {
        return interaction.reply({
            content: `📊 **${targetUser.displayName}** n'a pas encore d'XP sur ce serveur.`,
            ephemeral: true,
        });
    }

    const rank = getUserRank(targetUser.id, guildId);
    const totalUsers = getUserCount(guildId);
    const attachment = await createRankCardAttachment(targetUser, userData, rank, interaction.guild, totalUsers);

    return interaction.reply({ files: [attachment] });
}

module.exports = { handleRank };
