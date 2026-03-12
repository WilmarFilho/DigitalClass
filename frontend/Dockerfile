# ---- Base Node ----
FROM node:22-alpine AS base
WORKDIR /app

# ---- Dependencies ----
FROM base AS deps
COPY package.json ./
COPY packages/ ./packages/
COPY frontend/package.json frontend/package-lock.json ./frontend/

RUN npm ci --prefix frontend

# ---- Builder ----
FROM deps AS builder
COPY frontend/ ./frontend/
WORKDIR /app/frontend
RUN npm run build

# ---- Production ----
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/frontend/public ./public
COPY --from=builder /app/frontend/.next ./.next
COPY --from=builder /app/frontend/node_modules ./node_modules
COPY --from=builder /app/frontend/package.json ./package.json

EXPOSE 8004
CMD ["npm", "start"]