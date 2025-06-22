
FROM node:20-alpine

# Set the working directory to /app
WORKDIR /app

# Copy the package.json and package-lock.json (or yarn.lock or pnpm-lock.yaml)
COPY package*.json ./
# If you are using yarn, uncomment the next line
# COPY yarn.lock ./
# If you are using pnpm, uncomment the next line
# COPY pnpm-lock.yaml ./


# Install dependencies
# Choose the command corresponding to your package manager
RUN npm install
# RUN yarn install
# RUN pnpm install

# Copy the rest of the application code
COPY . .

# Build the Next.js application
RUN npm run build

# Expose port 3000 (default for Next.js)
EXPOSE 3000

# Command to start the Next.js application in production mode
CMD [ "npm", "start" ]
# Note: For production deployment, ensure your API proxy in next.config.js
# is configured to point to the server container's address and port.
# Example: destination: 'http://server-container-name:8000/api/extract-bmps-py'
# This might be managed via environment variables in your deployment setup.