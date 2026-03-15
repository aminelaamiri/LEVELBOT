FROM node:18-alpine

WORKDIR /app

# Installer les polices systÃ¨me pour @napi-rs/canvas (Skia)
# Sans ces polices, le moteur Skia crash (Rust panic) lors du rendu de texte
RUN apk add --no-cache fontconfig ttf-dejavu font-noto

# Copier les fichiers de dÃ©pendances
COPY package.json package-lock.json* ./

# Installer les dÃ©pendances (production uniquement)
RUN npm ci --only=production 2>/dev/null || npm install --only=production

# Copier le code source
COPY src/ ./src/

# CrÃ©er le rÃ©pertoire data pour SQLite
RUN mkdir -p data && chown -R node:node data

# L'utilisateur node a les permissions nÃ©cessaires
USER node

# DÃ©marrer le bot
CMD ["node", "src/index.js"]
