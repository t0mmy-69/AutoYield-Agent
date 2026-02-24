FROM node:20-alpine

# Install build tools required by better-sqlite3 (native module)
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Copy package files first for layer caching
COPY autoyield-agent/package.json autoyield-agent/package-lock.json* ./

# Install dependencies (built for linux/alpine)
RUN npm install

# Copy app source — .dockerignore excludes node_modules, .next, data, .env.local
COPY autoyield-agent/ .

# Build Next.js
RUN npm run build

EXPOSE 3000

# Use $PORT injected by Railway (fallback to 3000 locally)
CMD sh -c "node_modules/.bin/next start -p ${PORT:-3000}"
