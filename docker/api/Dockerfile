FROM node:20-slim AS builder
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate
WORKDIR /app
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json turbo.json tsconfig.base.json ./
COPY packages/ packages/
COPY apps/functions/ apps/functions/
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @applyqueue/shared build
RUN pnpm --filter @applyqueue/functions build

FROM node:20-slim
WORKDIR /app
COPY --from=builder /app/apps/functions/dist ./dist
COPY --from=builder /app/apps/functions/package.json ./
COPY --from=builder /app/node_modules ./node_modules
EXPOSE 4000
CMD ["node", "dist/index.js"]
