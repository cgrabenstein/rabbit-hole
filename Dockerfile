# ── Build stage ──
FROM node:22-alpine AS build
ARG VITE_COMMIT_HASH=dev
ENV VITE_COMMIT_HASH=$VITE_COMMIT_HASH

WORKDIR /app

# Install deps first (leverages Docker layer caching)
COPY package*.json ./
RUN npm ci

# Copy source and build
COPY . .
RUN npm run build

# ── Runtime stage ──
FROM node:22-alpine
WORKDIR /app

# Install production deps only (jsdom, readability, etc.)
COPY package*.json ./
RUN npm ci --production --ignore-scripts

# Copy built frontend
COPY --from=build /app/dist ./dist

# Copy production server
COPY server/ ./server/

EXPOSE 3000
ENV PORT=3000

CMD ["node", "server/index.mjs"]
