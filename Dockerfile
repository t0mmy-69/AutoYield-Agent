FROM node:20-alpine

WORKDIR /app

COPY autoyield-agent/package.json autoyield-agent/package-lock.json* ./
RUN npm install

COPY autoyield-agent/ .

RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
