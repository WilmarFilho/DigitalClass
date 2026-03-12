# ---- Base Node ----
FROM node:22-alpine AS base
WORKDIR /app

# ---- Dependencies ----
FROM base AS deps
COPY packages/ ./packages/
# Ajuste os caminhos se seu backend estiver em outra pasta
COPY backend/package.json backend/package-lock.json ./backend/
RUN cd backend && npm ci

# ---- Builder ----
FROM deps AS builder
WORKDIR /app
COPY backend/ ./backend/
# Compila o NestJS para gerar a pasta 'dist'
RUN cd backend && npm run build

# ---- Production ----
FROM base AS runner
WORKDIR /app/backend
ENV NODE_ENV=production

# O PULO DO GATO: Você precisa copiar a pasta DIST que foi gerada no builder
COPY --from=builder /app/backend/dist ./dist
COPY --from=builder /app/backend/node_modules ./node_modules
COPY --from=builder /app/backend/package.json ./package.json

EXPOSE 3003

# O comando agora vai achar o /app/backend/dist/main.js
CMD ["node", "dist/main"]