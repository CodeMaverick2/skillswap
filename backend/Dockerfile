# SkillSwap API — production image for Northflank / any container host
FROM node:20-alpine

WORKDIR /app

# Install production deps first (better layer caching)
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY . .

ENV NODE_ENV=production
ENV PORT=8080
EXPOSE 8080

# Northflank health checks hit this path
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD wget -qO- http://127.0.0.1:8080/api/health || exit 1

CMD ["npm", "start"]
