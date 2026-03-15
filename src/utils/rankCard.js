/**
 * rankCard.js — Génération d'une rank card image ultra-premium
 * Utilise @napi-rs/canvas pour créer une image haut de gamme
 * Style : fond sombre avec motifs, avatar glow, icône serveur, barre XP dynamique,
 *         badges Level/Rank stylisés, 4 colonnes de stats, indicateur prochain rôle
 */
const { createCanvas, loadImage, GlobalFonts } = require('@napi-rs/canvas');
const path = require('path');
const { AttachmentBuilder } = require('discord.js');
const { xpForLevel, xpToNextLevel, progressPercent } = require('../systems/levels');

// Police universelle avec fallback pour caractères arabes/Tifinagh/spéciaux
// Inclut "Segoe UI Emoji" pour les caractères spéciaux et symboles Unicode
const FONT = '"Segoe UI", "Segoe UI Emoji", "Ebrima", "Tahoma", "Simplified Arabic", "Traditional Arabic", "Arial", sans-serif';

// ═══════════════════════════════════════
//  ENREGISTREMENT DES POLICES SYSTÈME
// ═══════════════════════════════════════
// Charger Segoe UI Emoji pour le rendu des symboles spéciaux sur Windows
try {
    const emojiPath = path.join(process.env.SystemRoot || 'C:\\Windows', 'Fonts', 'seguiemj.ttf');
    GlobalFonts.registerFromPath(emojiPath, 'Segoe UI Emoji');
} catch (e) {
    console.warn('[RankCard] Impossible de charger Segoe UI Emoji:', e.message);
}
try {
    const segoeUIPath = path.join(process.env.SystemRoot || 'C:\\Windows', 'Fonts', 'segoeui.ttf');
    GlobalFonts.registerFromPath(segoeUIPath, 'Segoe UI');
} catch (e) {
    console.warn('[RankCard] Impossible de charger Segoe UI:', e.message);
}
try {
    const ebrimaPath = path.join(process.env.SystemRoot || 'C:\\Windows', 'Fonts', 'ebrima.ttf');
    GlobalFonts.registerFromPath(ebrimaPath, 'Ebrima');
} catch (e) {
    console.warn('[RankCard] Impossible de charger Ebrima:', e.message);
}

// Regex : caractères bien supportés par les polices système Windows
// Latin, Latin Extended, Greek, Cyrillic, Arabic, Arabic Supplement,
// Symboles courants, CJK, Hangul, demi-chasse, Tifinagh (Ebrima)
const SAFE_CHARS = /^[\u0000-\u024F\u0370-\u03FF\u0400-\u04FF\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\u1E00-\u1EFF\u2000-\u27BF\u2C60-\u2C7F\u2D30-\u2D7F\u3000-\u9FFF\uAC00-\uD7AF\uF900-\uFAFF\uFB50-\uFDFF\uFE70-\uFEFF\uFE00-\uFE0F\u200B-\u200F\u2028-\u202F\u2060-\u206F\s\d_.!@#$%^&*()\-+=\[\]{}<>,;:'"\/\\|~`\u{1F000}-\u{1FAFF}]+$/u;

// ═══════════════════════════════════════
//  HELPERS
// ═══════════════════════════════════════

/**
 * Formater un nombre en version compacte (23 000 → 23.0K)
 */
function formatCompact(n) {
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
    if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
    return n.toLocaleString('fr-FR');
}

/**
 * Dessiner un rectangle arrondi
 */
function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
}

/**
 * Dessiner un cercle rempli
 */
function drawCircle(ctx, x, y, radius) {
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.closePath();
}

/**
 * Charger une image avec fallback
 */
async function safeLoadImage(url) {
    try {
        return await loadImage(url);
    } catch {
        return null;
    }
}

/**
 * Obtenir une couleur de gradient basée sur le pourcentage
 */
function getProgressColor(percent) {
    if (percent >= 80) return { start: '#FFD700', end: '#FF6B35' }; // Or → Orange
    if (percent >= 50) return { start: '#00D4AA', end: '#5865F2' }; // Emeraude → Bleu Discord
    if (percent >= 25) return { start: '#5865F2', end: '#9B59B6' }; // Bleu → Violet
    return { start: '#667eea', end: '#764ba2' }; // Lavande → Violet
}

/**
 * Obtenir un nom d'affichage sûr pour le rendu Canvas.
 * Si le displayName contient des caractères non supportés par les polices,
 * on fallback vers globalName puis username (toujours ASCII-safe).
 * @param {object} user — Discord User object
 * @param {number} maxLen — Longueur max
 * @returns {string}
 */
function getSafeName(user, maxLen) {
    // Essayer displayName d'abord
    let name = user.displayName || user.globalName || user.username;
    if (!SAFE_CHARS.test(name)) {
        // Fallback vers globalName
        name = user.globalName || user.username;
        if (!SAFE_CHARS.test(name)) {
            // Dernier fallback : username (toujours safe)
            name = user.username;
        }
    }
    if (name.length > maxLen) return name.substring(0, maxLen) + '…';
    return name;
}

/**
 * Obtenir un nom sûr pour le serveur — filtre les caractères non supportés
 */
function getSafeGuildName(guildName, maxLen) {
    // Garder tous les caractères supportés, remplacer les autres par rien
    let safe = '';
    for (const char of guildName) {
        if (SAFE_CHARS.test(char)) {
            safe += char;
        }
    }
    if (!safe) safe = guildName; // Si tout est filtré, garder l'original
    if (safe.length > maxLen) return safe.substring(0, maxLen) + '…';
    return safe;
}

// ═══════════════════════════════════════
//  MAIN CARD GENERATOR
// ═══════════════════════════════════════

/**
 * Générer la rank card ultra-premium
 * @param {object} options
 * @param {string} options.username — Nom d'affichage
 * @param {string} options.discriminator — Tag utilisateur (ex: @username)
 * @param {string} options.avatarURL — URL de l'avatar utilisateur
 * @param {string|null} options.guildIconURL — URL de l'icône du serveur
 * @param {string} options.guildName — Nom du serveur
 * @param {number} options.level — Niveau actuel
 * @param {number} options.rank — Position dans le leaderboard
 * @param {number} options.xp — XP total
 * @param {number} options.totalMessages — Nombre de messages
 * @param {number} options.totalUsers — Nombre total de membres classés
 * @returns {Promise<Buffer>} — Image PNG en buffer
 */
