# syntax=docker/dockerfile:1

FROM node:24-slim AS base
WORKDIR /app
RUN corepack enable

FROM base AS deps
COPY package.json yarn.lock* ./
RUN yarn install --frozen-lockfile --network-timeout 600000

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN yarn prisma generate
RUN yarn build

FROM base AS runner
ENV NODE_ENV=production
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/next.config.ts ./next.config.ts
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/tsconfig.json ./tsconfig.json

# Chromium for scraper fallback. Install as root, then run the app as an
# unprivileged user with a persistent local-upload fallback directory.
RUN yarn playwright install --with-deps chromium \
  && groupadd --system --gid 1001 nodejs \
  && useradd --system --uid 1001 --gid nodejs nextjs \
  && mkdir -p /app/uploads/cvs \
  && chown -R nextjs:nodejs /app /ms-playwright

# Pre-download the pinned yarn into a COREPACK_HOME the runtime user can
# write to, otherwise `yarn` crashes at startup with EACCES on the cache dir.
ENV COREPACK_HOME=/app/.corepack
RUN mkdir -p "$COREPACK_HOME" \
  && corepack prepare yarn@1.22.22 --activate \
  && chown -R nextjs:nodejs "$COREPACK_HOME"

EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"
USER nextjs
CMD ["sh", "-c", "yarn prisma migrate deploy && yarn start"]
