FROM atomist/sdm-base:0.2.0

COPY package.json package-lock.json ./

RUN npm ci \
    && npm cache clean --force

COPY . ./
