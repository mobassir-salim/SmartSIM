# Stage 1: Build React/Vite app
FROM node:20-alpine AS build

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

RUN npm run build

# Stage 2: Serve static files with Nginx
FROM nginx:alpine

# Copy built static files to Nginx's html folder
COPY --from=build /app/dist /usr/share/nginx/html

# Expose port 5173 to match existing compose and gateway setups
EXPOSE 5173

# Configure Nginx to listen on port 5173 and handle React Router fallback
COPY nginx.conf /etc/nginx/conf.d/default.conf

CMD ["nginx", "-g", "daemon off;"]
