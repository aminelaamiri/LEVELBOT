/**
 * reactionAdd.js — Événement: attribution d'XP sur réaction
 * Level-up envoyé en DM avec fallback vers LOG_CHANNEL
 */
const { awardReactionXp } = require('../systems/xp');
const { handleLevelUpRole } = require('../systems/roles');
const { levelUpEmbed } = require('../utils/embeds');
const { logLevelUp, sendLevelUpFallback } = require('../utils/logger');

/**
 * Handler pour l'événement MessageReactionAdd
 * @param {import('discord.js').MessageReaction} reaction
 * @param {import('discord.js').User} user
 */
async function handleReactionAdd(reaction, user) {
    // Ignorer les bots
    if (user.bot) return;
    if (!reaction.message.guild) return;

    // Ne pas donner d'XP pour réagir à son propre message
    if (reaction.message.author?.id === user.id) return;

    const guild = reaction.message.guild;

    try {
        const result = awardReactionXp(user.id, guild.id);
        if (!result) return;

        if (result.leveled) {
            const member = await guild.members.fetch(user.id).catch(() => null);
            if (!member) return;

            const roleResult = await handleLevelUpRole(member, result.newLevel);

            const embed = levelUpEmbed(user, result.newLevel, result.totalXp, {
                roleName: roleResult.roleName,
                roleId: roleResult.roleId,
            });

            // Envoyer en DM, fallback vers LOG_CHANNEL
            try {
                await user.send({ embeds: [embed] });
            } catch (dmError) {
                console.warn(`⚠️ DMs fermés pour ${user.tag} — fallback vers log channel`);
                await sendLevelUpFallback(guild, embed);
            }

            await logLevelUp(guild, user.id, result.oldLevel, result.newLevel, result.totalXp);
        }
    } catch (err) {
        console.error(`❌ Erreur dans reactionAdd (${user.tag}):`, err.message);
    }
}

module.exports = { handleReactionAdd };
