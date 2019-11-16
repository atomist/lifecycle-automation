FROM atomist/sdm-base:0.2.0

COPY package.json package-lock.json ./

RUN npm ci --no-optional \
    && npm cache clean --force

COPY . ./

ENTRYPOINT ["dumb-init", "node", "--no-deprecation", "--trace-warnings", "--expose_gc", "--optimize_for_size", "--always_compact", "--max_old_space_size=512"]
CMD ["/sdm/node_modules/.bin/atm-start"]

########################## Memory debugging ##########################
# Install gcore
RUN apt-get update && apt-get install -y \
        gdb \
        lldb \
    && rm -rf /var/lib/apt/lists/*

# Enable gcore for now
RUN echo "kernel.yama.ptrace_scope = 0" >/etc/sysctl.d/10-ptrace.conf
