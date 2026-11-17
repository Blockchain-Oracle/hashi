# Hashi's web app (hashi.cash): the landing page, the swap screen, Activity and the gas relayer. Built from the repo
# root, because the app is one package of a pnpm workspace:
#
#   docker build -f apps/web/Dockerfile -t hashi-web .
#
# Next's standalone output keeps the runtime image to the traced server files, one `node` process as PID 1.
FROM node:24.11.1-bookworm-slim AS build
ENV PNPM_HOME=/pnpm PATH=/pnpm:$PATH CI=1 COREPACK_ENABLE_DOWNLOAD_PROMPT=0 NEXT_TELEMETRY_DISABLED=1
RUN corepack enable
WORKDIR /repo

# Public settings, inlined into the browser bundle at build time. Never pass a secret this way: build arguments can
# be read from the image's history. The relayer key is a runtime variable only.
ARG NEXT_PUBLIC_SITE_URL
ARG NEXT_PUBLIC_DOCS_URL
ARG NEXT_PUBLIC_REOWN_PROJECT_ID
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL \
    NEXT_PUBLIC_DOCS_URL=$NEXT_PUBLIC_DOCS_URL \
    NEXT_PUBLIC_REOWN_PROJECT_ID=$NEXT_PUBLIC_REOWN_PROJECT_ID

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/web/package.json apps/web/
RUN --mount=type=cache,id=hashi-pnpm-store,target=/pnpm/store \
    pnpm install --frozen-lockfile --filter "@hashi/web..."
COPY . .
RUN --mount=type=cache,id=hashi-next-cache,target=/repo/apps/web/.next/cache \
    pnpm --filter @hashi/web build

FROM node:24.11.1-bookworm-slim
# Coolify's health check runs curl; the slim image ships without it.
RUN apt-get update && apt-get install -y --no-install-recommends curl ca-certificates \
    && rm -rf /var/lib/apt/lists/*
ENV NODE_ENV=production HOSTNAME=0.0.0.0 PORT=3000 NEXT_TELEMETRY_DISABLED=1
WORKDIR /app
COPY --from=build --chown=node:node /repo/apps/web/.next/standalone ./
COPY --from=build --chown=node:node /repo/apps/web/.next/static ./apps/web/.next/static
COPY --from=build --chown=node:node /repo/apps/web/public ./apps/web/public
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD curl -fsS http://127.0.0.1:3000/api/health || exit 1
CMD ["node", "apps/web/server.js"]
