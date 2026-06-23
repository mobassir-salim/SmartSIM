FROM node:20-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

EXPOSE 5173

# Run Vite in dev mode exposing to host
CMD ["npm", "run", "dev", "--", "--host"]
