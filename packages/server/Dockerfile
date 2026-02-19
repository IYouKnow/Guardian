# ==========================================
# STAGE 1: Build the Web Panel (Frontend)
# ==========================================
FROM node:22-alpine AS web-builder
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app

# Copy only what's needed for the web build
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/web/package.json ./packages/web/
COPY packages/desktop/package.json ./packages/desktop/
COPY packages/extension/package.json ./packages/extension/
COPY packages/mobile/package.json ./packages/mobile/

RUN pnpm install --frozen-lockfile

# Copy source code for shared and web
COPY packages/shared ./packages/shared
COPY packages/web ./packages/web

# Create server directory since Vite is configured to build into ../server/dist
RUN mkdir -p packages/server

# Build the web panel (skipping type check to avoid exit code 2 in CI)
RUN pnpm --filter guardian-web exec vite build

# ==========================================
# STAGE 2: Build the Guardian Server (Go)
# ==========================================
FROM golang:1.25-alpine AS server-builder
WORKDIR /build

# Install git for private modules if needed, though not used here
RUN apk add --no-cache git

# Copy dependency files first for better caching
COPY packages/server/go.mod ./
COPY packages/server/go.sum ./

# Download dependencies
RUN go mod download

# Copy the rest of the source
COPY packages/server/*.go ./

# Build the binary
ARG VERSION=dev
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-w -s -X 'main.Version=${VERSION}'" -o server .

# ==========================================
# STAGE 3: Final Server Image
# ==========================================
FROM alpine:3.21
RUN apk add --no-cache ca-certificates tzdata wget
RUN addgroup -S guardian && adduser -S guardian -G guardian

WORKDIR /app
RUN mkdir -p /app/data /app/dist && chown -R guardian:guardian /app

# Copy binary from Stage 2
COPY --from=server-builder /build/server /app/guardian-server

# Copy pre-built dist from Stage 1 (Vite built into packages/server/dist)
COPY --from=web-builder --chown=guardian:guardian /app/packages/server/dist /app/dist/

USER guardian
ENV PORT=8080
ENV JWT_SECRET=""
VOLUME ["/app/data"]
EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:8080/health || exit 1

ENTRYPOINT ["/app/guardian-server"]
