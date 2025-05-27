# Stage 1: Install dependencies and build
FROM node:23 AS builder
WORKDIR /app

COPY package.json ./
RUN npm install

COPY . .
RUN npm run build

# Stage 2: Production image
FROM node:23 AS runner
WORKDIR /app

ENV NODE_ENV=production

# Copy built artifacts and dependencies
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY package.json ./

EXPOSE 3000
CMD ["npm", "run", "start"]
