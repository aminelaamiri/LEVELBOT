/**
 * xp.test.js — Tests pour la logique XP (cooldown, XP aléatoire)
 */
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

describe('Logique XP (fonctions pures)', () => {

    describe('randomXp()', () => {
        it('devrait générer un XP entre min et max', () => {
            const min = 15;
            const max = 25;

            // Simuler la fonction randomXp
            function randomXp(xpMin, xpMax) {
                return Math.floor(Math.random() * (xpMax - xpMin + 1)) + xpMin;
            }

            // Tester 1000 fois que le résultat est dans la plage
            for (let i = 0; i < 1000; i++) {
                const xp = randomXp(min, max);
                assert.ok(xp >= min, `XP ${xp} est inférieur au minimum ${min}`);
                assert.ok(xp <= max, `XP ${xp} est supérieur au maximum ${max}`);
            }
        });

        it('devrait retourner exactement min quand min === max', () => {
            function randomXp(xpMin, xpMax) {
                return Math.floor(Math.random() * (xpMax - xpMin + 1)) + xpMin;
            }

            for (let i = 0; i < 100; i++) {
                assert.equal(randomXp(20, 20), 20);
            }
        });
    });

    describe('Cooldown (logique)', () => {
        it('devrait bloquer l\'XP pendant le cooldown', () => {
            const cooldownSeconds = 60;
            const cooldowns = new Map();

            function isOnCooldown(key, cooldownS) {
                const lastTime = cooldowns.get(key);
                if (!lastTime) return false;
                return (Date.now() - lastTime) / 1000 < cooldownS;
            }

            function setCooldown(key) {
                cooldowns.set(key, Date.now());
            }

            const key = 'user123:guild456';

            // Pas de cooldown initialement
            assert.equal(isOnCooldown(key, cooldownSeconds), false, 'Pas de cooldown au départ');

            // Mettre le cooldown
            setCooldown(key);

            // Vérifier qu'il est actif
            assert.equal(isOnCooldown(key, cooldownSeconds), true, 'Cooldown actif juste après');
        });

        it('devrait autoriser l\'XP après expiration du cooldown', () => {
            const cooldowns = new Map();

            function isOnCooldown(key, cooldownS) {
                const lastTime = cooldowns.get(key);
                if (!lastTime) return false;
                return (Date.now() - lastTime) / 1000 < cooldownS;
            }

            const key = 'user789:guild012';

            // Simuler un cooldown expiré (1 seconde dans le passé, cooldown de 0.5s)
            cooldowns.set(key, Date.now() - 1000);
            assert.equal(isOnCooldown(key, 0.5), false, 'Cooldown expiré');
        });
    });

    describe('Calcul XP + Level Up', () => {
        it('devrait détecter un level-up quand l\'XP dépasse le seuil', () => {
            const { levelForXp } = require('../src/systems/levels');

            // Simuler l'ajout d'XP
            let xp = 90;
            let level = levelForXp(xp); // 0
            assert.equal(level, 0);

            // Ajouter 15 XP → 105 XP → Level 1
            xp += 15;
            const newLevel = levelForXp(xp);
            assert.equal(newLevel, 1, 'Devrait passer au niveau 1');
            assert.ok(newLevel > level, 'Level up détecté');
        });

        it('ne devrait pas level-up si XP insuffisant', () => {
            const { levelForXp } = require('../src/systems/levels');

            let xp = 80;
            let level = levelForXp(xp);

            xp += 15; // 95 XP — pas encore niveau 1
            const newLevel = levelForXp(xp);
            assert.equal(newLevel, 0);
            assert.equal(newLevel > level, false, 'Pas de level up');
        });
    });
});
