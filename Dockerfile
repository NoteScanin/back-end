FROM node:20-alpine
WORKDIR /app
COPY package.json package-lock.json* ./
RUN apk add --no-cache python3 make g++
RUN npm install --production
COPY . .
EXPOSE 3000
CMD ["node", "src/server.js"]
