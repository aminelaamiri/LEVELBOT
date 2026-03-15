/**
 * embeds.js — Constructeurs d'embeds réutilisables
 * Messages de level-up, rank card, leaderboard, erreurs, succès, progression XP
 */
const { EmbedBuilder } = require('discord.js');
const { xpForLevel, xpToNextLevel, progressPercent, progressBar } = require('../systems/levels');

// ─── Couleurs ───
const COLORS = {
    LEVELUP: 0xFFD700,    // Or
    RANK: 0x5865F2,       // Bleu Discord
    LEADERBOARD: 0x00D4AA, // Emeraude
    SUCCESS: 0x00C853,    // Vert
    ERROR: 0xFF0000,      // Rouge
    WARNING: 0xFFA500,    // Orange
    INFO: 0x5865F2,       // Bleu
    ADMIN: 0x9B59B6,      // Violet
    XP_PROGRESS: 0x00BFFF, // Bleu clair
};

/**
 * Embed de level-up avec rôle optionnel et progression
 * @param {import('discord.js').User} user
 * @param {number} newLevel
 * @param {number} totalXp
 * @param {{ roleName: string|null, roleId: string|null }} roleInfo
 * @returns {EmbedBuilder}
 */
function levelUpEmbed(user, newLevel, totalXp, roleInfo = {}) {
    const progress = progressPercent(totalXp, newLevel);
    const bar = progressBar(progress);
    const nextXp = xpToNextLevel(newLevel);

    const embed = new EmbedBuilder()
        .setColor(COLORS.LEVELUP)
        .setTitle('🎉 Level Up !')
        .setThumbnail(user.displayAvatarURL({ size: 128 }))
        .setDescription(
            `<@${user.id}> vient d'atteindre le **niveau ${newLevel}** !\n` +
            `✨ XP total : **${totalXp.toLocaleString('fr-FR')}**`
        )
        .addFields(
            { name: `📈 Progression (${progress}%)`, value: `${bar}\n${totalXp.toLocaleString('fr-FR')} / ${nextXp.toLocaleString('fr-FR')} XP`, inline: false },
        )
        .setTimestamp();

    if (roleInfo.roleName && roleInfo.roleId) {
        embed.addFields({
            name: '🏅 Nouveau Rôle',
            value: `<@&${roleInfo.roleId}> — **${roleInfo.roleName}**`,
            inline: false,
        });
    }

    return embed;
}

/**
 * Formater un nombre en version compacte (ex: 23 000 → 23.0K)
 * @param {number} n
 * @returns {string}
 */
function formatCompact(n) {
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
    if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
    return n.toLocaleString('fr-FR');
}

/**
 * Générer une barre de progression stylisée pour le embed "r"
 * Utilise des caractères Unicode pour un effet visuel premium
 * @param {number} percent
 * @param {number} length
 * @returns {string}
 */
function fancyProgressBar(percent, length = 18) {
    const filled = Math.round((percent / 100) * length);
    const empty = length - filled;
    const start = filled > 0 ? '▰' : '▱';
    const filledPart = '▰'.repeat(Math.max(0, filled - 1));
    const emptyPart = '▱'.repeat(empty);
    return filled > 0 ? start + filledPart + emptyPart : '▱'.repeat(length);
}

/**
 * Embed de progression XP (pour la commande texte "r")
 * Design premium dark card : avatar, username, level/rank, barre XP, stats
 * @param {import('discord.js').User} user
 * @param {object} data — { xp, level, total_messages }
 * @param {number} rank — Position dans le leaderboard
 * @returns {EmbedBuilder}
 */
function xpProgressEmbed(user, data, rank) {
    const progress = progressPercent(data.xp, data.level);
    const bar = fancyProgressBar(progress);
    const currentLevelXp = xpForLevel(data.level);
    const nextLevelXp = xpToNextLevel(data.level);

    return new EmbedBuilder()
        .setColor(0x2B2D31) // Couleur sombre premium (discord dark)
        .setAuthor({
            name: user.displayName,
            iconURL: user.displayAvatarURL({ size: 128 }),
        })
        .setThumbnail(user.displayAvatarURL({ size: 256 }))
        .setDescription(
            `**Level ${data.level}** • Rank **#${rank}**\n` +
            `\u200b\n` +
            `${bar}\n` +
            `\`${data.xp.toLocaleString('fr-FR')} / ${nextLevelXp.toLocaleString('fr-FR')} XP\`\n` +
            `\u200b`
        )
        .addFields(
            { name: '💬  CHAT', value: `**${formatCompact(data.total_messages)}**`, inline: true },
            { name: '✨  TOTAL XP', value: `**${formatCompact(data.xp)}**`, inline: true },
            { name: '📈  PROGRESS', value: `**${progress}%**`, inline: true },
        )
        .setFooter({ text: `Prochain niveau : ${nextLevelXp.toLocaleString('fr-FR')} XP` });
}

