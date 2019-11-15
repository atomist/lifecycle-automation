FROM atomist/sdm-base:0.3.0

COPY package.json package-lock.json ./

RUN npm ci \
    && npm cache clean --force

COPY . ./

ENTRYPOINT ["dumb-init", "node", "--no-deprecation", "--trace-warnings", "--expose_gc", "--optimize_for_size", "--always_compact", "--max_old_space_size=512"]
CMD ["/sdm/node_modules/.bin/atm-start"]
