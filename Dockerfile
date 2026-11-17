FROM node:22-alpine AS build
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME=0.0.0.0
ENV PORT=3001
RUN addgroup -S raymer && adduser -S raymer -G raymer
COPY --from=build --chown=raymer:raymer /app/.next/standalone ./
COPY --from=build --chown=raymer:raymer /app/.next/static ./.next/static
COPY --from=build --chown=raymer:raymer /app/public ./public
USER raymer
EXPOSE 3001
CMD ["node", "server.js"]
