# Stage 1: Build the Angular application
FROM node:20-alpine AS build

# Set the working directory
WORKDIR /app

# Copy package.json and package-lock.json to install dependencies
COPY package*.json ./

# Install dependencies, ensuring compatibility
RUN npm install --legacy-peer-deps

# Copy the rest of the application code
COPY . .

# Build the application for production
RUN npm run build -- --output-path ./dist --configuration production

# Stage 2: Serve the application with Nginx
# =========================================
FROM nginx:alpine

# Copy the build output from the first stage into Nginx's web root
COPY --from=build /app/dist/frontend-angular/browser /usr/share/nginx/html

# Expose the web server port
EXPOSE 80