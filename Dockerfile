# syntax=docker/dockerfile:1

# ───────── build stage ─────────
FROM node:24-slim AS build
RUN corepack enable
WORKDIR /app

# Manifests first for layer caching. Native build scripts are gated by pnpm;
# `onlyBuiltDependencies` in pnpm-workspace.yaml allows better-sqlite3 to build.
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY web/package.json ./web/package.json
COPY mcp/package.json ./mcp/package.json
RUN pnpm install --frozen-lockfile

# Build the web app (produces .next/standalone with the native binary traced in).
COPY . .
RUN pnpm --filter ./web build

# ───────── runtime stage ─────────
# Debian/glibc base to match better-sqlite3's prebuilt binary (NOT alpine/musl).
FROM node:24-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production \
    PORT=8730 \
    HOSTNAME=0.0.0.0 \
    DATABASE_PATH=/data/post-plan.db
# Set PUBLIC_BASE_URL at run time to your public URL, e.g. https://planned.example.dev

# Standalone server + traced node_modules (includes better_sqlite3.node).
COPY --from=build /app/web/.next/standalone ./
# Static assets are NOT part of standalone — copy them next to server.js.
COPY --from=build /app/web/.next/static ./web/.next/static

VOLUME ["/data"]
EXPOSE 8730
# server.js lands at /app/web/server.js after copying the standalone contents.
CMD ["node", "web/server.js"]
