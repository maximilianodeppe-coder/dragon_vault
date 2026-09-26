FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts
COPY nuxt.config.ts tsconfig.json ./
COPY app ./app
COPY public ./public
COPY data ./data
COPY server ./server
COPY scripts ./scripts
RUN npm run build

FROM build AS setup
CMD ["npm", "run", "db:migrate"]

FROM node:24-alpine
WORKDIR /app
ENV NODE_ENV=production HOST=0.0.0.0 PORT=3000
COPY --from=build --chown=node:node /app/.output ./.output
RUN mkdir -p /app/.data/card-images && chown -R node:node /app/.data
USER node
EXPOSE 3000
CMD ["node", ".output/server/index.mjs"]
