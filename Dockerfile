FROM node:20-alpine AS frontend-build

WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

FROM node:20-alpine

WORKDIR /app
COPY backend/package.json backend/package-lock.json ./
RUN npm ci --omit=dev
COPY backend/src/ ./src/
COPY backend/scripts/ ./scripts/
COPY --from=frontend-build /app/frontend/dist ./frontend-dist/
COPY institutional/ ./institutional/

ENV NODE_ENV=production
ENV PORT=8080

# Adjust static paths for production
RUN sed -i 's|../../frontend/dist|../frontend-dist|g' ./src/index.js
RUN sed -i 's|../../institutional|../institutional|g' ./src/index.js

EXPOSE 8080
CMD ["node", "src/index.js"]
