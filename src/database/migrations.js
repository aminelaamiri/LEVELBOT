/**
 * migrations.js — Création automatique des tables au démarrage
 * Compatible SQLite (sql.js)
 */

/**
 * Exécuter les migrations pour créer les tables nécessaires
 * @param {object} db — Instance de la couche DB
 */
function runMigrations(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      user_id TEXT NOT NULL,
      guild_id TEXT NOT NULL,
      xp INTEGER DEFAULT 0,
      level INTEGER DEFAULT 0,
      total_messages INTEGER DEFAULT 0,
      last_xp_at INTEGER DEFAULT 0,
      PRIMARY KEY (user_id, guild_id)
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS guild_config (
      guild_id TEXT PRIMARY KEY,
      config_json TEXT DEFAULT '{}'
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS role_map (
      guild_id TEXT NOT NULL,
      level INTEGER NOT NULL,
      role_id TEXT NOT NULL,
      PRIMARY KEY (guild_id, level)
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS blacklist (
      guild_id TEXT NOT NULL,
      target_id TEXT NOT NULL,
      target_type TEXT NOT NULL,
      PRIMARY KEY (guild_id, target_id)
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS event_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guild_id TEXT NOT NULL,
      event_type TEXT NOT NULL,
      user_id TEXT,
      details TEXT,
      created_at INTEGER
    )
  `);

  console.log('✅ Migrations exécutées — tables prêtes.');
}

module.exports = { runMigrations };
