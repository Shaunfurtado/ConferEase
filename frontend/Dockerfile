# Dockerfile for frontend

# Use the official Node.js 18 image
FROM node:18

# Set the working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application
COPY . .

# Expose the port used by Vite
EXPOSE 5174

# Start the Vite development server
CMD ["npm", "run", "dev"]
