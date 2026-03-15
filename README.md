# 🏆 Discord Leveling Bot

Bot Discord complet de **leveling** avec attribution d'XP, niveaux, rôles automatiques et commandes d'administration.

## ✨ Fonctionnalités

- **XP par message** avec cooldown anti-spam configurable
- **XP par réaction** et **XP vocal** (optionnels)
- **Niveaux progressifs** avec formule `xp = 100 × level²`
- **Rôles automatiques** par paliers de niveaux (10, 20, 30…)
- **11 commandes slash** : `/rank`, `/leaderboard`, `/addxp`, `/removexp`, `/config`, `/setrolemap`, `/setchannel`, `/blacklist`, `/export`, `/import`
- **Blacklist** d'utilisateurs et de canaux
- **Logs admin** dans un canal dédié
- **Double support DB** : SQLite (dev) / PostgreSQL (prod)
- **Embeds riches** pour les level-up, rank et leaderboard

## 📋 Prérequis

- **Node.js 18+**
- Un **bot Discord** créé sur le [Discord Developer Portal](https://discord.com/developers/applications)
- Les **intents** activés : `GUILD_MEMBERS`, `MESSAGE_CONTENT`, `GUILD_MESSAGES`, `GUILD_VOICE_STATES`

## 🚀 Installation Rapide

### 1. Cloner le repo
```bash
git clone https://github.com/VOTRE_USERNAME/discord-leveling-bot.git
cd discord-leveling-bot
```

### 2. Installer les dépendances
```bash
npm install
```

### 3. Configurer l'environnement
```bash
cp .env.example .env
```

Éditez `.env` avec vos valeurs :
```env
DISCORD_TOKEN=votre_token_ici
CLIENT_ID=votre_client_id
GUILD_ID=votre_guild_id
OWNER_ID=votre_discord_id
```

### 4. Démarrer le bot
```bash
npm start
```

## ⚙️ Configuration

| Variable | Description | Défaut |
|---|---|---|
| `DISCORD_TOKEN` | Token du bot Discord | *requis* |
| `CLIENT_ID` | ID de l'application Discord | *requis* |
| `GUILD_ID` | ID du serveur Discord | *requis* |
| `OWNER_ID` | Votre ID Discord (admin principal) | *requis* |
| `SUPERVISOR_IDS` | IDs des superviseurs (séparés par `,`) | *(vide)* |
| `LOG_CHANNEL_ID` | Canal pour les logs admin | *(vide)* |
| `LEVELUP_CHANNEL_ID` | Canal pour les annonces level-up | *(canal du message)* |
| `XP_MIN` | XP minimum par message | `15` |
| `XP_MAX` | XP maximum par message | `25` |
| `XP_COOLDOWN` | Cooldown en secondes entre attributions d'XP | `60` |
| `XP_PER_REACTION` | XP par réaction | `5` |
| `REACTION_XP_ENABLED` | Activer l'XP par réaction | `true` |
| `VOICE_XP_ENABLED` | Activer l'XP vocal | `false` |
| `VOICE_XP_RATE` | XP par intervalle vocal | `10` |
| `VOICE_XP_INTERVAL` | Intervalle d'XP vocal en secondes | `300` |
| `REMOVE_PREVIOUS_ROLE` | Retirer le rôle précédent au level-up | `false` |
| `DATABASE_URL` | URL PostgreSQL (vide = SQLite local) | *(vide)* |

## 📜 Commandes

### Commandes publiques
| Commande | Description |
|---|---|
| `/rank [@user]` | Affiche XP, niveau et position |
| `/leaderboard [page]` | Classement des membres par XP |

### Commandes admin (Owner/Superviseur)
| Commande | Description |
|---|---|
| `/addxp <user> <amount>` | Ajouter de l'XP manuellement |
| `/removexp <user> <amount>` | Retirer de l'XP |
| `/setrolemap <level> <role>` | Mapper un niveau à un rôle |
| `/removerolemap <level>` | Supprimer un mapping |
| `/setchannel <type> <channel>` | Configurer canal logs/level-up |
| `/config` | Afficher la config actuelle |
| `/blacklist <action> [type] [target]` | Gérer la blacklist XP |
| `/export` | Exporter les données en JSON |
| `/import <file>` | Importer des données JSON |

## 🗺️ Configurer les rôles par niveaux

Utilisez `/setrolemap` pour associer un niveau à un rôle :

```
/setrolemap level:10 role:@Actif
/setrolemap level:20 role:@Habitué
/setrolemap level:30 role:@Vétéran
/setrolemap level:40 role:@Légende
/setrolemap level:50 role:@Maître
```

Vérifiez la config avec `/config`.

## 📈 Progression des niveaux

| Niveau | XP requis | Temps estimé* |
|---|---|---|
| 1 | 100 | ~5 min |
| 5 | 2 500 | ~2h |
| 10 | 10 000 | ~8h |
| 20 | 40 000 | ~33h |
| 30 | 90 000 | ~75h |
| 50 | 250 000 | ~208h |

*\*Avec 20 XP/message moyen et 60s de cooldown*

## 🚂 Déploiement sur Railway

### Étape 1 : Préparer le repo GitHub
```bash
cd discord-leveling-bot
git init
git add .
git commit -m "Initial commit: Discord Leveling Bot"
git branch -M main
git remote add origin https://github.com/VOTRE_USERNAME/discord-leveling-bot.git
git push -u origin main
```

### Étape 2 : Créer un projet Railway
1. Allez sur [railway.app](https://railway.app)
2. **New Project** → **Deploy from GitHub repo**
3. Sélectionnez votre repo `discord-leveling-bot`

### Étape 3 : Configurer les variables d'environnement
Dans Railway → **Variables**, ajoutez :
- `DISCORD_TOKEN`
- `CLIENT_ID`
- `GUILD_ID`
- `OWNER_ID`
- `SUPERVISOR_IDS` (optionnel)
- `LOG_CHANNEL_ID` (optionnel)

### Étape 4 : Déployer
Railway déploie automatiquement à chaque push sur `main`.

### Étape 5 (optionnel) : Ajouter PostgreSQL
Dans Railway → **New** → **Database** → **PostgreSQL**
Copiez l'URL de connexion dans la variable `DATABASE_URL`.

## 🐳 Docker

```bash
# Avec SQLite
docker build -t leveling-bot .
docker run -d --env-file .env leveling-bot

# Avec PostgreSQL (docker-compose)
docker-compose up -d
```

## 🧪 Tests

```bash
npm test
```

## 📁 Structure du projet

```
src/
├── index.js           # Point d'entrée
├── config.js          # Configuration
├── database/
│   ├── db.js          # Abstraction DB (SQLite/PostgreSQL)
│   └── migrations.js  # Création des tables
├── systems/
│   ├── levels.js      # Calcul des niveaux
│   ├── xp.js          # Moteur XP + cooldown
│   └── roles.js       # Mapping niveaux → rôles
├── commands/          # 11 commandes slash
├── events/            # Handlers (message, reaction, voice)
└── utils/             # Permissions, embeds, logger
```

## 📄 Licence

MIT — voir [LICENSE](LICENSE).
