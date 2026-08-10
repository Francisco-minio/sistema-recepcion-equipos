FROM node:22-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
COPY frontend/package.json frontend/package.json
RUN npm install

COPY frontend ./frontend
WORKDIR /app/frontend
RUN npm run build

FROM nginx:1.27-alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/frontend/dist /usr/share/nginx/html

EXPOSE 80
