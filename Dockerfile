# ---------- Build stage ----------
FROM node:20-alpine AS build
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install

COPY . .
RUN npm run build

# ---------- Runtime stage ----------
FROM pierrezemb/gostatic
EXPOSE 8080

COPY --from=build /app/dist /srv/http

# No -host flag (not supported)
CMD ["-port", "8080", "-enable-logging"]
