# ---- Base Node ----
FROM node:22-alpine AS base
WORKDIR /app
RUN apk add --no-cache ffmpeg

# ---- Dependencies ----
FROM base AS deps
RUN apk add --no-cache python3 make g++
COPY packages/ ./packages/
COPY backend/package.json backend/package-lock.json ./backend/
RUN cd backend && npm ci

# ---- Builder ----
FROM deps AS builder
WORKDIR /app
COPY backend/ ./backend/
# Adicionamos o build aqui
RUN cd backend && npm run build

# ---- Production ----
FROM base AS runner
# Vamos trabalhar na raiz para evitar confusão de caminhos
WORKDIR /app
ENV NODE_ENV=production

RUN apk add --no-cache ffmpeg

# Copiamos o conteúdo de backend/dist para ./dist na raiz do runner
COPY --from=builder /app/backend/dist ./dist
COPY --from=builder /app/backend/node_modules ./node_modules
COPY --from=builder /app/backend/package.json ./package.json

EXPOSE 3003

# Agora o comando aponta para a raiz onde o dist foi copiado
CMD ["node", "dist/backend/src/main.js"]



