/**
 * migrations.js â€” CrÃ©ation automatique des tables au dÃ©marrage
 * Compatible SQLite (sql.js) et PostgreSQL (pg)
 */

/**
 * ExÃ©cuter les migrations pour crÃ©er les tables nÃ©cessaires
 * @param {object} db â€” Instance de la couche DB
 */
async function runMigrations(db) {
  await db.exec(`
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

  await db.exec(`
    CREATE TABLE IF NOT EXISTS guild_config (
      guild_id TEXT PRIMARY KEY,
      config_json TEXT DEFAULT '{}'
    )
  `);

  await db.exec(`
    CREATE TABLE IF NOT EXISTS role_map (
      guild_id TEXT NOT NULL,
      level INTEGER NOT NULL,
      role_id TEXT NOT NULL,
      PRIMARY KEY (guild_id, level)
    )
  `);

  await db.exec(`
    CREATE TABLE IF NOT EXISTS blacklist (
      guild_id TEXT NOT NULL,
      target_id TEXT NOT NULL,
      target_type TEXT NOT NULL,
      PRIMARY KEY (guild_id, target_id)
    )
  `);

  // SERIAL pour PostgreSQL au lieu de AUTOINCREMENT (SQLite-only)
  if (db.isPostgres) {
    await db.exec(`
      CREATE TABLE IF NOT EXISTS event_logs (
        id SERIAL PRIMARY KEY,
        guild_id TEXT NOT NULL,
        event_type TEXT NOT NULL,
        user_id TEXT,
        details TEXT,
        created_at INTEGER
      )
    `);
  } else {
    await db.exec(`
      CREATE TABLE IF NOT EXISTS event_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        guild_id TEXT NOT NULL,
        event_type TEXT NOT NULL,
        user_id TEXT,
        details TEXT,
        created_at INTEGER
      )
    `);
  }

  console.log('âœ… Migrations exÃ©cutÃ©es â€” tables prÃªtes.');
}

module.exports = { runMigrations };
