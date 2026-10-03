# City Shield API. Build from the REPOSITORY ROOT (the API imports ../shared):
#   docker build -f api/Dockerfile -t cityshield-api .
FROM node:24-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY api/package.json api/
RUN npm ci --omit=dev --workspace api --no-audit --no-fund

FROM node:24-bookworm-slim
ENV NODE_ENV=production HOST=0.0.0.0 PORT=8787 UPLOAD_DIR=/data/uploads
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY package.json ./
COPY shared ./shared
COPY api/package.json api/tsconfig.json ./api/
COPY api/src ./api/src
COPY api/drizzle ./api/drizzle
RUN mkdir -p /data/uploads && chown -R node:node /data
USER node
EXPOSE 8787
HEALTHCHECK --interval=15s --timeout=5s --start-period=40s --retries=5 \
  CMD node -e "fetch('http://127.0.0.1:8787/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "--import", "tsx", "api/src/server.ts"]
