# City Shield web app: built once, served by Caddy, which also forwards API paths
# to the api service, so the browser only ever talks to one origin.
# Build from the REPOSITORY ROOT:  docker build -f web/Dockerfile -t cityshield2-web .
FROM node:24-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY api/package.json api/
RUN npm ci --workspaces=false --no-audit --no-fund
COPY . .
ARG SITE_URL=https://cityshield.live/
ARG VITE_RELEASE=local
# Empty VITE_API_BASE = same origin: /v1/... and /health go to this host.
ENV BASE_PATH=/ VITE_API_BASE= SITE_URL=${SITE_URL} VITE_RELEASE=${VITE_RELEASE}
RUN npm run build

FROM caddy:2-alpine
COPY web/Caddyfile /etc/caddy/Caddyfile
COPY --from=build /app/dist /srv
