FROM node:26-bookworm

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev \
    && npx playwright install --with-deps chromium \
    && apt-get update \
    && apt-get install -y --no-install-recommends fluxbox novnc websockify x11vnc xvfb \
    && rm -rf /var/lib/apt/lists/*

COPY src ./src
COPY provider ./provider
COPY docker/entrypoint.sh ./docker/entrypoint.sh

RUN chmod 0755 ./docker/entrypoint.sh

ENV DISPLAY=:99 \
    BROWSER_CHANNEL=chromium \
    COMPANION_CONFIG=/data/companion.env \
    MOVIEBOXPRO_PROFILE=/data/movieboxpro-profile

VOLUME ["/data"]
EXPOSE 43110 6080

ENTRYPOINT ["./docker/entrypoint.sh"]
