# Stage 1: Build the frontend
FROM node:20-alpine AS build

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install

COPY . .
RUN npm run build

# Stage 2: Serve with lightweight Express proxy
FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install --omit=dev && npm install express http-proxy-middleware

COPY server.js .
COPY --from=build /app/dist ./dist

CMD ["node", "server.js"]
