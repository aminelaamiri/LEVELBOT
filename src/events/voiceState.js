/**
 * voiceState.js — Événement: attribution d'XP pour activité vocale
 * Level-up envoyé en DM avec fallback vers LOG_CHANNEL
 */
const { awardVoiceXp } = require('../systems/xp');
const { handleLevelUpRole } = require('../systems/roles');
const { levelUpEmbed } = require('../utils/embeds');
const { logLevelUp, sendLevelUpFallback } = require('../utils/logger');
const { config } = require('../config');

// Set des membres actuellement en vocal (userId:guildId)
const voiceMembers = new Set();
let voiceInterval = null;

/**
 * Handler pour l'événement VoiceStateUpdate
 * Suit les membres qui rejoignent/quittent les salons vocaux
 */
function handleVoiceStateUpdate(oldState, newState) {
    if (!config.voiceXpEnabled) return;
    if (newState.member?.user?.bot) return;

    const key = `${newState.id}:${newState.guild.id}`;

    if (newState.channel && !oldState.channel) {
        // Membre rejoint un vocal
        voiceMembers.add(key);
    } else if (!newState.channel && oldState.channel) {
        // Membre quitte le vocal
        voiceMembers.delete(key);
    }
}

/**
 * Démarrer le timer d'XP vocale
 * Attribue l'XP à intervalles réguliers aux membres connectés
 * @param {import('discord.js').Client} client
 */
function startVoiceXpTimer(client) {
    if (!config.voiceXpEnabled) return;
    if (voiceInterval) clearInterval(voiceInterval);

    const intervalMs = config.voiceXpInterval * 1000;

    voiceInterval = setInterval(async () => {
        for (const key of voiceMembers) {
            const [userId, guildId] = key.split(':');

            try {
                const result = awardVoiceXp(userId, guildId);
                if (!result) continue;

                if (result.leveled) {
                    const guild = client.guilds.cache.get(guildId);
                    if (!guild) continue;

                    const member = await guild.members.fetch(userId).catch(() => null);
                    if (!member) {
                        // Membre a quitté le serveur, nettoyer
                        voiceMembers.delete(key);
                        continue;
                    }

                    const roleResult = await handleLevelUpRole(member, result.newLevel);

                    const embed = levelUpEmbed(member.user, result.newLevel, result.totalXp, {
                        roleName: roleResult.roleName,
                        roleId: roleResult.roleId,
                    });

                    // Envoyer en DM, fallback vers LOG_CHANNEL
                    try {
                        await member.user.send({ embeds: [embed] });
                    } catch (dmError) {
                        console.warn(`⚠️ DMs fermés pour ${member.user.tag} — fallback vers log channel`);
                        await sendLevelUpFallback(guild, embed);
                    }

                    await logLevelUp(guild, userId, result.oldLevel, result.newLevel, result.totalXp);
                }
            } catch (err) {
                console.error(`❌ Erreur voice XP (${key}):`, err.message);
            }
        }
    }, intervalMs);

    console.log(`🎤 XP Vocale activée — ${config.voiceXpRate} XP toutes les ${config.voiceXpInterval}s`);
}

module.exports = { handleVoiceStateUpdate, startVoiceXpTimer };
