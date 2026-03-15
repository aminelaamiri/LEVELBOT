/**
 * register.js — Définition et enregistrement de toutes les slash commands
 */
const { SlashCommandBuilder, ChannelType, PermissionFlagsBits } = require('discord.js');

/**
 * Retourner la liste de toutes les commandes slash en JSON
 * @returns {object[]}
 */
function getCommandDefinitions() {
    return [
        // ─── /rank ───
        new SlashCommandBuilder()
            .setName('rank')
            .setDescription('📊 Affiche ton XP, niveau et position dans le leaderboard.')
            .addUserOption(opt =>
                opt.setName('user')
                    .setDescription('Membre à consulter (optionnel)')
                    .setRequired(false)),

        // ─── /leaderboard ───
        new SlashCommandBuilder()
            .setName('leaderboard')
            .setDescription('🏆 Affiche le classement des membres par XP.')
            .addIntegerOption(opt =>
                opt.setName('page')
                    .setDescription('Numéro de page (défaut: 1)')
                    .setMinValue(1)
                    .setRequired(false)),

        // ─── /addxp ───
        new SlashCommandBuilder()
            .setName('addxp')
            .setDescription('➕ Ajouter de l\'XP à un membre (Owner/Superviseur/Modérateur).')
            .setDefaultMemberPermissions('0')
            .addUserOption(opt =>
                opt.setName('user')
                    .setDescription('Membre cible')
                    .setRequired(true))
            .addIntegerOption(opt =>
                opt.setName('amount')
                    .setDescription('Montant d\'XP à ajouter')
                    .setMinValue(1)
                    .setMaxValue(100000)
                    .setRequired(true)),

        // ─── /removexp ───
        new SlashCommandBuilder()
            .setName('removexp')
            .setDescription('➖ Retirer de l\'XP à un membre (Owner/Superviseur/Modérateur).')
            .setDefaultMemberPermissions('0')
            .addUserOption(opt =>
                opt.setName('user')
                    .setDescription('Membre cible')
                    .setRequired(true))
            .addIntegerOption(opt =>
                opt.setName('amount')
                    .setDescription('Montant d\'XP à retirer')
                    .setMinValue(1)
                    .setMaxValue(100000)
                    .setRequired(true)),

        // ─── /setrolemap ───
        new SlashCommandBuilder()
            .setName('setrolemap')
            .setDescription('🗺️ Configurer le mapping niveau → rôle (Owner/Superviseur/Modérateur).')
            .setDefaultMemberPermissions('0')
            .addIntegerOption(opt =>
                opt.setName('level')
                    .setDescription('Niveau du palier (ex: 10, 20, 30)')
                    .setMinValue(1)
                    .setMaxValue(80)
                    .setRequired(true))
            .addRoleOption(opt =>
                opt.setName('role')
                    .setDescription('Rôle à attribuer à ce palier')
                    .setRequired(true)),

        // ─── /removerolemap ───
        new SlashCommandBuilder()
            .setName('removerolemap')
            .setDescription('🗑️ Supprimer un palier du mapping niveau → rôle (Owner/Superviseur/Modérateur).')
            .setDefaultMemberPermissions('0')
            .addIntegerOption(opt =>
                opt.setName('level')
                    .setDescription('Niveau du palier à supprimer')
                    .setMinValue(1)
                    .setMaxValue(80)
                    .setRequired(true)),

        // ─── /setchannel ───
        new SlashCommandBuilder()
            .setName('setchannel')
            .setDescription('📝 Configurer un canal spécial (Owner/Superviseur/Modérateur).')
            .setDefaultMemberPermissions('0')
            .addStringOption(opt =>
                opt.setName('type')
                    .setDescription('Type de canal')
                    .setRequired(true)
                    .addChoices(
                        { name: 'logs — Canal de logs admin', value: 'log' },
                        { name: 'levelup — Canal des annonces level-up', value: 'levelup' },
                        { name: 'xp — Canal de la commande r (progression)', value: 'xp' },
                    ))
            .addChannelOption(opt =>
                opt.setName('channel')
                    .setDescription('Canal cible')
                    .addChannelTypes(ChannelType.GuildText)
                    .setRequired(true)),

        // ─── /config ───
        new SlashCommandBuilder()
            .setName('config')
            .setDescription('⚙️ Afficher la configuration actuelle du bot (Owner/Superviseur/Modérateur).')
            .setDefaultMemberPermissions('0'),

        // ─── /blacklist ───
        new SlashCommandBuilder()
            .setName('blacklist')
            .setDescription('🚫 Gérer la blacklist XP (Owner/Superviseur/Modérateur).')
            .setDefaultMemberPermissions('0')
            .addStringOption(opt =>
                opt.setName('action')
                    .setDescription('Action à effectuer')
                    .setRequired(true)
                    .addChoices(
                        { name: 'add — Ajouter à la blacklist', value: 'add' },
                        { name: 'remove — Retirer de la blacklist', value: 'remove' },
                        { name: 'list — Voir la blacklist', value: 'list' },
                    ))
            .addStringOption(opt =>
                opt.setName('type')
                    .setDescription('Type de cible')
                    .setRequired(false)
                    .addChoices(
                        { name: 'user — Utilisateur', value: 'user' },
                        { name: 'channel — Canal', value: 'channel' },
                    ))
            .addStringOption(opt =>
                opt.setName('target')
                    .setDescription('ID ou @mention de la cible')
                    .setRequired(false)),

        // ─── /export ───
        new SlashCommandBuilder()
            .setName('export')
            .setDescription('📤 Exporter les données du bot en JSON (Owner/Superviseur/Modérateur).')
            .setDefaultMemberPermissions('0'),

        // ─── /import ───
        new SlashCommandBuilder()
            .setName('import')
            .setDescription('📥 Importer des données JSON (Owner/Superviseur/Modérateur).')
            .setDefaultMemberPermissions('0')
            .addAttachmentOption(opt =>
                opt.setName('file')
                    .setDescription('Fichier JSON à importer')
                    .setRequired(true)),

    ].map(cmd => cmd.toJSON());
}

module.exports = { getCommandDefinitions };
