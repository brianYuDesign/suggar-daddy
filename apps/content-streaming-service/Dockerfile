FROM node:20-alpine

WORKDIR /app

# Install build dependencies
RUN apk add --no-cache python3 make g++

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY src ./src
COPY test ./test

# Build application
RUN npm run build

# Remove dev dependencies (optional for smaller image)
# RUN npm ci --only=production

EXPOSE 3001

CMD ["npm", "start"]
