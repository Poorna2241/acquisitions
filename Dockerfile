FROM node:22-bookworm-slim AS base

WORKDIR /app
COPY package*.json ./

FROM base AS development

RUN npm ci
COPY . .

EXPOSE 3000
CMD ["npm", "run", "dev"]

FROM base AS production

ENV NODE_ENV=production
RUN npm ci --omit=dev
COPY --chown=node:node . .

USER node
EXPOSE 3000
CMD ["npm", "start"]
