FROM node:20-alpine AS deps

WORKDIR /app
COPY package*.json ./
RUN npm ci

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
COPY package*.json ./
COPY --from=builder /app/dist ./dist
COPY --from=deps /app/node_modules ./node_modules

ENV NODE_ENV=production
RUN npm prune --omit=dev
CMD ["node", "dist/index.js"]
