# syntax=docker/dockerfile:1

FROM node:16-alpine

ENV NODE_ENV=production

WORKDIR /app

COPY . .

RUN npm install

# Development
# CMD ["npm", "run", "test"]

# Production
RUN npm install -g pm2
CMD ["pm2-runtime","start","server.js"]

