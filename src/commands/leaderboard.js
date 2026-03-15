/**
 * leaderboard.js — Commande /leaderboard
 * Affiche le top des membres par XP, paginé
 */
const { getLeaderboard, getUserCount } = require('../database/db');
const { leaderboardEmbed } = require('../utils/embeds');

/**
 * @param {import('discord.js').ChatInputCommandInteraction} interaction
 */
async function handleLeaderboard(interaction) {
    const page = interaction.options.getInteger('page') || 1;
    const guildId = interaction.guild.id;
    const perPage = 10;
    const offset = (page - 1) * perPage;

    const totalUsers = getUserCount(guildId);

    if (totalUsers === 0) {
        return interaction.reply({
            content: '🏆 Aucun membre n\'a encore gagné d\'XP sur ce serveur.',
            ephemeral: true,
        });
    }

    const entries = getLeaderboard(guildId, perPage, offset);

    if (entries.length === 0) {
        return interaction.reply({
            content: `📄 Page ${page} — Aucun résultat. Essayez une page plus basse.`,
            ephemeral: true,
        });
    }

    const embed = leaderboardEmbed(entries, page, totalUsers, interaction.guild.name);
    return interaction.reply({ embeds: [embed] });
}

module.exports = { handleLeaderboard };
