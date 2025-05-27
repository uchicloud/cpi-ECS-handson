# Stage 1: build the TypeScript sources
FROM node:23 AS builder

WORKDIR /app

# Install dependencies
COPY package.json package-lock.json tsconfig.json ./
RUN npm ci

# Copy source and compile
COPY src ./src
RUN npm run build

# Stage 2: create production image
FROM node:23-alpine AS production

WORKDIR /app

# Only install production dependencies
COPY package.json ./
RUN npm install --only=production

# Copy compiled output
COPY --from=builder /app/dist ./dist

# Expose application port
ENV NODE_ENV=production
EXPOSE 3000

# Run the server
CMD ["node", "dist/server.js"]
