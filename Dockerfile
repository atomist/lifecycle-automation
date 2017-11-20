FROM node:8

ENV NPM_CONFIG_LOGLEVEL warn

# Create app directory
RUN mkdir -p /app
WORKDIR /app

# Install app dependencies
COPY package.json /app/
RUN npm install

# Bundle app source
COPY . /app

ENV SUPPRESS_NO_CONFIG_WARNING true

EXPOSE 2866

CMD [ "node", "--trace-warnings", "--expose_gc", "--optimize_for_size", "--always_compact", "--max_old_space_size=384", "build/src/start.client.js" ]