/**
 * Embed de rank (carte utilisateur)
 * @param {import('discord.js').User} user
 * @param {object} data — { xp, level, total_messages }
 * @param {number} rank — Position dans le leaderboard
 * @returns {EmbedBuilder}
 */
function rankEmbed(user, data, rank) {
    const progress = progressPercent(data.xp, data.level);
    const bar = progressBar(progress);
    const nextLevelXp = xpToNextLevel(data.level);

    return new EmbedBuilder()
        .setColor(COLORS.RANK)
        .setTitle(`📊 Profil de ${user.displayName}`)
        .setThumbnail(user.displayAvatarURL({ size: 128 }))
        .addFields(
            { name: '🏆 Rang', value: `#${rank}`, inline: true },
            { name: '⭐ Niveau', value: `${data.level}`, inline: true },
            { name: '✨ XP', value: `${data.xp.toLocaleString('fr-FR')} / ${nextLevelXp.toLocaleString('fr-FR')}`, inline: true },
            { name: '📨 Messages', value: `${data.total_messages.toLocaleString('fr-FR')}`, inline: true },
            { name: `📈 Progression (${progress}%)`, value: bar, inline: false },
        )
        .setTimestamp();
}

/**
 * Embed de leaderboard
 * @param {object[]} entries — Données triées par XP
 * @param {number} page — Page courante (1-indexed)
 * @param {number} totalUsers — Nombre total d'utilisateurs
 * @param {string} guildName — Nom du serveur
 * @returns {EmbedBuilder}
 */
function leaderboardEmbed(entries, page, totalUsers, guildName) {
    const perPage = 10;
    const totalPages = Math.ceil(totalUsers / perPage) || 1;

    const medals = ['🥇', '🥈', '🥉'];
    const lines = entries.map((entry, i) => {
        const globalIndex = (page - 1) * perPage + i;
        const prefix = globalIndex < 3 ? medals[globalIndex] : `**${globalIndex + 1}.**`;
        return `${prefix} <@${entry.user_id}> — Niveau **${entry.level}** • ${entry.xp.toLocaleString('fr-FR')} XP`;
    });

    return new EmbedBuilder()
        .setColor(COLORS.LEADERBOARD)
        .setTitle(`🏆 Leaderboard — ${guildName}`)
        .setDescription(lines.join('\n') || 'Aucun membre classé.')
        .setFooter({ text: `Page ${page}/${totalPages} • ${totalUsers} membres` })
        .setTimestamp();
}

/**
 * Embed d'erreur générique
 */
function errorEmbed(title, description) {
    return new EmbedBuilder()
        .setColor(COLORS.ERROR)
        .setTitle(`❌ ${title}`)
        .setDescription(description)
        .setTimestamp();
}

/**
 * Embed de succès générique
 */
function successEmbed(title, description) {
    return new EmbedBuilder()
        .setColor(COLORS.SUCCESS)
        .setTitle(`✅ ${title}`)
        .setDescription(description)
        .setTimestamp();
}

/**
 * Embed d'info générique
 */
function infoEmbed(title, description) {
    return new EmbedBuilder()
        .setColor(COLORS.INFO)
        .setTitle(`ℹ️ ${title}`)
        .setDescription(description)
        .setTimestamp();
}

/**
 * Embed d'accès refusé
 */
function accessDeniedEmbed() {
    return new EmbedBuilder()
        .setColor(COLORS.ERROR)
        .setTitle('⛔ Accès Refusé')
        .setDescription(
            'Vous n\'avez pas la permission d\'utiliser cette commande.\n\n' +
            '🔒 Seul le **Owner**, un **Superviseur** ou un **Modérateur** peut utiliser cette commande.'
        )
        .setTimestamp();
}

module.exports = {
    COLORS,
    levelUpEmbed,
    xpProgressEmbed,
    rankEmbed,
    leaderboardEmbed,
    errorEmbed,
    successEmbed,
    infoEmbed,
    accessDeniedEmbed,
};
