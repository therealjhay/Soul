FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ARG VITE_API_URL
ARG VITE_SOLANA_CLUSTER
ARG VITE_IDENTITY_PROGRAM_ID
ARG VITE_SBT_PROGRAM_ID
ARG VITE_ATTESTATION_PROGRAM_ID
ARG VITE_RGP_PROGRAM_ID
RUN npm run build

FROM nginx:alpine@sha256:4d6076249216069904944d5c9795f9c6e3b2e5399589d9e4878a05e263c9b7e7 AS runner
# Copy built static files from the builder stage
COPY --from=builder /app/dist /usr/share/nginx/html
# SPA routing setup for nginx
RUN echo "server { listen 80; location / { root /usr/share/nginx/html; try_files \$uri \$uri/ /index.html; } }" > /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
