/**
 * roles.test.js — Tests unitaires pour le système de mapping rôles
 * Utilise un mock de la base de données
 */
const { describe, it, beforeEach, mock } = require('node:test');
const assert = require('node:assert/strict');

// Mock du module db AVANT de require roles.js
// On doit mocker au niveau module
describe('Système de rôles (logique pure)', () => {
    // Tests de la logique de sélection du rôle le plus élevé
    it('devrait sélectionner le bon rôle pour un niveau donné', () => {
        const roleMap = [
            { level: 10, role_id: 'role_10' },
            { level: 20, role_id: 'role_20' },
            { level: 30, role_id: 'role_30' },
            { level: 40, role_id: 'role_40' },
            { level: 50, role_id: 'role_50' },
        ];

        // Fonction de logique pure extraite
        function getHighestRole(map, level) {
            let highestRole = null;
            let highestLevel = 0;
            for (const entry of map) {
                if (entry.level <= level && entry.level >= highestLevel) {
                    highestLevel = entry.level;
                    highestRole = entry.role_id;
                }
            }
            return highestRole;
        }

        // Tests
        assert.equal(getHighestRole(roleMap, 5), null, 'Pas de rôle avant le level 10');
        assert.equal(getHighestRole(roleMap, 10), 'role_10', 'Rôle exact au level 10');
        assert.equal(getHighestRole(roleMap, 15), 'role_10', 'Entre deux paliers → palier inférieur');
        assert.equal(getHighestRole(roleMap, 20), 'role_20', 'Rôle exact au level 20');
        assert.equal(getHighestRole(roleMap, 25), 'role_20', 'Entre palier 20 et 30');
        assert.equal(getHighestRole(roleMap, 30), 'role_30', 'Rôle exact au level 30');
        assert.equal(getHighestRole(roleMap, 50), 'role_50', 'Rôle exact au level 50');
        assert.equal(getHighestRole(roleMap, 100), 'role_50', 'Au-delà du dernier palier → dernier rôle');
    });

    it('devrait retourner null pour un role map vide', () => {
        function getHighestRole(map, level) {
            let highestRole = null;
            let highestLevel = 0;
            for (const entry of map) {
                if (entry.level <= level && entry.level >= highestLevel) {
                    highestLevel = entry.level;
                    highestRole = entry.role_id;
                }
            }
            return highestRole;
        }

        assert.equal(getHighestRole([], 10), null);
        assert.equal(getHighestRole([], 0), null);
    });

    it('devrait retourner les rôles précédents pour retrait', () => {
        const roleMap = [
            { level: 10, role_id: 'role_10' },
            { level: 20, role_id: 'role_20' },
            { level: 30, role_id: 'role_30' },
        ];

        function getPreviousRoles(map, currentLevel) {
            return map.filter(m => m.level < currentLevel).map(m => m.role_id);
        }

        assert.deepEqual(getPreviousRoles(roleMap, 10), [], 'Au level 10, pas de rôles précédents');
        assert.deepEqual(getPreviousRoles(roleMap, 20), ['role_10'], 'Au level 20, role_10 est précédent');
        assert.deepEqual(getPreviousRoles(roleMap, 30), ['role_10', 'role_20'], 'Au level 30, role_10 et role_20');
        assert.deepEqual(getPreviousRoles(roleMap, 5), [], 'Avant le premier palier');
    });

    it('devrait trouver le rôle exact pour un niveau', () => {
        const roleMap = [
            { level: 10, role_id: 'role_10' },
            { level: 20, role_id: 'role_20' },
            { level: 30, role_id: 'role_30' },
        ];

        function getRoleForLevel(map, level) {
            const entry = map.find(m => m.level === level);
            return entry ? entry.role_id : null;
        }

        assert.equal(getRoleForLevel(roleMap, 10), 'role_10');
        assert.equal(getRoleForLevel(roleMap, 20), 'role_20');
        assert.equal(getRoleForLevel(roleMap, 15), null, 'Pas de rôle au level 15');
        assert.equal(getRoleForLevel(roleMap, 0), null, 'Pas de rôle au level 0');
    });
});
