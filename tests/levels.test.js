/**
 * levels.test.js — Tests unitaires pour le système de niveaux
 * Vérifie les formules, le cap, et la barre de progression
 */
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

describe('Système de niveaux (logique pure)', () => {
    // Reproduire les fonctions pour tester en isolation
    const MAX_LEVEL = 80;

    function xpForLevel(level) {
        if (level <= 0) return 0;
        return 100 * level * level;
    }

    function levelForXp(xp) {
        if (xp <= 0) return 0;
        const level = Math.floor(Math.sqrt(xp / 100));
        return Math.min(level, MAX_LEVEL);
    }

    function progressPercent(xp, level) {
        if (level >= MAX_LEVEL) return 100;
        const currentLevelXp = xpForLevel(level);
        const nextLevelXp = xpForLevel(level + 1);
        const diff = nextLevelXp - currentLevelXp;
        if (diff === 0) return 100;
        const progress = ((xp - currentLevelXp) / diff) * 100;
        return Math.min(100, Math.max(0, Math.floor(progress)));
    }

    function progressBar(percent, length = 20) {
        const filled = Math.round((percent / 100) * length);
        const empty = length - filled;
        return '█'.repeat(filled) + '░'.repeat(empty);
    }

    function maxXp() {
        return xpForLevel(MAX_LEVEL);
    }

    it('devrait calculer l\'XP requis pour chaque niveau', () => {
        assert.equal(xpForLevel(0), 0);
        assert.equal(xpForLevel(1), 100);
        assert.equal(xpForLevel(5), 2500);
        assert.equal(xpForLevel(10), 10000);
        assert.equal(xpForLevel(20), 40000);
        assert.equal(xpForLevel(50), 250000);
        assert.equal(xpForLevel(80), 640000);
    });

    it('devrait calculer le niveau correct pour un montant d\'XP', () => {
        assert.equal(levelForXp(0), 0);
        assert.equal(levelForXp(50), 0);
        assert.equal(levelForXp(100), 1);
        assert.equal(levelForXp(399), 1);
        assert.equal(levelForXp(400), 2);
        assert.equal(levelForXp(10000), 10);
        assert.equal(levelForXp(15000), 12);
    });

    it('devrait plafonner le niveau à 80', () => {
        assert.equal(levelForXp(640000), 80);
        assert.equal(levelForXp(700000), 80);
        assert.equal(levelForXp(999999), 80);
        assert.equal(levelForXp(10000000), 80);
    });

    it('devrait calculer la progression correctement', () => {
        assert.equal(progressPercent(0, 0), 0);
        assert.equal(progressPercent(50, 0), 50);
        assert.equal(progressPercent(10000, 10), 0);
        assert.equal(progressPercent(10500, 10), 23);
    });

    it('devrait retourner 100% quand au niveau max', () => {
        assert.equal(progressPercent(640000, 80), 100);
        assert.equal(progressPercent(700000, 80), 100);
    });

    it('devrait générer une barre de progression correcte', () => {
        const bar0 = progressBar(0, 10);
        assert.equal(bar0, '░░░░░░░░░░');
        const bar50 = progressBar(50, 10);
        assert.equal(bar50, '█████░░░░░');
        const bar100 = progressBar(100, 10);
        assert.equal(bar100, '██████████');
    });

    it('devrait retourner le bon max XP', () => {
        assert.equal(maxXp(), 640000);
    });
});
