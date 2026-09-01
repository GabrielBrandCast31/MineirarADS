# syntax=docker/dockerfile:1

# ============================================================================
# Imagem de desenvolvimento do AdMiner.
#
# `bookworm-slim` e não `alpine`: o Next compila com binários nativos (SWC,
# Turbopack) e as builds glibc são as mais bem testadas. A diferença de
# tamanho não paga o risco num ambiente de desenvolvimento.
# ============================================================================
FROM node:26-bookworm-slim AS dev

WORKDIR /app
ENV NODE_ENV=development

# As dependências ficam numa camada só delas: mexer em src/ não reinstala nada.
COPY package.json package-lock.json ./
RUN npm ci

# O código é montado por bind mount no compose; esta cópia serve para a imagem
# funcionar sozinha (`docker run`) e para o build não depender do mount.
COPY . .

EXPOSE 3000
CMD ["npm", "run", "dev", "--", "-H", "0.0.0.0"]