async function generateRankCard({
    username,
    discriminator,
    avatarURL,
    guildIconURL,
    guildName,
    level,
    rank,
    xp,
    totalMessages,
    totalUsers,
}) {
    const WIDTH = 934;
    const HEIGHT = 380;
    const canvas = createCanvas(WIDTH, HEIGHT);
    const ctx = canvas.getContext('2d');

    const progress = progressPercent(xp, level);
    const nextLevelXp = xpToNextLevel(level);
    const currentLevelXp = xpForLevel(level);
    const progressColors = getProgressColor(progress);

    // ═══════════════════════════════════════
    // 1. FOND — Dégradé sombre premium + motifs
    // ═══════════════════════════════════════
    const bgGrad = ctx.createLinearGradient(0, 0, WIDTH, HEIGHT);
    bgGrad.addColorStop(0, '#0d0d1a');
    bgGrad.addColorStop(0.3, '#1a1a2e');
    bgGrad.addColorStop(0.6, '#16213e');
    bgGrad.addColorStop(1, '#0a1628');
    roundRect(ctx, 0, 0, WIDTH, HEIGHT, 24);
    ctx.fillStyle = bgGrad;
    ctx.fill();

    // Motifs hexagonaux subtils en fond
    ctx.save();
    ctx.globalAlpha = 0.03;
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 1;
    const hexSize = 30;
    for (let row = 0; row < HEIGHT / (hexSize * 1.5) + 1; row++) {
        for (let col = 0; col < WIDTH / (hexSize * Math.sqrt(3)) + 1; col++) {
            const cx = col * hexSize * Math.sqrt(3) + (row % 2 === 1 ? hexSize * Math.sqrt(3) / 2 : 0);
            const cy = row * hexSize * 1.5;
            ctx.beginPath();
            for (let i = 0; i < 6; i++) {
                const angle = (Math.PI / 3) * i - Math.PI / 6;
                const hx = cx + hexSize * Math.cos(angle);
                const hy = cy + hexSize * Math.sin(angle);
                if (i === 0) ctx.moveTo(hx, hy);
                else ctx.lineTo(hx, hy);
            }
            ctx.closePath();
            ctx.stroke();
        }
    }
    ctx.restore();

    // Particules lumineuses aléatoires (seed déterministe pour aspect cohérent)
    ctx.save();
    const particleSeed = (level * 7 + rank * 3 + xp) % 1000;
    for (let i = 0; i < 20; i++) {
        const px = ((particleSeed * (i + 1) * 37) % WIDTH);
        const py = ((particleSeed * (i + 1) * 53) % HEIGHT);
        const size = ((particleSeed * (i + 1) * 17) % 3) + 1;
        ctx.globalAlpha = 0.05 + ((i % 5) * 0.02);
        drawCircle(ctx, px, py, size);
        ctx.fillStyle = i % 2 === 0 ? '#5865F2' : '#00D4AA';
        ctx.fill();
    }
    ctx.restore();

    // Bordure extérieure subtile
    roundRect(ctx, 0, 0, WIDTH, HEIGHT, 24);
    const borderGrad = ctx.createLinearGradient(0, 0, WIDTH, HEIGHT);
    borderGrad.addColorStop(0, 'rgba(88, 101, 242, 0.3)');
    borderGrad.addColorStop(0.5, 'rgba(0, 212, 170, 0.2)');
    borderGrad.addColorStop(1, 'rgba(88, 101, 242, 0.3)');
    ctx.strokeStyle = borderGrad;
    ctx.lineWidth = 2;
    ctx.stroke();

    // Ligne séparatrice horizontale décorative
    ctx.save();
    const lineGrad = ctx.createLinearGradient(30, 0, WIDTH - 30, 0);
    lineGrad.addColorStop(0, 'rgba(88, 101, 242, 0)');
    lineGrad.addColorStop(0.2, 'rgba(88, 101, 242, 0.2)');
    lineGrad.addColorStop(0.5, 'rgba(0, 212, 170, 0.3)');
    lineGrad.addColorStop(0.8, 'rgba(88, 101, 242, 0.2)');
    lineGrad.addColorStop(1, 'rgba(88, 101, 242, 0)');
    ctx.strokeStyle = lineGrad;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(30, 180);
    ctx.lineTo(WIDTH - 30, 180);
    ctx.stroke();
    ctx.restore();

    // ═══════════════════════════════════════
    // 2. ICÔNE DU SERVEUR + NOM (coin haut droit)
    // ═══════════════════════════════════════
    const guildIconSize = 36;
    const guildPadding = 25;
    const guildIconX = WIDTH - guildPadding - guildIconSize;
    const guildIconY = guildPadding;

    // Nom du serveur (à gauche de l'icône)
    ctx.save();
    ctx.textAlign = 'right';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.font = `13px ${FONT}`;
    const truncatedGuildName = guildName.length > 25 ? guildName.substring(0, 25) + '…' : guildName;
    ctx.fillText(truncatedGuildName, guildIconX - 10, guildIconY + guildIconSize / 2 + 5);
    ctx.textAlign = 'left';
    ctx.restore();

    // Icône serveur circulaire
    if (guildIconURL) {
        const guildIcon = await safeLoadImage(guildIconURL);
        if (guildIcon) {
            ctx.save();
            drawCircle(ctx, guildIconX + guildIconSize / 2, guildIconY + guildIconSize / 2, guildIconSize / 2 + 2);
            ctx.fillStyle = 'rgba(88, 101, 242, 0.4)';
            ctx.fill();
            drawCircle(ctx, guildIconX + guildIconSize / 2, guildIconY + guildIconSize / 2, guildIconSize / 2);
            ctx.clip();
            ctx.drawImage(guildIcon, guildIconX, guildIconY, guildIconSize, guildIconSize);
            ctx.restore();
        }
    }

    // ═══════════════════════════════════════
    // 3. AVATAR — Cercle avec glow + bordure gradient
    // ═══════════════════════════════════════
    const avatarSize = 140;
    const avatarX = 45;
    const avatarY = 25;
    const avatarCenterX = avatarX + avatarSize / 2;
    const avatarCenterY = avatarY + avatarSize / 2;

    // Glow derrière l'avatar (halo lumineux)
    ctx.save();
    const glowGrad = ctx.createRadialGradient(avatarCenterX, avatarCenterY, avatarSize / 2, avatarCenterX, avatarCenterY, avatarSize / 2 + 25);
    glowGrad.addColorStop(0, 'rgba(88, 101, 242, 0.25)');
    glowGrad.addColorStop(0.5, 'rgba(0, 212, 170, 0.12)');
    glowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    drawCircle(ctx, avatarCenterX, avatarCenterY, avatarSize / 2 + 25);
    ctx.fillStyle = glowGrad;
    ctx.fill();
    ctx.restore();

    // Bordure gradient de l'avatar
    drawCircle(ctx, avatarCenterX, avatarCenterY, avatarSize / 2 + 5);
    const avatarBorderGrad = ctx.createLinearGradient(avatarX, avatarY, avatarX + avatarSize, avatarY + avatarSize);
    avatarBorderGrad.addColorStop(0, progressColors.start);
    avatarBorderGrad.addColorStop(1, progressColors.end);
    ctx.fillStyle = avatarBorderGrad;
    ctx.fill();

    // Fond sombre entre bordure et avatar
    drawCircle(ctx, avatarCenterX, avatarCenterY, avatarSize / 2 + 2);
    ctx.fillStyle = '#0d0d1a';
    ctx.fill();

    // Avatar clippé circulaire
    ctx.save();
    drawCircle(ctx, avatarCenterX, avatarCenterY, avatarSize / 2);
    ctx.clip();
    const avatar = await safeLoadImage(avatarURL);
    if (avatar) {
        ctx.drawImage(avatar, avatarX, avatarY, avatarSize, avatarSize);
    } else {
        ctx.fillStyle = '#2B2D31';
        ctx.fillRect(avatarX, avatarY, avatarSize, avatarSize);
        ctx.fillStyle = '#5865F2';
        ctx.font = `bold 48px ${FONT}`;
        ctx.textAlign = 'center';
        ctx.fillText(username.charAt(0).toUpperCase(), avatarCenterX, avatarCenterY + 16);
        ctx.textAlign = 'left';
    }
    ctx.restore();

    // Petit badge circulaire en bas à droite de l'avatar (indicateur en ligne)
    drawCircle(ctx, avatarCenterX + avatarSize / 2 - 8, avatarCenterY + avatarSize / 2 - 8, 12);
    ctx.fillStyle = '#0d0d1a';
    ctx.fill();
    drawCircle(ctx, avatarCenterX + avatarSize / 2 - 8, avatarCenterY + avatarSize / 2 - 8, 8);
    ctx.fillStyle = '#43B581'; // Vert " en ligne "
    ctx.fill();

    // ═══════════════════════════════════════
    // 4. USERNAME + TAG
    // ═══════════════════════════════════════
    const textX = avatarX + avatarSize + 30;
    const textStartY = avatarY + 22;

    // Username
    ctx.fillStyle = '#FFFFFF';
    ctx.font = `bold 30px ${FONT}`;
    const displayName = username.length > 20 ? username.substring(0, 20) + '…' : username;
    ctx.fillText(displayName, textX, textStartY + 10);

    // @tag en gris
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.font = `15px ${FONT}`;
    ctx.fillText(`@${discriminator}`, textX, textStartY + 34);

    // ═══════════════════════════════════════
    // 5. BADGES LEVEL & RANK (à droite du nom)
    // ═══════════════════════════════════════
    const badgeY = textStartY - 5;

    // Badge Level
    const levelText = `LVL ${level}`;
    ctx.font = `bold 14px ${FONT}`;
    const levelBadgeWidth = ctx.measureText(levelText).width + 20;
    const levelBadgeX = WIDTH - 50 - levelBadgeWidth - 90;

    roundRect(ctx, levelBadgeX, badgeY, levelBadgeWidth, 28, 14);
    const lvlGrad = ctx.createLinearGradient(levelBadgeX, badgeY, levelBadgeX + levelBadgeWidth, badgeY);
    lvlGrad.addColorStop(0, progressColors.start);
    lvlGrad.addColorStop(1, progressColors.end);
    ctx.fillStyle = lvlGrad;
    ctx.fill();

    ctx.fillStyle = '#FFFFFF';
    ctx.font = `bold 14px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.fillText(levelText, levelBadgeX + levelBadgeWidth / 2, badgeY + 19);

    // Badge Rank
    const rankText = `#${rank}`;
    const rankBadgeWidth = ctx.measureText(rankText).width + 20;
    const rankBadgeX = levelBadgeX + levelBadgeWidth + 10;

    roundRect(ctx, rankBadgeX, badgeY, rankBadgeWidth, 28, 14);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.fill();
    roundRect(ctx, rankBadgeX, badgeY, rankBadgeWidth, 28, 14);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = '#FFFFFF';
    ctx.font = `bold 14px ${FONT}`;
    ctx.fillText(rankText, rankBadgeX + rankBadgeWidth / 2, badgeY + 19);
    ctx.textAlign = 'left';

    // ═══════════════════════════════════════
    // 6. XP DÉTAILLÉ (sous le nom)
    // ═══════════════════════════════════════
    const xpInfoY = textStartY + 55;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.font = `14px ${FONT}`;
    const xpInLevel = xp - currentLevelXp;
    const xpNeeded = nextLevelXp - currentLevelXp;

    ctx.fillText(`${xpInLevel.toLocaleString('fr-FR')} / ${xpNeeded.toLocaleString('fr-FR')} XP`, textX, xpInfoY);

    // Pourcentage à droite
    ctx.textAlign = 'right';
    ctx.fillStyle = progressColors.start;
    ctx.font = `bold 14px ${FONT}`;
    ctx.fillText(`${progress}%`, WIDTH - 50, xpInfoY);
    ctx.textAlign = 'left';

    // ═══════════════════════════════════════
    // 7. BARRE DE PROGRESSION XP
    // ═══════════════════════════════════════
    const barX = textX;
    const barY = xpInfoY + 12;
    const barW = WIDTH - textX - 50;
    const barH = 22;
    const barR = 11;

    // Fond de la barre
    roundRect(ctx, barX, barY, barW, barH, barR);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.fill();

    // Remplissage avec gradient dynamique (couleur basée sur le progression)
    const fillW = Math.max(barR * 2, (progress / 100) * barW);
    roundRect(ctx, barX, barY, fillW, barH, barR);
    const barGrad = ctx.createLinearGradient(barX, barY, barX + barW, barY);
    barGrad.addColorStop(0, progressColors.start);
    barGrad.addColorStop(1, progressColors.end);
    ctx.fillStyle = barGrad;
    ctx.fill();

    // Effet brillant sur la barre (reflet)
    ctx.save();
    roundRect(ctx, barX, barY, fillW, barH / 2, barR);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.fill();
    ctx.restore();

    // ═══════════════════════════════════════
    // 8. STATS — 4 colonnes élégantes
    // ═══════════════════════════════════════
    const statsY = 210;
    const statsBoxH = 120;
    const statsBoxPadding = 25;
    const statBoxWidth = (WIDTH - statsBoxPadding * 2 - 30) / 4;

    // Fond des stats (carte sombre intérieure)
    roundRect(ctx, statsBoxPadding, statsY, WIDTH - statsBoxPadding * 2, statsBoxH, 16);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
    ctx.fill();
    roundRect(ctx, statsBoxPadding, statsY, WIDTH - statsBoxPadding * 2, statsBoxH, 16);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    ctx.stroke();

    const stats = [
        { icon: '#', label: 'RANK', value: `#${rank}`, sub: `/ ${totalUsers || '?'}` },
        { icon: '*', label: 'LEVEL', value: `${level}`, sub: `/ 80` },
        { icon: '>', label: 'MESSAGES', value: formatCompact(totalMessages), sub: 'total' },
        { icon: '+', label: 'TOTAL XP', value: formatCompact(xp), sub: `${formatCompact(nextLevelXp)} next` },
    ];

    ctx.textAlign = 'center';

    for (let i = 0; i < 4; i++) {
        const colCenterX = statsBoxPadding + 15 + statBoxWidth * i + statBoxWidth / 2;
        const stat = stats[i];

        // Séparateur vertical (sauf premier)
        if (i > 0) {
            ctx.save();
            const sepX = statsBoxPadding + 15 + statBoxWidth * i;
            const sepGrad = ctx.createLinearGradient(sepX, statsY + 15, sepX, statsY + statsBoxH - 15);
            sepGrad.addColorStop(0, 'rgba(255, 255, 255, 0)');
            sepGrad.addColorStop(0.5, 'rgba(255, 255, 255, 0.1)');
            sepGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
            ctx.strokeStyle = sepGrad;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(sepX, statsY + 15);
            ctx.lineTo(sepX, statsY + statsBoxH - 15);
            ctx.stroke();
            ctx.restore();
        }

        // Label
        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.font = `bold 11px ${FONT}`;
        ctx.fillText(stat.label, colCenterX, statsY + 30);

        // Valeur principale
        ctx.fillStyle = '#FFFFFF';
        ctx.font = `bold 28px ${FONT}`;
        ctx.fillText(stat.value, colCenterX, statsY + 68);

        // Sous-valeur
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.font = `12px ${FONT}`;
        ctx.fillText(stat.sub, colCenterX, statsY + 90);
    }

    ctx.textAlign = 'left';

    // ═══════════════════════════════════════
    // 9. FOOTER — Informations supplémentaires
    // ═══════════════════════════════════════
    const footerY = statsY + statsBoxH + 18;

    // Progress bar mini dans le footer (niveau prochain)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.font = `12px ${FONT}`;
    ctx.fillText(`Niveau suivant: ${(level + 1 <= 80) ? level + 1 : 'MAX'}`, statsBoxPadding + 10, footerY + 4);

    // XP restant à droite
    ctx.textAlign = 'right';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.font = `12px ${FONT}`;
    const remaining = Math.max(0, nextLevelXp - xp);
    ctx.fillText(
        remaining > 0 ? `${remaining.toLocaleString('fr-FR')} XP restants` : 'Niveau MAX atteint !',
        WIDTH - statsBoxPadding - 10,
        footerY + 4
    );
    ctx.textAlign = 'left';

    // ═══════════════════════════════════════
    // EXPORT
    // ═══════════════════════════════════════
    return canvas.toBuffer('image/png');
}

