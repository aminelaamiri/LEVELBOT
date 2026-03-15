/**
 * db.js — Couche d'abstraction base de données
 * Supporte SQLite (sql.js, pur JavaScript) pour dev et PostgreSQL (pg) pour prod
 * Le choix se fait via DATABASE_URL : vide = SQLite, rempli = PostgreSQL
 */
const path = require('path');
const fs = require('fs');

let dbInstance = null;

/**
 * Créer et retourner l'instance DB singleton
 * @param {string} databaseUrl — URL PostgreSQL ou vide pour SQLite
 * @returns {Promise<object>} — Instance DB avec méthodes standardisées
 */
async function createDatabase(databaseUrl) {
    if (dbInstance) return dbInstance;

    if (databaseUrl && databaseUrl.startsWith('postgres')) {
        dbInstance = createPostgresDB(databaseUrl);
    } else {
        dbInstance = await createSQLiteDB();
    }

    return dbInstance;
}

/**
 * Créer une instance SQLite via sql.js (pur JavaScript, pas de compilation native)
 */
async function createSQLiteDB() {
    const initSqlJs = require('sql.js');
    const SQL = await initSqlJs();

    const dataDir = path.join(__dirname, '..', '..', 'data');
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
    const dbPath = path.join(dataDir, 'leveling.db');

    let db;
    if (fs.existsSync(dbPath)) {
        const buffer = fs.readFileSync(dbPath);
        db = new SQL.Database(buffer);
    } else {
        db = new SQL.Database();
    }

    console.log(`📂 Base de données SQLite : ${dbPath}`);

    // Sauvegarder automatiquement toutes les 30 secondes
    const saveInterval = setInterval(() => {
        try {
            const data = db.export();
            const buffer = Buffer.from(data);
            fs.writeFileSync(dbPath, buffer);
        } catch (err) {
            console.error('⚠️ Erreur sauvegarde SQLite:', err.message);
        }
    }, 30000);

    // Sauvegarder à la fermeture
    function saveNow() {
        try {
            const data = db.export();
            const buffer = Buffer.from(data);
            fs.writeFileSync(dbPath, buffer);
        } catch (err) {
            console.error('⚠️ Erreur sauvegarde SQLite:', err.message);
        }
    }

    process.on('exit', saveNow);
    process.on('SIGINT', () => { saveNow(); process.exit(0); });
    process.on('SIGTERM', () => { saveNow(); process.exit(0); });

    return {
        isPostgres: false,
        _db: db,
        _saveInterval: saveInterval,
        _saveFn: saveNow,

        /** Exécuter une commande SQL (CREATE, INSERT, UPDATE, DELETE) */
        exec(sql) {
            db.run(sql);
            saveNow();
        },

        /** Récupérer une seule ligne */
        get(sql, params = []) {
            const stmt = db.prepare(sql);
            stmt.bind(params);
            if (stmt.step()) {
                const columns = stmt.getColumnNames();
                const values = stmt.get();
                stmt.free();
                const row = {};
                columns.forEach((col, i) => { row[col] = values[i]; });
                return row;
            }
            stmt.free();
            return null;
        },

        /** Récupérer plusieurs lignes */
        all(sql, params = []) {
            const stmt = db.prepare(sql);
            stmt.bind(params);
            const rows = [];
            while (stmt.step()) {
                const columns = stmt.getColumnNames();
                const values = stmt.get();
                const row = {};
                columns.forEach((col, i) => { row[col] = values[i]; });
                rows.push(row);
            }
            stmt.free();
            return rows;
        },

        /** Exécuter une commande avec paramètres (INSERT, UPDATE, DELETE) */
        run(sql, params = []) {
            db.run(sql, params);
            saveNow();
            return { changes: db.getRowsModified() };
        },

        /** Fermer la connexion */
        close() {
            clearInterval(saveInterval);
            saveNow();
            db.close();
        },
    };
}

/**
 * Créer une instance PostgreSQL (production)
 */
function createPostgresDB(url) {
    const { Pool } = require('pg');
    const pool = new Pool({ connectionString: url, ssl: { rejectUnauthorized: false } });

    console.log('🐘 Base de données PostgreSQL connectée.');

    return {
        isPostgres: true,

        async exec(sql) {
            await pool.query(sql);
        },

        async get(sql, params = []) {
            const result = await pool.query(sql, params);
            return result.rows[0] || null;
        },

        async all(sql, params = []) {
            const result = await pool.query(sql, params);
            return result.rows;
        },

        async run(sql, params = []) {
            const result = await pool.query(sql, params);
            return { changes: result.rowCount };
        },

        close() {
            pool.end();
        },
    };
}

/**
 * Obtenir l'instance DB courante
 */
function getDatabase() {
    if (!dbInstance) {
        throw new Error('Base de données non initialisée. Appelez createDatabase() d\'abord.');
    }
    return dbInstance;
}

