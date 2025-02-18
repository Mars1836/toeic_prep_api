FROM node:18-alpine

RUN apk add --no-cache \
    mongodb-tools \
    gzip \
    tar

WORKDIR /app

RUN mkdir /backups && chown node:node /backups

COPY package.json .

RUN npm install

COPY . .

CMD ["npm", "run", "start:docker"]
