FROM node:20-slim

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

# Data dir for SQLite (Fly.io mounts volume at /data)
RUN mkdir -p /data

EXPOSE 3001
CMD ["node", "scripts/start.js"]
