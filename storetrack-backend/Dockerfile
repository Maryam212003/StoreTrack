# Backend Dockerfile
FROM node:20

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy backend source code
COPY . .

# Install Prisma CLI
RUN npm install prisma --save-dev

# Ensure Prisma generates client
RUN npx prisma generate

# Expose the backend port
EXPOSE 5000

# Start command (runs migrations, then starts server)
CMD npx prisma migrate deploy && node src/server.js