// ─────────────────────────────────────────────
//  Fonctions CRUD haut niveau
// ─────────────────────────────────────────────

/**
 * Récupérer les données d'un utilisateur dans un serveur
 */
function getUser(userId, guildId) {
    const db = getDatabase();
    return db.get('SELECT * FROM users WHERE user_id = ? AND guild_id = ?', [userId, guildId]);
}

/**
 * Créer ou mettre à jour un utilisateur
 */
function upsertUser(userId, guildId, data) {
    const db = getDatabase();
    const { xp, level, total_messages, last_xp_at } = data;
    return db.run(
        `INSERT INTO users (user_id, guild_id, xp, level, total_messages, last_xp_at)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT (user_id, guild_id)
     DO UPDATE SET xp = ?, level = ?, total_messages = ?, last_xp_at = ?`,
        [userId, guildId, xp, level, total_messages, last_xp_at, xp, level, total_messages, last_xp_at],
    );
}

/**
 * Récupérer le leaderboard (top N utilisateurs triés par XP)
 */
function getLeaderboard(guildId, limit = 10, offset = 0) {
    const db = getDatabase();
    return db.all(
        'SELECT * FROM users WHERE guild_id = ? ORDER BY xp DESC LIMIT ? OFFSET ?',
        [guildId, limit, offset],
    );
}

/**
 * Obtenir la position d'un utilisateur dans le leaderboard
 */
function getUserRank(userId, guildId) {
    const db = getDatabase();
    const row = db.get(
        'SELECT COUNT(*) as rank FROM users WHERE guild_id = ? AND xp > (SELECT COALESCE(xp, 0) FROM users WHERE user_id = ? AND guild_id = ?)',
        [guildId, userId, guildId],
    );
    return (row?.rank ?? 0) + 1;
}

/**
 * Compter le nombre total d'utilisateurs dans un serveur
 */
function getUserCount(guildId) {
    const db = getDatabase();
    const row = db.get('SELECT COUNT(*) as count FROM users WHERE guild_id = ?', [guildId]);
    return row?.count ?? 0;
}

// ─── Role Map ───

function getRoleMap(guildId) {
    const db = getDatabase();
    return db.all('SELECT level, role_id FROM role_map WHERE guild_id = ? ORDER BY level ASC', [guildId]);
}

function setRoleMapping(guildId, level, roleId) {
    const db = getDatabase();
    return db.run(
        `INSERT INTO role_map (guild_id, level, role_id) VALUES (?, ?, ?)
     ON CONFLICT (guild_id, level) DO UPDATE SET role_id = ?`,
        [guildId, level, roleId, roleId],
    );
}

function removeRoleMapping(guildId, level) {
    const db = getDatabase();
    return db.run('DELETE FROM role_map WHERE guild_id = ? AND level = ?', [guildId, level]);
}

// ─── Blacklist ───

function isBlacklisted(guildId, targetId) {
    const db = getDatabase();
    return !!db.get('SELECT target_id FROM blacklist WHERE guild_id = ? AND target_id = ?', [guildId, targetId]);
}

function addToBlacklist(guildId, targetId, targetType) {
    const db = getDatabase();
    return db.run(
        'INSERT OR IGNORE INTO blacklist (guild_id, target_id, target_type) VALUES (?, ?, ?)',
        [guildId, targetId, targetType],
    );
}

function removeFromBlacklist(guildId, targetId) {
    const db = getDatabase();
    return db.run('DELETE FROM blacklist WHERE guild_id = ? AND target_id = ?', [guildId, targetId]);
}

function getBlacklist(guildId) {
    const db = getDatabase();
    return db.all('SELECT target_id, target_type FROM blacklist WHERE guild_id = ?', [guildId]);
}

// ─── Event Logs ───

function addLog(guildId, eventType, userId, details) {
    const db = getDatabase();
    const now = Math.floor(Date.now() / 1000);
    return db.run(
        'INSERT INTO event_logs (guild_id, event_type, user_id, details, created_at) VALUES (?, ?, ?, ?, ?)',
        [guildId, eventType, userId, details, now],
    );
}

// ─── Export / Import ───

function getAllUsers(guildId) {
    const db = getDatabase();
    return db.all('SELECT * FROM users WHERE guild_id = ? ORDER BY xp DESC', [guildId]);
}

function importUsers(guildId, users) {
    for (const u of users) {
        upsertUser(u.user_id, guildId, {
            xp: u.xp || 0,
            level: u.level || 0,
            total_messages: u.total_messages || 0,
            last_xp_at: u.last_xp_at || 0,
        });
    }
}

module.exports = {
    createDatabase,
    getDatabase,
    getUser,
    upsertUser,
    getLeaderboard,
    getUserRank,
    getUserCount,
    getRoleMap,
    setRoleMapping,
    removeRoleMapping,
    isBlacklisted,
    addToBlacklist,
    removeFromBlacklist,
    getBlacklist,
    addLog,
    getAllUsers,
    importUsers,
};
