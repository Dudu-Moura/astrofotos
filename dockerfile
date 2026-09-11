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
CMD ["npm", "run", "dev"]

#===============PROD ENV==========#
FROM node:24-alpine as final
WORKDIR /app

COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules

EXPOSE 3000

CMD ["node", "dist/main.js"]