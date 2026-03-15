/**
 * levels.js — Calcul des niveaux et XP requis
 *
 * Formule : xp_required(level) = 100 * level²
 * Progression modérément lente :
 *   Level  1 →     100 XP
 *   Level  5 →   2 500 XP
 *   Level 10 →  10 000 XP
 *   Level 20 →  40 000 XP
 *   Level 30 →  90 000 XP
 *   Level 50 → 250 000 XP
 *   Level 80 → 640 000 XP (MAX)
 *
 * Avec 15-25 XP/message et cooldown 60s :
 *   Level  1 → ~5 min d'activité
 *   Level 10 → ~8 heures
 *   Level 20 → ~33 heures
 *   Level 30 → ~75 heures
 */

const { config } = require('../config');

/**
 * Calculer l'XP total nécessaire pour atteindre un niveau donné
 * @param {number} level — Niveau cible
 * @returns {number} — XP total requis
 */
function xpForLevel(level) {
    if (level <= 0) return 0;
    return 100 * level * level;
}

/**
 * Calculer le niveau correspondant à un total d'XP
 * @param {number} xp — XP total
 * @returns {number} — Niveau atteint (plafonné à maxLevel)
 */
function levelForXp(xp) {
    if (xp <= 0) return 0;
    const level = Math.floor(Math.sqrt(xp / 100));
    return Math.min(level, config.maxLevel);
}

/**
 * Calculer l'XP nécessaire pour passer au niveau suivant
 * Retourne l'XP du niveau max si on est déjà au max
 * @param {number} currentLevel
 * @returns {number}
 */
function xpToNextLevel(currentLevel) {
    if (currentLevel >= config.maxLevel) return xpForLevel(config.maxLevel);
    return xpForLevel(currentLevel + 1);
}

/**
 * Calculer la progression en pourcentage vers le prochain niveau
 * @param {number} xp — XP total actuel
 * @param {number} level — Niveau actuel
 * @returns {number} — Pourcentage (0-100)
 */
function progressPercent(xp, level) {
    if (level >= config.maxLevel) return 100;
    const currentLevelXp = xpForLevel(level);
    const nextLevelXp = xpForLevel(level + 1);
    const diff = nextLevelXp - currentLevelXp;
    if (diff === 0) return 100;
    const progress = ((xp - currentLevelXp) / diff) * 100;
    return Math.min(100, Math.max(0, Math.floor(progress)));
}

/**
 * Générer une barre de progression visuelle
 * @param {number} percent — Pourcentage (0-100)
 * @param {number} length — Longueur de la barre (nombre de segments)
 * @returns {string}
 */
function progressBar(percent, length = 20) {
    const filled = Math.round((percent / 100) * length);
    const empty = length - filled;
    return '█'.repeat(filled) + '░'.repeat(empty);
}

/**
 * Obtenir l'XP maximum autorisé (cap au niveau max)
 * @returns {number}
 */
function maxXp() {
    return xpForLevel(config.maxLevel);
}

module.exports = {
    xpForLevel,
    levelForXp,
    xpToNextLevel,
    progressPercent,
    progressBar,
    maxXp,
};
