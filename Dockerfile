# Multi-stage build for production optimization
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install ALL dependencies (including devDependencies for build)
# Unset NODE_ENV to ensure devDependencies are installed
RUN NODE_ENV=development npm ci && npm cache clean --force

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM node:18-alpine AS production

# Create app directory
WORKDIR /app

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001

# Copy package files
COPY --from=builder --chown=nestjs:nodejs /app/package*.json ./

# Install only production dependencies (as root, then change ownership)
RUN npm ci --omit=dev && npm cache clean --force

# Copy built application
COPY --from=builder --chown=nestjs:nodejs /app/dist ./dist

# Create logs directory and change ownership
RUN mkdir -p logs && chown -R nestjs:nodejs /app

# Set NODE_ENV to production
ENV NODE_ENV=production

# Switch to non-root user
USER nestjs

# Expose health check (optional, for monitoring)
# Note: This is a consumer app, no HTTP port needed

# Start the application
CMD ["node", "dist/main.js"]