// ═══════════════════════════════════════
//  LEADERBOARD CARD GENERATOR — ULTRA PREMIUM
// ═══════════════════════════════════════

// Couleurs pour le podium top 3
const PODIUM_THEMES = [
    { // #1 — OR
        border: ['#FFD700', '#FFA500'],
        glow: 'rgba(255, 215, 0, 0.30)',
        glowOuter: 'rgba(255, 215, 0, 0.08)',
        nameColor: '#FFD700',
        bg: 'rgba(255, 215, 0, 0.08)',
        bgBorder: 'rgba(255, 215, 0, 0.25)',
        avatarSize: 68,
        label: '👑',
    },
    { // #2 — ARGENT
        border: ['#C0C0C0', '#8A8A8A'],
        glow: 'rgba(192, 192, 192, 0.22)',
        glowOuter: 'rgba(192, 192, 192, 0.06)',
        nameColor: '#E0E0E0',
        bg: 'rgba(192, 192, 192, 0.06)',
        bgBorder: 'rgba(192, 192, 192, 0.18)',
        avatarSize: 60,
        label: '🥈',
    },
    { // #3 — BRONZE
        border: ['#CD7F32', '#8B4513'],
        glow: 'rgba(205, 127, 50, 0.20)',
        glowOuter: 'rgba(205, 127, 50, 0.05)',
        nameColor: '#E8A94E',
        bg: 'rgba(205, 127, 50, 0.05)',
        bgBorder: 'rgba(205, 127, 50, 0.15)',
        avatarSize: 54,
        label: '🥉',
    },
];

