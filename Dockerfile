# Step 1: Build stage
FROM node:18-alpine AS build

# Set working directory
WORKDIR /app

# Copy package files first (better caching)
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the project files
COPY . .

# Fix OpenSSL 3 issue for Webpack builds
ENV NODE_OPTIONS=--openssl-legacy-provider

# Build the app
RUN npm run build

# Optional: Install build tools (if needed for dependencies)
RUN apk add --no-cache python3 make g++

# Step 2: Serve stage (small final image)
FROM node:18-alpine

# Install serve
RUN npm install -g serve

# Set working directory
WORKDIR /app

# Copy build output from build stage
COPY --from=build /app/build ./build

# Expose port
EXPOSE 3000

# Set environment variables
ENV PORT=3000

# Start the app
CMD ["serve", "-s", "build", "-l", "tcp://0.0.0.0:3000"]

