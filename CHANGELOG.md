# Changelog

## [1.0.0] - 2026-03-02

### Ajouté
- Système XP complet : messages, réactions, voix
- Formule de niveaux : `xp = 100 × level²` (progression modérée)
- Attribution automatique de rôles par paliers
- 11 commandes slash : `/rank`, `/leaderboard`, `/addxp`, `/removexp`, `/config`, `/setrolemap`, `/removerolemap`, `/setchannel`, `/blacklist`, `/export`, `/import`
- Système anti-spam : cooldown configurable, blacklist utilisateurs/canaux
- Support double base de données : SQLite (dev) + PostgreSQL (prod)
- Embeds riches pour level-up, rank et leaderboard
- Logs admin dans un canal dédié
- Dockerfile et docker-compose
- Tests unitaires (niveaux, rôles, XP)
- Guide de déploiement Railway + Docker
