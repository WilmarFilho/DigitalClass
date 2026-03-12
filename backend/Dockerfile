# ---- Base Node ----
FROM node:22-alpine AS base
WORKDIR /app

# ---- Dependencies ----
FROM base AS deps
# Copia arquivos de configuração da raiz e do backend
COPY package.json package-lock.json ./
COPY packages/ ./packages/
COPY backend/package.json ./backend/
# Instala tudo para garantir que os links do workspace funcionem
RUN npm ci

# ---- Builder ----
FROM deps AS builder
WORKDIR /app
# Copia o código do backend e os pacotes de tipos
COPY backend/ ./backend/
WORKDIR /app/backend
RUN npm run build

# ---- Production ----
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production

# Copia apenas o necessário para rodar
COPY --from=builder /app/backend/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/backend/package.json ./package.json

EXPOSE 3003
CMD ["node", "dist/main"]