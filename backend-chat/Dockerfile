FROM node:23-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

# Expose port 5200 (as specified in docker-compose.yml)
EXPOSE 5200

# Start the application
CMD ["npm", "start"]