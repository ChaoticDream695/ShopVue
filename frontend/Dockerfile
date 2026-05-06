# ---- Build stage ----
FROM node:20-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# ---- Serve stage ----
FROM nginx:stable-alpine

# Install envsubst (part of gettext) to process env vars in nginx config
RUN apk add --no-cache gettext

COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx template — we'll substitute $BACKEND_URL at runtime
COPY nginx.conf /etc/nginx/templates/default.conf.template

EXPOSE 80

# envsubst replaces $BACKEND_URL in the template before nginx starts
CMD ["/bin/sh", "-c", "envsubst '$BACKEND_URL' < /etc/nginx/templates/default.conf.template > /etc/nginx/conf.d/default.conf && nginx -g 'daemon off;'"]
