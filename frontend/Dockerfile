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

ARG NEXT_PUBLIC_SUPABASE_URL=https://nxlxwsmzyjtuzzckeksw.supabase.co
ARG NEXT_PUBLIC_API_URL=https://apiclass.nkwflow.com
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY

ENV NEXT_TELEMETRY_DISABLED=1
ENV SKIP_TYPESCRIPT_CHECK=true
ENV SKIP_LINT=true

# Variáveis públicas do frontend precisam entrar no build do Next.
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY

RUN cd frontend && npm run build

# GARANTIA: Cria a pasta public se ela não existir para não quebrar o COPY abaixo
RUN mkdir -p frontend/public

# ---- Production ----
FROM base AS runner
WORKDIR /app/frontend
ENV NODE_ENV=production

# Estrutura padrão para rodar o build do Next.js
# Copiamos de /app/frontend/ para o diretório atual (.)
COPY --from=builder /app/frontend/public ./public
COPY --from=builder /app/frontend/.next ./.next
COPY --from=builder /app/frontend/node_modules ./node_modules
COPY --from=builder /app/frontend/package.json ./package.json
COPY --from=builder /app/frontend/next.config.ts ./next.config.ts

EXPOSE 3000

# Como mudamos o WORKDIR no runner para /app/frontend, o comando simplifica:
CMD ["npm", "start"]
