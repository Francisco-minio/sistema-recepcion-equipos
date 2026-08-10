FROM node:22-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
COPY backend/package.json backend/package.json
RUN npm install

COPY backend ./backend
WORKDIR /app/backend
RUN npx prisma generate
RUN npm run build

FROM node:22-alpine

WORKDIR /app
RUN apk add --no-cache sqlite tzdata

COPY --from=builder /app/node_modules /app/node_modules
COPY --from=builder /app/backend/dist /app/dist
COPY --from=builder /app/backend/prisma /app/prisma
COPY --from=builder /app/backend/start.sh /app/start.sh
COPY --from=builder /app/backend/package.json /app/package.json

RUN chmod +x /app/start.sh

ENV NODE_ENV=production
ENV PORT=4000
ENV DATABASE_URL=file:/app/data/servicehub.db
ENV FRONTEND_URL=http://localhost:8080
ENV JWT_SECRET=servicehub-docker-secret
ENV MS_REDIRECT_URI=http://localhost:8080/api/integrations/microsoft/callback
ENV TZ=America/Santiago

EXPOSE 4000

CMD ["/app/start.sh"]
