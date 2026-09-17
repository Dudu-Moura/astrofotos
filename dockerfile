#==============BUILD=================#
FROM node:24-alpine as build

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm install

COPY . .
RUN npm run build

#=============DEV ENV==============#
FROM node:24-alpine as dev
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm install
COPY . .
RUN mkdir -p /app/.uploads && chown -R node:node /app
USER node
CMD ["npm", "run", "dev"]

#===============PROD ENV==========#
FROM node:24-alpine as final
WORKDIR /app

COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules

RUN mkdir -p /app/.uploads && chown -R node:node /app
USER node

EXPOSE 3000

CMD ["node", "dist/main.js"]
