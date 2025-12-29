# ---------- Build stage ----------
FROM node:20-alpine AS build
WORKDIR /app

# Install deps first for better caching
COPY package.json package-lock.json* ./
RUN npm install

# Build
COPY . .
RUN npm run build


# ---------- Runtime stage ----------
FROM pierrezemb/gostatic

# Fly expects your app to listen on 8080 by default
EXPOSE 8080

# Serve the compiled static site
COPY --from=build /app/dist /srv/http

# Bind to 0.0.0.0 so Fly can reach it
CMD ["-port", "8080", "-host", "0.0.0.0", "-enable-logging"]
