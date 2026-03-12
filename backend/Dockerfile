# ---- Base Node ----
FROM node:22-alpine AS base
WORKDIR /app

# ---- Dependencies ----
FROM base AS deps
# Copiamos a pasta de tipos que o backend precisa
COPY packages/ ./packages/
# Copiamos os arquivos do backend
COPY backend/package.json backend/package-lock.json ./backend/

# Instalamos as dependências dentro da pasta do backend
RUN cd backend && npm ci

# ---- Builder ----
FROM deps AS builder
WORKDIR /app
COPY backend/ ./backend/
RUN cd backend && npm run build

# ---- Production ----
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production

# Copia o que foi gerado
COPY --from=builder /app/backend/dist ./dist
COPY --from=builder /app/backend/node_modules ./node_modules
COPY --from=builder /app/backend/package.json ./package.json

EXPOSE 3003
CMD ["node", "dist/main"]