/**
 * Obtenir une couleur de barre pour les entrées leaderboard
 */
function getLeaderboardBarColor(percent) {
    if (percent >= 75) return { start: '#FFD700', end: '#FF6B35' };
    if (percent >= 50) return { start: '#00D4AA', end: '#00B4D8' };
    if (percent >= 25) return { start: '#5865F2', end: '#7B68EE' };
    return { start: '#667eea', end: '#764ba2' };
}

/**
 * Générer une image leaderboard ultra-premium
 * @param {object[]} entries — Top utilisateurs (avec user_id, xp, level, total_messages)
 * @param {object} guild — L'objet guild Discord
 * @param {Map<string, object>} userMap — Map des user_id → objets User Discord
 * @returns {Promise<Buffer>} — Image PNG
 */
async function generateLeaderboardCard(entries, guild, userMap) {
    const WIDTH = 950;
    const PADDING = 30;
    const HEADER_H = 100;
    const PODIUM_H = 160;
    const ENTRY_H = 62;
    const FOOTER_H = 55;

    const podiumCount = Math.min(3, entries.length);
    const restEntries = entries.slice(podiumCount);

    const HEIGHT = HEADER_H + (podiumCount > 0 ? PODIUM_H : 0) + 20 + restEntries.length * ENTRY_H + FOOTER_H + 30;
    const canvas = createCanvas(WIDTH, HEIGHT);
    const ctx = canvas.getContext('2d');

    // ═══════════════════════════════════════
    // 1. FOND — Gradient profond + motifs géométriques
    // ═══════════════════════════════════════
    const bgGrad = ctx.createLinearGradient(0, 0, WIDTH, HEIGHT);
    bgGrad.addColorStop(0, '#080818');
    bgGrad.addColorStop(0.25, '#0f0f2a');
    bgGrad.addColorStop(0.5, '#141434');
    bgGrad.addColorStop(0.75, '#0c1629');
    bgGrad.addColorStop(1, '#06091a');
    roundRect(ctx, 0, 0, WIDTH, HEIGHT, 24);
    ctx.fillStyle = bgGrad;
    ctx.fill();

    // Motifs diamant subtils en arrière-plan
    ctx.save();
    ctx.globalAlpha = 0.025;
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 0.5;
    const diamondSize = 40;
    for (let row = -1; row < HEIGHT / diamondSize + 1; row++) {
        for (let col = -1; col < WIDTH / diamondSize + 1; col++) {
            const cx = col * diamondSize * 1.5 + (row % 2 === 1 ? diamondSize * 0.75 : 0);
            const cy = row * diamondSize;
            ctx.beginPath();
            ctx.moveTo(cx, cy - diamondSize / 2);
            ctx.lineTo(cx + diamondSize / 2, cy);
            ctx.lineTo(cx, cy + diamondSize / 2);
            ctx.lineTo(cx - diamondSize / 2, cy);
            ctx.closePath();
            ctx.stroke();
        }
    }
    ctx.restore();

    // Particules lumineuses flottantes
    ctx.save();
    for (let i = 0; i < 35; i++) {
        const px = ((i * 137 + 29) % WIDTH);
        const py = ((i * 89 + 17) % HEIGHT);
        const size = ((i * 23) % 3) + 1;
        ctx.globalAlpha = 0.03 + ((i % 7) * 0.015);
        drawCircle(ctx, px, py, size);
        const colors = ['#5865F2', '#00D4AA', '#FFD700', '#FF6B9D'];
        ctx.fillStyle = colors[i % colors.length];
        ctx.fill();
    }
    ctx.restore();

    // Lueur ambiante en haut (derrière le header)
    ctx.save();
    const ambientGlow = ctx.createRadialGradient(WIDTH / 2, 0, 50, WIDTH / 2, 0, 400);
    ambientGlow.addColorStop(0, 'rgba(88, 101, 242, 0.12)');
    ambientGlow.addColorStop(0.5, 'rgba(0, 212, 170, 0.05)');
    ambientGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = ambientGlow;
    ctx.fillRect(0, 0, WIDTH, 250);
    ctx.restore();

    // Bordure extérieure gradient premium
    roundRect(ctx, 0, 0, WIDTH, HEIGHT, 24);
    const borderGrad = ctx.createLinearGradient(0, 0, WIDTH, HEIGHT);
    borderGrad.addColorStop(0, 'rgba(255, 215, 0, 0.35)');
    borderGrad.addColorStop(0.25, 'rgba(88, 101, 242, 0.25)');
    borderGrad.addColorStop(0.5, 'rgba(0, 212, 170, 0.30)');
    borderGrad.addColorStop(0.75, 'rgba(88, 101, 242, 0.25)');
    borderGrad.addColorStop(1, 'rgba(255, 215, 0, 0.35)');
    ctx.strokeStyle = borderGrad;
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Bordure intérieure subtile
    roundRect(ctx, 3, 3, WIDTH - 6, HEIGHT - 6, 22);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // ═══════════════════════════════════════
    // 2. HEADER — Bannière premium
    // ═══════════════════════════════════════

    // Fond header avec gradient distinct
    roundRect(ctx, PADDING - 5, 15, WIDTH - (PADDING - 5) * 2, HEADER_H - 25, 16);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.fill();
    roundRect(ctx, PADDING - 5, 15, WIDTH - (PADDING - 5) * 2, HEADER_H - 25, 16);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Icône du serveur (grande, avec glow)
    const guildIconSize = 52;
    const guildIcon = await safeLoadImage(guild.iconURL({ extension: 'png', size: 128 }));
    if (guildIcon) {
        // Glow derrière l'icône
        ctx.save();
        const iconGlow = ctx.createRadialGradient(PADDING + 22 + guildIconSize / 2, 15 + (HEADER_H - 25) / 2, guildIconSize / 2 - 5, PADDING + 22 + guildIconSize / 2, 15 + (HEADER_H - 25) / 2, guildIconSize / 2 + 15);
        iconGlow.addColorStop(0, 'rgba(88, 101, 242, 0.2)');
        iconGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
        drawCircle(ctx, PADDING + 22 + guildIconSize / 2, 15 + (HEADER_H - 25) / 2, guildIconSize / 2 + 15);
        ctx.fillStyle = iconGlow;
        ctx.fill();
        ctx.restore();

        // Bordure de l'icône
        drawCircle(ctx, PADDING + 22 + guildIconSize / 2, 15 + (HEADER_H - 25) / 2, guildIconSize / 2 + 3);
        const iconBorderGrad = ctx.createLinearGradient(PADDING + 22, 15, PADDING + 22 + guildIconSize, 15 + guildIconSize);
        iconBorderGrad.addColorStop(0, '#5865F2');
        iconBorderGrad.addColorStop(1, '#00D4AA');
        ctx.fillStyle = iconBorderGrad;
        ctx.fill();

        // Fond sombre sous l'icône
        drawCircle(ctx, PADDING + 22 + guildIconSize / 2, 15 + (HEADER_H - 25) / 2, guildIconSize / 2 + 1);
        ctx.fillStyle = '#0d0d1a';
        ctx.fill();

        // Icône clippée
        ctx.save();
        drawCircle(ctx, PADDING + 22 + guildIconSize / 2, 15 + (HEADER_H - 25) / 2, guildIconSize / 2);
        ctx.clip();
        ctx.drawImage(guildIcon, PADDING + 22, 15 + (HEADER_H - 25) / 2 - guildIconSize / 2, guildIconSize, guildIconSize);
        ctx.restore();
    }

    // Titre "LEADERBOARD" avec icône trophée
    const titleX = guildIcon ? PADDING + 22 + guildIconSize + 18 : PADDING + 20;
    const titleCenterY = 15 + (HEADER_H - 25) / 2;

    ctx.fillStyle = '#FFFFFF';
    ctx.font = `bold 26px ${FONT}`;
    ctx.fillText('LEADERBOARD', titleX, titleCenterY + 2);

    // Nom du serveur sous le titre
    ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
    ctx.font = `13px ${FONT}`;
    const truncName = getSafeGuildName(guild.name, 35);
    ctx.fillText(truncName, titleX, titleCenterY + 22);

    // Compteur de membres (droite)
    ctx.textAlign = 'right';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.font = `13px ${FONT}`;
    ctx.fillText(`${entries.length} joueurs classés`, WIDTH - PADDING - 10, titleCenterY + 2);

    // Date (droite, sous le compteur)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.font = `11px ${FONT}`;
    const now = new Date();
    ctx.fillText(now.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }), WIDTH - PADDING - 10, titleCenterY + 20);
    ctx.textAlign = 'left';

    // Ligne séparatrice sous le header
    ctx.save();
    const hLineGrad = ctx.createLinearGradient(PADDING, 0, WIDTH - PADDING, 0);
    hLineGrad.addColorStop(0, 'rgba(255, 215, 0, 0)');
    hLineGrad.addColorStop(0.15, 'rgba(255, 215, 0, 0.15)');
    hLineGrad.addColorStop(0.35, 'rgba(88, 101, 242, 0.3)');
    hLineGrad.addColorStop(0.5, 'rgba(0, 212, 170, 0.4)');
    hLineGrad.addColorStop(0.65, 'rgba(88, 101, 242, 0.3)');
    hLineGrad.addColorStop(0.85, 'rgba(255, 215, 0, 0.15)');
    hLineGrad.addColorStop(1, 'rgba(255, 215, 0, 0)');
    ctx.strokeStyle = hLineGrad;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(PADDING, HEADER_H - 2);
    ctx.lineTo(WIDTH - PADDING, HEADER_H - 2);
    ctx.stroke();
    ctx.restore();

    // ═══════════════════════════════════════
    // 3. PODIUM — Top 3 avec grands avatars et glow
    // ═══════════════════════════════════════
    if (podiumCount > 0) {
        const podiumY = HEADER_H + 10;
        const podiumCardW = (WIDTH - PADDING * 2 - 20) / Math.max(podiumCount, 1);

        for (let i = 0; i < podiumCount; i++) {
            const entry = entries[i];
            const theme = PODIUM_THEMES[i];
            const user = userMap.get(entry.user_id);
            const cardX = PADDING + 10 + i * podiumCardW;
            const cardW = podiumCardW - 10;
            const cardH = PODIUM_H - 10;

            // Fond de la carte podium
            roundRect(ctx, cardX, podiumY, cardW, cardH, 14);
            ctx.fillStyle = theme.bg;
            ctx.fill();
            roundRect(ctx, cardX, podiumY, cardW, cardH, 14);
            ctx.strokeStyle = theme.bgBorder;
            ctx.lineWidth = 1.5;
            ctx.stroke();

            const centerX = cardX + cardW / 2;
            const avatarSize = theme.avatarSize;
            const avatarCY = podiumY + 12 + avatarSize / 2;

            // Glow radial derrière l'avatar
            ctx.save();
            const glow = ctx.createRadialGradient(centerX, avatarCY, avatarSize / 3, centerX, avatarCY, avatarSize / 2 + 20);
            glow.addColorStop(0, theme.glow);
            glow.addColorStop(0.7, theme.glowOuter);
            glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
            drawCircle(ctx, centerX, avatarCY, avatarSize / 2 + 20);
            ctx.fillStyle = glow;
            ctx.fill();
            ctx.restore();

            // Bordure avatar gradient
            drawCircle(ctx, centerX, avatarCY, avatarSize / 2 + 4);
            const avBorderGrad = ctx.createLinearGradient(centerX - avatarSize / 2, avatarCY - avatarSize / 2, centerX + avatarSize / 2, avatarCY + avatarSize / 2);
            avBorderGrad.addColorStop(0, theme.border[0]);
            avBorderGrad.addColorStop(1, theme.border[1]);
            ctx.fillStyle = avBorderGrad;
            ctx.fill();

            // Fond sombre
            drawCircle(ctx, centerX, avatarCY, avatarSize / 2 + 1.5);
            ctx.fillStyle = '#0a0a1a';
            ctx.fill();

            // Avatar
            if (user) {
                const avImg = await safeLoadImage(user.displayAvatarURL({ extension: 'png', size: 128 }));
                if (avImg) {
                    ctx.save();
                    drawCircle(ctx, centerX, avatarCY, avatarSize / 2);
                    ctx.clip();
                    ctx.drawImage(avImg, centerX - avatarSize / 2, avatarCY - avatarSize / 2, avatarSize, avatarSize);
                    ctx.restore();
                } else {
                    drawCircle(ctx, centerX, avatarCY, avatarSize / 2);
                    ctx.fillStyle = '#2B2D31';
                    ctx.fill();
                    ctx.fillStyle = theme.nameColor;
                    ctx.font = `bold ${Math.round(avatarSize * 0.45)}px ${FONT}`;
                    ctx.textAlign = 'center';
                    ctx.fillText((user.displayName || '?').charAt(0).toUpperCase(), centerX, avatarCY + avatarSize * 0.15);
                    ctx.textAlign = 'left';
                }
            }

            // Label rang (couronne ou médaille) + numéro
            ctx.textAlign = 'center';
            ctx.font = `bold ${i === 0 ? '14' : '12'}px ${FONT}`;
            ctx.fillText(`#${i + 1}`, centerX, avatarCY - avatarSize / 2 - 6);

            // Numéro du rang (#1, #2, #3) en haut à droite de la carte
            ctx.save();
            const rankNumX = cardX + cardW - 14;
            const rankNumY = podiumY + 14;
            const rankNumW = 32;
            const rankNumH = 22;
            roundRect(ctx, rankNumX - rankNumW, rankNumY, rankNumW, rankNumH, 8);
            const rnGrad = ctx.createLinearGradient(rankNumX - rankNumW, rankNumY, rankNumX, rankNumY);
            rnGrad.addColorStop(0, theme.border[0]);
            rnGrad.addColorStop(1, theme.border[1]);
            ctx.fillStyle = rnGrad;
            ctx.fill();
            ctx.fillStyle = '#FFFFFF';
            ctx.font = `bold 13px ${FONT}`;
            ctx.fillText(`#${i + 1}`, rankNumX - rankNumW / 2, rankNumY + 16);
            ctx.restore();

            // Nom
            const displayName = user ? getSafeName(user, 14) : `User ${entry.user_id.slice(-4)}`;
            ctx.textAlign = 'center';
            ctx.fillStyle = theme.nameColor;
            ctx.font = `bold 15px ${FONT}`;
            ctx.fillText(displayName, centerX, avatarCY + avatarSize / 2 + 22);

            // Level
            ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
            ctx.font = `12px ${FONT}`;
            ctx.fillText(`LVL ${entry.level}`, centerX, avatarCY + avatarSize / 2 + 40);

            // XP
            ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
            ctx.font = `11px ${FONT}`;
            ctx.fillText(`${formatCompact(entry.xp)} XP`, centerX, avatarCY + avatarSize / 2 + 56);

            // Mini barre sous le nom
            const miniBarW = cardW * 0.6;
            const miniBarH = 5;
            const miniBarX = centerX - miniBarW / 2;
            const miniBarY = avatarCY + avatarSize / 2 + 62;
            const entryProgress = progressPercent(entry.xp, entry.level);

            roundRect(ctx, miniBarX, miniBarY, miniBarW, miniBarH, 2.5);
            ctx.fillStyle = 'rgba(255, 255, 255, 0.06)';
            ctx.fill();

            const miniFillW = Math.max(4, (entryProgress / 100) * miniBarW);
            roundRect(ctx, miniBarX, miniBarY, miniFillW, miniBarH, 2.5);
            const miniGrad = ctx.createLinearGradient(miniBarX, miniBarY, miniBarX + miniBarW, miniBarY);
            miniGrad.addColorStop(0, theme.border[0]);
            miniGrad.addColorStop(1, theme.border[1]);
            ctx.fillStyle = miniGrad;
            ctx.fill();

            ctx.textAlign = 'left';
        }

        // Ligne séparatrice après le podium
        ctx.save();
        const podSepGrad = ctx.createLinearGradient(PADDING + 30, 0, WIDTH - PADDING - 30, 0);
        podSepGrad.addColorStop(0, 'rgba(88, 101, 242, 0)');
        podSepGrad.addColorStop(0.3, 'rgba(88, 101, 242, 0.15)');
        podSepGrad.addColorStop(0.5, 'rgba(0, 212, 170, 0.2)');
        podSepGrad.addColorStop(0.7, 'rgba(88, 101, 242, 0.15)');
        podSepGrad.addColorStop(1, 'rgba(88, 101, 242, 0)');
        ctx.strokeStyle = podSepGrad;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(PADDING + 30, HEADER_H + PODIUM_H + 8);
        ctx.lineTo(WIDTH - PADDING - 30, HEADER_H + PODIUM_H + 8);
        ctx.stroke();
        ctx.restore();
    }

    // ═══════════════════════════════════════
    // 4. ENTRÉES 4-10 — Cartes stylisées
    // ═══════════════════════════════════════
    const listStartY = HEADER_H + (podiumCount > 0 ? PODIUM_H + 20 : 10);

    for (let i = 0; i < restEntries.length; i++) {
        const entry = restEntries[i];
        const globalRank = podiumCount + i + 1;
        const user = userMap.get(entry.user_id);
        const y = listStartY + i * ENTRY_H;
        const cardX = PADDING;
        const cardW = WIDTH - PADDING * 2;
        const cardH = ENTRY_H - 8;

        // Fond carte avec alternance subtile
        roundRect(ctx, cardX, y, cardW, cardH, 10);
        ctx.fillStyle = i % 2 === 0 ? 'rgba(255, 255, 255, 0.025)' : 'rgba(0, 0, 0, 0.12)';
        ctx.fill();

        // Bordure très subtile
        roundRect(ctx, cardX, y, cardW, cardH, 10);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
        ctx.lineWidth = 0.5;
        ctx.stroke();

        // Badge numérique du rang
        const badgeX = cardX + 15;
        const badgeY = y + cardH / 2;
        const badgeSize = 28;

        roundRect(ctx, badgeX, badgeY - badgeSize / 2, badgeSize, badgeSize, 8);
        ctx.fillStyle = 'rgba(88, 101, 242, 0.15)';
        ctx.fill();
        roundRect(ctx, badgeX, badgeY - badgeSize / 2, badgeSize, badgeSize, 8);
        ctx.strokeStyle = 'rgba(88, 101, 242, 0.3)';
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.font = `bold 14px ${FONT}`;
        ctx.textAlign = 'center';
        ctx.fillText(`${globalRank}`, badgeX + badgeSize / 2, badgeY + 5);
        ctx.textAlign = 'left';

        // Avatar circulaire 40px
        const avX = badgeX + badgeSize + 14;
        const avCX = avX + 20;
        const avCY = y + cardH / 2;
        const avRadius = 20;

        if (user) {
            // Bordure avatar
            drawCircle(ctx, avCX, avCY, avRadius + 2);
            ctx.fillStyle = 'rgba(88, 101, 242, 0.3)';
            ctx.fill();

            const avImg = await safeLoadImage(user.displayAvatarURL({ extension: 'png', size: 64 }));
            if (avImg) {
                ctx.save();
                drawCircle(ctx, avCX, avCY, avRadius);
                ctx.clip();
                ctx.drawImage(avImg, avCX - avRadius, avCY - avRadius, avRadius * 2, avRadius * 2);
                ctx.restore();
            }
        }

        // Nom
        const nameX = avX + avRadius * 2 + 14;
        ctx.fillStyle = '#FFFFFF';
        ctx.font = `bold 15px ${FONT}`;
        const name = user ? getSafeName(user, 20) : `User ${entry.user_id.slice(-4)}`;
        ctx.fillText(name, nameX, y + cardH / 2 - 6);

        // Level sous le nom
        ctx.fillStyle = '#00D4AA';
        ctx.font = `bold 12px ${FONT}`;
        ctx.fillText(`Level ${entry.level}`, nameX, y + cardH / 2 + 12);

        // XP (à droite de la barre)
        const rightEdge = cardX + cardW - 15;

        // Barre de progression large
        const entryProgress = progressPercent(entry.xp, entry.level);
        const barW = 200;
        const barH = 12;
        const barX = rightEdge - barW;
        const barY = y + cardH / 2 - barH / 2;
        const barColors = getLeaderboardBarColor(entryProgress);

        // Fond barre
        roundRect(ctx, barX, barY, barW, barH, 6);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.06)';
        ctx.fill();

        // Remplissage gradient
        const fillW = Math.max(8, (entryProgress / 100) * barW);
        roundRect(ctx, barX, barY, fillW, barH, 6);
        const barGrad = ctx.createLinearGradient(barX, barY, barX + barW, barY);
        barGrad.addColorStop(0, barColors.start);
        barGrad.addColorStop(1, barColors.end);
        ctx.fillStyle = barGrad;
        ctx.fill();

        // Reflet brillant sur la barre
        ctx.save();
        roundRect(ctx, barX, barY, fillW, barH / 2, 6);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
        ctx.fill();
        ctx.restore();

        // Pourcentage à droite de la barre
        ctx.textAlign = 'right';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.font = `11px ${FONT}`;
        ctx.fillText(`${entryProgress}%`, barX - 8, y + cardH / 2 + 4);

        // XP total au-dessus de la barre
        ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
        ctx.font = `11px ${FONT}`;
        ctx.fillText(`${entry.xp.toLocaleString('fr-FR')} XP`, rightEdge, barY - 4);
        ctx.textAlign = 'left';
    }

    // ═══════════════════════════════════════
    // 5. FOOTER — Élégant avec séparateur
    // ═══════════════════════════════════════
    const footerY = HEIGHT - FOOTER_H;

    // Ligne séparatrice footer
    ctx.save();
    const fLineGrad = ctx.createLinearGradient(PADDING + 20, 0, WIDTH - PADDING - 20, 0);
    fLineGrad.addColorStop(0, 'rgba(0, 212, 170, 0)');
    fLineGrad.addColorStop(0.3, 'rgba(88, 101, 242, 0.15)');
    fLineGrad.addColorStop(0.5, 'rgba(0, 212, 170, 0.25)');
    fLineGrad.addColorStop(0.7, 'rgba(88, 101, 242, 0.15)');
    fLineGrad.addColorStop(1, 'rgba(0, 212, 170, 0)');
    ctx.strokeStyle = fLineGrad;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(PADDING + 20, footerY + 5);
    ctx.lineTo(WIDTH - PADDING - 20, footerY + 5);
    ctx.stroke();
    ctx.restore();

    // Texte footer
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.font = `13px ${FONT}`;
    ctx.fillText(`Top ${entries.length} membres - Tapez rr pour voir votre progression`, WIDTH / 2, footerY + 28);

    // Petite ligne de copyright/serveur
    ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.font = `10px ${FONT}`;
    ctx.fillText(`${getSafeGuildName(guild.name, 40)} — Leveling System`, WIDTH / 2, footerY + 46);
    ctx.textAlign = 'left';

    return canvas.toBuffer('image/png');
}

