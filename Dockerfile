# Stage 1: build frontend
FROM node:20-alpine AS frontend-builder
WORKDIR /app
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ .
RUN npm run build

# Stage 2: backend + frontend static files
FROM node:20-alpine AS runner
RUN apk add --no-cache python3 make g++

WORKDIR /app
COPY backend/package*.json ./
RUN NODE_OPTIONS="--max-old-space-size=1024" npm install --production --legacy-peer-deps

COPY backend/src ./src
COPY --from=frontend-builder /app/dist ./public

EXPOSE 3001
CMD ["node", "src/index.js"]
