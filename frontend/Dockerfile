FROM node:20-alpine AS dev

WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 3000
CMD ["npm", "run", "dev"]

# ---- Production build ----
FROM node:20-alpine AS build

ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM nginx:alpine AS prod
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf.template /etc/nginx/conf.d/nginx.conf.template

# Fallback so the image works without an explicit GATEWAY_URL (e.g. local docker run).
ENV GATEWAY_URL=http://localhost:8000

EXPOSE 8080
# envsubst replaces only ${GATEWAY_URL}, leaving nginx variables ($http_host etc.) intact.
CMD ["/bin/sh", "-c", "envsubst '${GATEWAY_URL}' < /etc/nginx/conf.d/nginx.conf.template > /etc/nginx/conf.d/default.conf && nginx -g 'daemon off;'"]
