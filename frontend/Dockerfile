# ---- Base Node ----
FROM node:22-alpine AS base
WORKDIR /app

# ---- Dependencies ----
FROM base AS deps
COPY packages/ ./packages/
COPY frontend/package.json frontend/package-lock.json ./frontend/

RUN cd frontend && npm ci

# ---- Builder ----
FROM deps AS builder
WORKDIR /app
COPY frontend/ ./frontend/
RUN cd frontend && npm run build

# ---- Production ----
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production

# Estrutura padrão para rodar o build do Next.js
COPY --from=builder /app/frontend/public ./public
COPY --from=builder /app/frontend/.next ./.next
COPY --from=builder /app/frontend/node_modules ./node_modules
COPY --from=builder /app/frontend/package.json ./package.json

EXPOSE 3000
CMD ["npm", "start"]