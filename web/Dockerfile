# Pinned LTS. This was node:latest, which silently moved the app onto newer
# Node majors at each rebuild (Node >= 15 made unhandled rejections fatal).
FROM node:22-alpine

WORKDIR /usr/src/app
ENV NODE_ENV=production

# Install exactly what the lockfile says, without dev dependencies.
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --chown=node:node . .

# Must match the port Express listens on (PORT, default 3000).
EXPOSE 3000
USER node
CMD ["node", "app.js"]
