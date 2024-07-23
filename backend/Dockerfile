# Dockerfile for backend

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

# Copy the .env file
COPY .env .env

# Expose the port used by the backend
EXPOSE 5000

# Run the backend server
CMD ["node", "server.js"]
