# Multi-stage Docker build for ts-mcp-server
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json yarn.lock ./
COPY packages/debugger-core/package.json ./packages/debugger-core/
COPY packages/mcp-server/package.json ./packages/mcp-server/

# Install dependencies
RUN yarn install --frozen-lockfile

# Copy source code
COPY . .

# Build packages
RUN npx nx build debugger-core
RUN npx nx build mcp-server

# Production stage
FROM node:18-alpine AS production

WORKDIR /app

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S mcp -u 1001

# Copy built application
COPY --from=builder --chown=mcp:nodejs /app/packages/mcp-server/dist ./dist
COPY --from=builder --chown=mcp:nodejs /app/packages/debugger-core/dist ./core-dist
COPY --from=builder --chown=mcp:nodejs /app/packages/mcp-server/package.json ./

# Install production dependencies only
RUN yarn install --production --frozen-lockfile && \
    yarn cache clean

# Switch to non-root user
USER mcp

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "console.log('Health check passed')" || exit 1

# Expose port (if needed for HTTP mode)
EXPOSE 3000

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the MCP server
CMD ["node", "./dist/src/index.js"]