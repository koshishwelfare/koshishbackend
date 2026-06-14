# Use the Node version required by package.json.
FROM node:22-bookworm-slim

# Set working directory
WORKDIR /usr/src/app

# Copy package files first for layer caching
COPY package*.json ./

# Install dependencies
RUN npm ci --omit=dev

# Copy rest of the application code
COPY . .

# Render injects PORT at runtime. EXPOSE is documentation only.
EXPOSE 5000

CMD ["npm", "start"]
