/**
 * seed.js — Script de pré-configuration des rôles de niveaux
 * Exécuter une seule fois : node seed.js
 */
const path = require('path');
try { require('dotenv').config({ path: path.join(__dirname, '.env') }); } catch { }

const { createDatabase } = require('./src/database/db');
const { runMigrations } = require('./src/database/migrations');
const { setRoleMapping } = require('./src/database/db');

const GUILD_ID = process.env.GUILD_ID;

const ROLE_MAPPINGS = [
    { level: 10, roleId: '1468391948665618675' },
    { level: 20, roleId: '1472416406304850093' },
    { level: 30, roleId: '1468392901666148548' },
    { level: 40, roleId: '1468391699255394367' },
    { level: 50, roleId: '1468390659370127594' },
    { level: 60, roleId: '1461802116015194224' },
    { level: 70, roleId: '1468393823431299082' },
    { level: 80, roleId: '1468394094337462383' },
];

async function seed() {
    console.log('🌱 Seed — Pré-configuration des rôles de niveaux');
    console.log(`📍 Serveur : ${GUILD_ID}`);

    if (!GUILD_ID) {
        console.error('❌ GUILD_ID manquant dans .env');
        process.exit(1);
    }

    const db = await createDatabase(process.env.DATABASE_URL || '');
    runMigrations(db);

    console.log('\n📋 Insertion des mappings :');
    for (const { level, roleId } of ROLE_MAPPINGS) {
        setRoleMapping(GUILD_ID, level, roleId);
        console.log(`  ✅ Niveau ${level} → Rôle ${roleId}`);
    }

    console.log(`\n🎉 ${ROLE_MAPPINGS.length} mappings insérés avec succès !`);
    process.exit(0);
}

seed().catch(err => {
    console.error('❌ Erreur seed:', err);
    process.exit(1);
});
