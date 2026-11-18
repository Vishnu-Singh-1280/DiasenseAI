FROM node:22-slim AS builder

WORKDIR /app

RUN npm install -g pnpm@10

COPY package.json pnpm-lock.yaml ./
RUN pnpm install

COPY . .
RUN pnpm build

FROM node:22-slim AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV HOST=0.0.0.0

RUN npm install -g pnpm@10

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --prod

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/ml ./ml
COPY --from=builder /app/drizzle ./drizzle
COPY --from=builder /app/drizzle.config.ts ./drizzle.config.ts

EXPOSE 3000

CMD ["node", "dist/index.js"]
