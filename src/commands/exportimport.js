/**
 * exportimport.js — Commandes /export et /import
 * Exporter les données en JSON, importer depuis un fichier JSON
 * Import avec validation et sanitization des données
 */
const { AttachmentBuilder } = require('discord.js');
const { isAuthorized } = require('../utils/permissions');
const { accessDeniedEmbed, successEmbed, errorEmbed } = require('../utils/embeds');
const { getAllUsers, importUsers, getRoleMap } = require('../database/db');
const { logAdminAction } = require('../utils/logger');
const { maxXp } = require('../systems/levels');

/**
 * /export — Exporter les données du serveur en JSON
 * @param {import('discord.js').ChatInputCommandInteraction} interaction
 */
async function handleExport(interaction) {
    if (!isAuthorized(interaction)) {
        return interaction.reply({ embeds: [accessDeniedEmbed()], ephemeral: true });
    }

    const guildId = interaction.guild.id;
    const users = getAllUsers(guildId);
    const roleMap = getRoleMap(guildId);

    const exportData = {
        guild_id: guildId,
        exported_at: new Date().toISOString(),
        total_users: users.length,
        users,
        role_map: roleMap,
    };

    const json = JSON.stringify(exportData, null, 2);
    const buffer = Buffer.from(json, 'utf-8');
    const attachment = new AttachmentBuilder(buffer, {
        name: `leveling_export_${guildId}_${Date.now()}.json`,
    });

    const embed = successEmbed(
        'Export Réussi',
        `📦 **${users.length}** membres exportés.\nLe fichier JSON est joint ci-dessous.`,
    );

    await interaction.reply({ embeds: [embed], files: [attachment], ephemeral: true });
    await logAdminAction(interaction.guild, interaction.user.id, 'export', '-', `${users.length} membres exportés`);
}

/**
 * /import — Importer des données depuis un fichier JSON
 * Valide et sanitize les données avant insertion
 * @param {import('discord.js').ChatInputCommandInteraction} interaction
 */
async function handleImport(interaction) {
    if (!isAuthorized(interaction)) {
        return interaction.reply({ embeds: [accessDeniedEmbed()], ephemeral: true });
    }

    const attachment = interaction.options.getAttachment('file');

    // Vérifier le type de fichier
    if (!attachment.name.endsWith('.json')) {
        return interaction.reply({
            embeds: [errorEmbed('Format Invalide', 'Le fichier doit être au format `.json`.')],
            ephemeral: true,
        });
    }

    // Vérifier la taille (max 8 MB)
    if (attachment.size > 8 * 1024 * 1024) {
        return interaction.reply({
            embeds: [errorEmbed('Fichier Trop Lourd', 'Le fichier ne doit pas dépasser **8 MB**.')],
            ephemeral: true,
        });
    }

    await interaction.deferReply({ ephemeral: true });

    try {
        // Télécharger le fichier
        const response = await fetch(attachment.url);
        const text = await response.text();
        const data = JSON.parse(text);

        if (!data.users || !Array.isArray(data.users)) {
            return interaction.editReply({
                embeds: [errorEmbed('Format Invalide', 'Le fichier JSON doit contenir un tableau `users`.')],
            });
        }

        const guildId = interaction.guild.id;
        const xpCap = maxXp();
        let skipped = 0;

        // Sanitize les données avant import
        const sanitizedUsers = data.users.filter(u => {
            // Valider user_id (doit être un snowflake Discord)
            if (!u.user_id || !/^\d{17,20}$/.test(String(u.user_id))) {
                skipped++;
                return false;
            }
            return true;
        }).map(u => ({
            user_id: String(u.user_id),
            xp: Math.max(0, Math.min(parseInt(u.xp, 10) || 0, xpCap)),
            level: Math.max(0, Math.min(parseInt(u.level, 10) || 0, 80)),
            total_messages: Math.max(0, parseInt(u.total_messages, 10) || 0),
            last_xp_at: parseInt(u.last_xp_at, 10) || 0,
        }));

        importUsers(guildId, sanitizedUsers);

        const embed = successEmbed(
            'Import Réussi',
            `📥 **${sanitizedUsers.length}** membres importés avec succès.` +
            (skipped > 0 ? `\n⚠️ **${skipped}** entrées ignorées (ID invalide).` : '') +
            `\n\n⚠️ Les données existantes des membres importés ont été mises à jour.`,
        );

        await interaction.editReply({ embeds: [embed] });
        await logAdminAction(interaction.guild, interaction.user.id, 'import', '-', `${sanitizedUsers.length} membres importés (${skipped} ignorés)`);
    } catch (err) {
        console.error('❌ Erreur import:', err.message);
        await interaction.editReply({
            embeds: [errorEmbed('Erreur d\'Import', `\`\`\`${err.message}\`\`\``)],
        });
    }
}

module.exports = { handleExport, handleImport };
