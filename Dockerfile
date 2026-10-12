FROM node:24-bookworm-slim AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci --no-audit --no-fund
COPY . .
RUN npm run build
FROM node:24-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production HOST=0.0.0.0 PORT=4311
COPY --from=build /app/dist/client ./dist/client
COPY --from=build /app/server ./server
COPY --from=build /app/src/distance.js ./src/distance.js
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/resources ./resources
COPY --from=build /app/public/transit.json ./public/transit.json
RUN mkdir data && chown -R node:node /app
USER node
VOLUME ["/app/data"]
EXPOSE 4311
CMD ["node", "server/index.mjs"]
