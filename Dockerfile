ARG NODE_VERSION=20.16
ARG ALPINE_VERSION=3.20
ARG NODE_ENV=production
ARG UID=1000
ARG GID=1000

### Installing only production dependencies for the final image
FROM node:${NODE_VERSION}-alpine${ALPINE_VERSION} AS prod-deps
WORKDIR /prod-deps
COPY package*.json ./
RUN npm ci --omit=dev

### Building the project
FROM node:${NODE_VERSION}-alpine${ALPINE_VERSION} AS builder
WORKDIR /build-stage
COPY package*.json ./
RUN npm i --include=dev
COPY . ./
RUN npm run build

### Final image
FROM alpine:${ALPINE_VERSION}
ARG NODE_ENV
ARG UID
ARG GID

LABEL org.opencontainers.image.source=https://github.com/selim13/redirects-monitor
LABEL org.opencontainers.image.description="A website redirects monitoring tool"
LABEL org.opencontainers.image.licenses=ISC

WORKDIR /home/node/app
RUN apk add --no-cache libstdc++ chromium \
  && addgroup -g ${GID} node \
  && adduser -u ${UID} -G node -s /bin/sh -D node \
  && chown node:node .

COPY --from=builder /usr/local/bin/node /usr/local/bin/
COPY --from=builder /usr/local/bin/docker-entrypoint.sh /usr/local/bin/

COPY --from=prod-deps --chown=node:node /prod-deps/node_modules /home/node/app/node_modules
COPY --from=builder --chown=node:node /build-stage/build /home/node/app/build

ENV NODE_ENV=$NODE_ENV \
  PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

USER node

ENTRYPOINT ["node", "/home/node/app/build/index.js"]
CMD ["--config", "/home/node/app/config/config.yml"]