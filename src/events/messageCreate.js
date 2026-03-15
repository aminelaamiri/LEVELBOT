/**
 * messageCreate.js — Événement: attribution d'XP sur message + commandes texte "rr" et "tt"
 * Déclenché à chaque message envoyé ; vérifie cooldown, blacklist, bots
 *
 * Commandes texte (uniquement dans CHANNEL_XP_ID) :
 *   rr → Affiche la rank card image avec progression
 *   tt → Affiche le leaderboard (top 10) en image
 */
const { awardMessageXp } = require('../systems/xp');
const { handleLevelUpRole } = require('../systems/roles');
const { levelUpEmbed } = require('../utils/embeds');
const { logLevelUp, sendLevelUpFallback } = require('../utils/logger');
const { createRankCardAttachment, createLeaderboardCardAttachment } = require('../utils/rankCard');
const { config } = require('../config');
const { getUser, getUserRank, getLeaderboard, getUserCount } = require('../database/db');

/**
 * Handler pour l'événement MessageCreate
 * @param {import('discord.js').Message} message
 */
async function handleMessageCreate(message) {
    // Ignorer les bots, DMs, et messages système
    if (message.author.bot) return;
    if (!message.guild) return;
    if (message.system) return;

    const { author, guild, channel } = message;
    const content = message.content.trim();

    // ─── Commande texte "rr" ou "rr @user" — Progression (rank card image) ───
    if (content === 'rr' || content.startsWith('rr ')) {
        // Ne répondre que dans CHANNEL_XP_ID
        if (config.channelXpId && channel.id === config.channelXpId) {
            try {
                // Déterminer l'utilisateur cible : mention ou auteur
                const mentionedUser = message.mentions.users.first();
                const targetUser = mentionedUser || author;

                const userData = getUser(targetUser.id, guild.id);
                if (!userData || userData.xp === 0) {
                    const noXpMsg = mentionedUser
                        ? `📊 **${targetUser.displayName}** n'a pas encore d'XP sur ce serveur.`
                        : '📊 Tu n\'as pas encore d\'XP. Continue à discuter !';
                    await message.reply({
                        content: noXpMsg,
                        allowedMentions: { repliedUser: false },
                    });
                    return;
                }
                const rank = getUserRank(targetUser.id, guild.id);
                const totalUsers = getUserCount(guild.id);
                const attachment = await createRankCardAttachment(targetUser, userData, rank, guild, totalUsers);
                await message.reply({ files: [attachment], allowedMentions: { repliedUser: false } });
            } catch (err) {
                console.error(`❌ Erreur commande rr (${author.tag}):`, err.message);
            }
        }
        // Si pas dans le bon canal → ignorer silencieusement
        return;
    }

    // ─── Commande texte "tt" / "Tt" — Leaderboard (top 10 en image) ───
    if (content.toLowerCase() === 'tt') {
        // Ne répondre que dans CHANNEL_XP_ID
        if (config.channelXpId && channel.id === config.channelXpId) {
            try {
                const totalUsers = getUserCount(guild.id);
                if (totalUsers === 0) {
                    await message.reply({
                        content: '🏆 Aucun membre n\'a encore gagné d\'XP sur ce serveur.',
                        allowedMentions: { repliedUser: false },
                    });
                    return;
                }

                const entries = getLeaderboard(guild.id, 10, 0);

                // Récupérer les objets User Discord pour chaque entrée (pour avatar + nom)
                const userMap = new Map();
                for (const entry of entries) {
                    try {
                        const user = await guild.client.users.fetch(entry.user_id);
                        if (user) userMap.set(entry.user_id, user);
                    } catch {
                        // Utilisateur introuvable (a quitté le serveur, etc.)
                    }
                }

                const attachment = await createLeaderboardCardAttachment(entries, guild, userMap);
                await message.reply({ files: [attachment], allowedMentions: { repliedUser: false } });
            } catch (err) {
                console.error(`❌ Erreur commande tt (${author.tag}):`, err.message);
            }
        }
        return;
    }

    try {
        // Attribuer l'XP (vérifie cooldown + blacklist en interne)
        const result = awardMessageXp(author.id, guild.id, channel.id);

        if (!result) return; // Cooldown ou blacklist

        // Si level-up détecté
        if (result.leveled) {
            // Gérer l'attribution de rôle
            const member = await guild.members.fetch(author.id).catch(() => null);
            if (!member) return;

            const roleResult = await handleLevelUpRole(member, result.newLevel);

            // Construire l'embed level-up
            const embed = levelUpEmbed(author, result.newLevel, result.totalXp, {
                roleName: roleResult.roleName,
                roleId: roleResult.roleId,
            });

            // Envoyer en DM, fallback vers LOG_CHANNEL si DMs fermés
            try {
                await author.send({ embeds: [embed] });
            } catch (dmError) {
                console.warn(`⚠️ DMs fermés pour ${author.tag} — fallback vers log channel`);
                await sendLevelUpFallback(guild, embed);
            }

            // Log dans le canal de logs
            await logLevelUp(guild, author.id, result.oldLevel, result.newLevel, result.totalXp);

            // Log erreur rôle si applicable
            if (roleResult.error) {
                console.warn(`⚠️ Erreur rôle level-up (${author.tag}, level ${result.newLevel}): ${roleResult.error}`);
            }
        }
    } catch (err) {
        console.error(`❌ Erreur dans messageCreate (${author.tag}):`, err.message);
    }
}

module.exports = { handleMessageCreate };
