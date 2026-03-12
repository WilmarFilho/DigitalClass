# ---- Base Node ----
FROM node:22-alpine AS base
WORKDIR /app

# ---- Dependencies ----
FROM base AS deps
# Copiamos apenas o package.json da raiz (se existir) ou apenas os do backend
COPY package.json ./ 
COPY packages/ ./packages/
COPY backend/package.json backend/package-lock.json ./backend/

# Instala as dependências focando no backend
RUN npm ci --prefix backend

# ---- Builder ----
FROM deps AS builder
COPY backend/ ./backend/
WORKDIR /app/backend
RUN npm run build

# ---- Production ----
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/backend/dist ./dist
COPY --from=builder /app/backend/node_modules ./node_modules
COPY --from=builder /app/backend/package.json ./package.json

EXPOSE 3003
CMD ["node", "dist/main"]