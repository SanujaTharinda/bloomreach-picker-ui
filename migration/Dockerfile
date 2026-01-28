# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (including devDependencies for build)
RUN npm ci

# Copy source code
COPY tsconfig.json ./
COPY src ./src

# Build the TypeScript project
RUN npm run build

# Stage 2: Production
FROM node:20-alpine AS production

WORKDIR /app

# Create non-root user for security
RUN addgroup -g 1001 -S migration && \
    adduser -S migration -u 1001 -G migration

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm ci --only=production && \
    npm cache clean --force

# Copy built files from builder stage
COPY --from=builder /app/dist ./dist

# Create directories for migration output and metadata config
RUN mkdir -p /app/migration-output && \
    mkdir -p /app/metadata-config && \
    chown -R migration:migration /app

# Switch to non-root user
USER migration

# Set default environment variables
ENV NODE_ENV=production
ENV MIGRATION_OUTPUT_DIR=/app/migration-output

# Default command (can be overridden)
ENTRYPOINT ["node", "dist/index.js"]

# Default script to show help
CMD ["--help"]

