FROM node:18-alpine

WORKDIR /app

# Copier les fichiers de dépendances
COPY package.json package-lock.json* ./

# Installer les dépendances (production uniquement)
RUN npm ci --only=production 2>/dev/null || npm install --only=production

# Copier le code source
COPY src/ ./src/

# Créer le répertoire data pour SQLite
RUN mkdir -p data

# L'utilisateur node a les permissions nécessaires
USER node

# Démarrer le bot
CMD ["node", "src/index.js"]
