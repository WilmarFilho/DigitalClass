# ---- Base Node ----
FROM node:22-alpine AS base
WORKDIR /app

# ---- Dependencies ----
FROM base AS deps
COPY package.json package-lock.json ./
COPY packages/ ./packages/
COPY frontend/package.json ./frontend/
RUN npm ci

# ---- Builder ----
FROM deps AS builder
WORKDIR /app
COPY frontend/ ./frontend/
WORKDIR /app/frontend
# Passa as variáveis de build se necessário
RUN npm run build

# ---- Production ----
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production

# Next.js standalone costuma ser a melhor opção para Docker
COPY --from=builder /app/frontend/public ./public
COPY --from=builder /app/frontend/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/frontend/package.json ./package.json

EXPOSE 3000
CMD ["npm", "start"]