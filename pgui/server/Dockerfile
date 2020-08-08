FROM node:14

RUN yarn global add typescript

WORKDIR /app
ADD server/package.json ./server/
ADD server/yarn.lock ./server/
RUN cd server && yarn install

ADD ./server/tsconfig.json ./server/src ./server/
RUN cd server && yarn build
ADD ./client ./client

WORKDIR /app/server

CMD ["yarn", "start"]