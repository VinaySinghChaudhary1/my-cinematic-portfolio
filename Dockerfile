# Production image — works on any Docker host (VPS, Hostinger VPS, Render, Railway, Fly.io, Coolify, Dokploy…)
#   docker build -t portfolio .
#   docker run -p 3000:3000 --env-file .env.production -v portfolio-data:/app/data portfolio
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM node:22-alpine AS run
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0 DATA_DIR=/app/data
RUN addgroup -S app && adduser -S app -G app && mkdir -p /app/data && chown app:app /app/data
COPY --from=build --chown=app:app /app/.next/standalone ./
COPY --from=build --chown=app:app /app/.next/static ./.next/static
COPY --from=build --chown=app:app /app/public ./public
# No shell steps needed: on first start the app creates its tables, demo content and the admin account
# from ADMIN_EMAIL / ADMIN_PASSWORD (see src/lib/server/bootstrap.ts). Restore your content in Admin → Backups.
USER app
VOLUME ["/app/data"]
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s CMD wget -qO- http://127.0.0.1:3000/api/health || exit 1
CMD ["node", "server.js"]
