# syntax=docker/dockerfile:1
# Production image for the NestJS API. Build from the repository root:
#   docker build -f apps/api/Dockerfile -t rea-api .
FROM node:22-bookworm-slim AS base
ENV PNPM_HOME=/pnpm PATH=/pnpm:$PATH
RUN corepack enable && apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /repo

FROM base AS build
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/api/package.json apps/api/
COPY packages/shared-types/package.json packages/shared-types/
COPY packages/typescript-config/package.json packages/typescript-config/
COPY packages/eslint-config/package.json packages/eslint-config/
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile --ignore-scripts
COPY packages packages
COPY prisma prisma
COPY apps/api apps/api
RUN pnpm --filter @rea/shared-types build \
 && pnpm --filter @rea/api exec prisma generate \
 && pnpm --filter @rea/api build \
 && pnpm --filter @rea/api deploy --prod --legacy /out

FROM base AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build /out ./
COPY --from=build /repo/apps/api/dist ./dist
COPY --from=build /repo/apps/api/src/generated ./src/generated
COPY --from=build /repo/prisma /prisma
USER node
EXPOSE 4000
CMD ["node", "dist/main.js"]
