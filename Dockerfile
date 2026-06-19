# ─── Stage 1: Builder ─────────────────────────────────────────────────────────
# Cài đủ devDeps để compile TS + generate Prisma client
FROM node:22-alpine AS builder

WORKDIR /app

# Copy package files trước — layer này được cache nếu package.json không đổi
COPY package*.json ./
COPY prisma ./prisma/

RUN npm ci --legacy-peer-deps

# Generate Prisma client (cần schema.prisma + @prisma/client)
RUN npx prisma generate

# Copy source và compile
COPY tsconfig*.json nest-cli.json ./
COPY src ./src/

RUN npm run build

# ─── Stage 2: Runtime ─────────────────────────────────────────────────────────
# Chỉ giữ những gì cần để chạy — không có tsc, @types/*, source .ts
FROM node:22-alpine AS runtime

WORKDIR /app

ENV NODE_ENV=production
ENV PUPPETEER_SKIP_DOWNLOAD=true
ENV CHROME_BIN=/usr/bin/chromium-browser

# Cài Chromium từ Alpine package (không cần download qua puppeteer)
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont

# Cài chỉ production deps
COPY package*.json ./
RUN npm ci --omit=dev --legacy-peer-deps && npm cache clean --force

# Copy Prisma schema + config + generated client
COPY prisma ./prisma/
COPY prisma.config.js ./
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

# Copy compiled output
COPY --from=builder /app/dist ./dist

# Email templates (Handlebars — được copy bởi nest build nhờ assets config)
# nest-cli.json đã khai báo assets: routes/email/templates/**/*.hbs

EXPOSE 3003

# Chạy migrate trước khi start app
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main"]
