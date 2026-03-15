FROM node:18-bullseye-slim

WORKDIR /app

# Installer les polices systÃ¨me pour @napi-rs/canvas (Skia)
# Sur Debian (bullseye-slim), cela rÃ©sout les crashs (Rust panic) liÃ©s Ã  musl/Alpine
RUN apt-get update && apt-get install -y --no-install-recommends \
    fontconfig \
    fonts-dejavu-core \
    fonts-noto \
    && rm -rf /var/lib/apt/lists/*

# Copier les fichiers de dÃ©pendances
COPY package.json package-lock.json* ./

# Installer les dÃ©pendances (production uniquement)
RUN npm ci --only=production 2>/dev/null || npm install --only=production

# Copier le code source
COPY src/ ./src/

# CrÃ©er le rÃ©pertoire data
RUN mkdir -p data && chown -R node:node data

# L'utilisateur node a les permissions nÃ©cessaires
USER node

# DÃ©marrer le bot
CMD ["node", "src/index.js"]
