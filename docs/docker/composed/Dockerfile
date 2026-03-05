# ---- build stage ----
FROM node:22-bookworm-slim AS build
WORKDIR /app

ENV HUSKY=0
ENV CI=true

RUN corepack enable && corepack prepare pnpm@9.15.9 --activate

RUN apt-get update && apt-get install -y --no-install-recommends git \
  && rm -rf /var/lib/apt/lists/*

ARG VITE_PUBLIC_APP_URL
ENV VITE_PUBLIC_APP_URL=${VITE_PUBLIC_APP_URL}

COPY package.json pnpm-lock.yaml* ./
RUN pnpm fetch

COPY . .
RUN pnpm install --no-frozen-lockfile
RUN NODE_OPTIONS=--max-old-space-size=4096 pnpm run build


# ---- production dependencies stage ----
FROM build AS prod-deps
RUN pnpm prune --prod --ignore-scripts


# ---- production stage ----
FROM prod-deps AS bolt2-dyi-production
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=5173
ENV HOST=0.0.0.0

ARG VITE_LOG_LEVEL=debug
ARG DEFAULT_NUM_CTX

ENV VITE_LOG_LEVEL=${VITE_LOG_LEVEL} \
    DEFAULT_NUM_CTX=${DEFAULT_NUM_CTX} \
    RUNNING_IN_DOCKER=true

RUN apt-get update && apt-get install -y --no-install-recommends curl \
  && rm -rf /var/lib/apt/lists/*

COPY --from=prod-deps /app/build /app/build
COPY --from=prod-deps /app/node_modules /app/node_modules
COPY --from=prod-deps /app/package.json /app/package.json

EXPOSE 5173

HEALTHCHECK --interval=10s --timeout=3s --start-period=5s --retries=5 \
  CMD curl -fsS http://localhost:5173/ || exit 1

CMD ["sh", "-lc", "PORT=${PORT:-5173} HOST=${HOST:-0.0.0.0} pnpm exec remix-serve build/server/index.js"]


# ---- development stage ----
FROM build AS development

ARG VITE_LOG_LEVEL=debug
ARG DEFAULT_NUM_CTX

ENV VITE_LOG_LEVEL=${VITE_LOG_LEVEL} \
    DEFAULT_NUM_CTX=${DEFAULT_NUM_CTX} \
    RUNNING_IN_DOCKER=true

RUN mkdir -p /app/run
CMD ["pnpm", "run", "dev", "--host"]
