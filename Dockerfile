# Task Tracker API - Node.js + Express + PostgreSQL
FROM node:20-alpine

WORKDIR /app

# Copy package files first for better layer caching
COPY package.json ./

RUN npm install --omit=dev

COPY index.js schema.json ./
COPY public ./public

EXPOSE 3000

ENV NODE_ENV=production
ENV PORT=3000

USER node

CMD ["node", "index.js"]