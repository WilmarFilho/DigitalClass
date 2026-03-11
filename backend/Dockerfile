# ---- Base Node ----
FROM node:22-alpine AS base
WORKDIR /app

# ---- Dependencies ----
FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

# ---- Builder ----
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Build the NestJS application
RUN npm run build
# Now keep only production dependencies
RUN npm ci --omit=dev && npm cache clean --force

# ---- Production ----
FROM base AS runner
# Set node env
ENV NODE_ENV=production

# Copy non-root user details (alpine has `node` user by default)
USER node

# Copy built code and production deps
COPY --from=builder --chown=node:node /app/node_modules ./node_modules
COPY --from=builder --chown=node:node /app/dist ./dist

EXPOSE 3001

CMD ["node", "dist/main"]
