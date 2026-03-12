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

ENV NEXT_TELEMETRY_DISABLED=1
ENV SKIP_TYPESCRIPT_CHECK=true
ENV SKIP_LINT=true

# Variáveis de build
ENV NEXT_PUBLIC_SUPABASE_URL=https://nxlxwsmzyjtuzzckeksw.supabase.co
ENV NEXT_PUBLIC_API_URL=https://apiclass.nkwflow.com
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im54bHh3c216eWp0dXp6Y2tla3N3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMyMzA2ODYsImV4cCI6MjA4ODgwNjY4Nn0.d5dimVeZ3xPcSozF_O57oEsRS9ePTgRp3k-Y5fTmxgc

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

EXPOSE 3000

# Como mudamos o WORKDIR no runner para /app/frontend, o comando simplifica:
CMD ["npm", "start"]