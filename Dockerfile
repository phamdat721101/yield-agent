FROM node:20-slim AS base
WORKDIR /app

# Install dependencies first (cache layer)
COPY agent/package.json agent/package-lock.json* ./agent/
COPY package.json package-lock.json* ./
RUN cd agent && npm install --production

# Copy agent source
COPY agent/ ./agent/

EXPOSE 18789

WORKDIR /app/agent
CMD ["npx", "tsx", "gateway/server.ts"]