/**
 * Générer la rank card et la convertir en AttachmentBuilder Discord
 * @param {import('discord.js').User} user
 * @param {object} data — { xp, level, total_messages }
 * @param {number} rank
 * @param {import('discord.js').Guild} guild — Objet guild Discord
 * @param {number} totalUsers — Nombre total d'utilisateurs classés
 * @returns {Promise<AttachmentBuilder>}
 */
async function createRankCardAttachment(user, data, rank, guild, totalUsers) {
    const buffer = await generateRankCard({
        username: user.displayName,
        discriminator: user.username,
        avatarURL: user.displayAvatarURL({ extension: 'png', size: 256 }),
        guildIconURL: guild ? guild.iconURL({ extension: 'png', size: 128 }) : null,
        guildName: guild ? guild.name : 'Serveur',
        level: data.level,
        rank,
        xp: data.xp,
        totalMessages: data.total_messages,
        totalUsers: totalUsers || 0,
    });

    return new AttachmentBuilder(buffer, { name: 'rank_card.png' });
}

/**
 * Générer le leaderboard en image et le convertir en AttachmentBuilder
 * @param {object[]} entries
 * @param {import('discord.js').Guild} guild
 * @param {Map<string, object>} userMap
 * @returns {Promise<AttachmentBuilder>}
 */
async function createLeaderboardCardAttachment(entries, guild, userMap) {
    const buffer = await generateLeaderboardCard(entries, guild, userMap);
    return new AttachmentBuilder(buffer, { name: 'leaderboard.png' });
}

module.exports = { generateRankCard, generateLeaderboardCard, createRankCardAttachment, createLeaderboardCardAttachment };
