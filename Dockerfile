# ---------------------------------------------------------------------------
# Build stage — install deps and build all packages
# ---------------------------------------------------------------------------
FROM registry.access.redhat.com/ubi9/nodejs-22:latest AS build

USER 0

WORKDIR /opt/app-root/src

# Copy package manifests first for layer caching
COPY package*.json ./
COPY packages/common/package.json packages/common/
COPY packages/build-utils/package.json packages/build-utils/
COPY packages/mock-servers/package.json packages/mock-servers/
COPY packages/mock-ui-plugins/package.json packages/mock-ui-plugins/
COPY packages/mock-cli-plugins/package.json packages/mock-cli-plugins/
COPY packages/gui/package.json packages/gui/
COPY packages/cli/package.json packages/cli/

# Install build tools needed for native addons (better-sqlite3)
RUN dnf install -y python3 make gcc g++ && dnf clean all

RUN npm i

# Copy all source
COPY . .

# Build shared packages first, then the rest
RUN npm run build -w packages/common && \
    npm run build -w packages/build-utils && \
    npm run build -w packages/mock-ui-plugins && \
    npm run build -w packages/mock-cli-plugins && \
    npm run build -w packages/gui

# build-utils uses main:"src/index.ts" locally (via tsconfig paths);
# in Docker we need the compiled CJS output instead.
RUN node -e "const p=require('./packages/build-utils/package.json');p.main='dist/index.js';require('fs').writeFileSync('./packages/build-utils/package.json',JSON.stringify(p,null,2))"

# Fix ownership for downstream stages running as non-root
RUN chown -R 1001:0 /opt/app-root/src

# ---------------------------------------------------------------------------
# mock-servers — API on port 4000
# ---------------------------------------------------------------------------
FROM registry.access.redhat.com/ubi9/nodejs-22-minimal:latest AS mock-servers

WORKDIR /opt/app-root/src

# Copy the full monorepo layout so relative paths to plugin registries resolve
COPY --from=build --chown=1001:0 /opt/app-root/src/node_modules ./node_modules
COPY --from=build --chown=1001:0 /opt/app-root/src/package.json ./
COPY --from=build --chown=1001:0 /opt/app-root/src/tsconfig.json ./

# common (compiled)
COPY --from=build --chown=1001:0 /opt/app-root/src/packages/common/package.json packages/common/
COPY --from=build --chown=1001:0 /opt/app-root/src/packages/common/dist packages/common/dist

# mock-servers source + deps (runs via ts-node, so we need source)
COPY --from=build --chown=1001:0 /opt/app-root/src/packages/mock-servers packages/mock-servers

# Plugin registry files (mock-servers watches these via relative paths)
COPY --from=build --chown=1001:0 /opt/app-root/src/packages/mock-ui-plugins/dist/plugin-registry.json packages/mock-ui-plugins/dist/plugin-registry.json
COPY --from=build --chown=1001:0 /opt/app-root/src/packages/mock-cli-plugins/dist/cli-plugin-registry.json packages/mock-cli-plugins/dist/cli-plugin-registry.json

USER 1001

EXPOSE 4000

CMD ["npm", "run", "start", "-w", "packages/mock-servers"]

# ---------------------------------------------------------------------------
# mock-ui-plugins — static assets on port 8001
# ---------------------------------------------------------------------------
FROM registry.access.redhat.com/ubi9/nodejs-22-minimal:latest AS mock-ui-plugins

USER 0
RUN npm install -g http-server
USER 1001

WORKDIR /opt/app-root/src

COPY --from=build --chown=1001:0 /opt/app-root/src/packages/mock-ui-plugins/dist ./dist

EXPOSE 8001

CMD ["http-server", "dist", "-p", "8001", "-c-1", "--cors=*"]

# ---------------------------------------------------------------------------
# mock-cli-plugins — static assets on port 8002
# ---------------------------------------------------------------------------
FROM registry.access.redhat.com/ubi9/nodejs-22-minimal:latest AS mock-cli-plugins

USER 0
RUN npm install -g http-server
USER 1001

WORKDIR /opt/app-root/src

COPY --from=build --chown=1001:0 /opt/app-root/src/packages/mock-cli-plugins/dist ./dist

EXPOSE 8002

CMD ["http-server", "dist", "-p", "8002", "-c-1", "--cors=*"]

# ---------------------------------------------------------------------------
# mock-ui-plugins-dev — watch + serve with source mounts for live reload
# ---------------------------------------------------------------------------
FROM registry.access.redhat.com/ubi9/nodejs-22:latest AS mock-ui-plugins-dev

WORKDIR /opt/app-root/src

COPY --from=build --chown=1001:0 /opt/app-root/src/node_modules ./node_modules
COPY --from=build --chown=1001:0 /opt/app-root/src/package.json ./
COPY --from=build --chown=1001:0 /opt/app-root/src/tsconfig.json ./

COPY --from=build --chown=1001:0 /opt/app-root/src/packages/common packages/common
COPY --from=build --chown=1001:0 /opt/app-root/src/packages/build-utils packages/build-utils
COPY --from=build --chown=1001:0 /opt/app-root/src/packages/mock-ui-plugins packages/mock-ui-plugins

USER 1001

EXPOSE 8001

CMD ["npm", "run", "serve", "-w", "packages/mock-ui-plugins"]

# ---------------------------------------------------------------------------
# gui — webpack dev server on port 3000
# ---------------------------------------------------------------------------
FROM registry.access.redhat.com/ubi9/nodejs-22:latest AS gui

WORKDIR /opt/app-root/src

COPY --from=build --chown=1001:0 /opt/app-root/src/node_modules ./node_modules
COPY --from=build --chown=1001:0 /opt/app-root/src/package.json ./
COPY --from=build --chown=1001:0 /opt/app-root/src/tsconfig.json ./

COPY --from=build --chown=1001:0 /opt/app-root/src/packages/common packages/common
COPY --from=build --chown=1001:0 /opt/app-root/src/packages/build-utils packages/build-utils
COPY --from=build --chown=1001:0 /opt/app-root/src/packages/gui packages/gui

USER 1001

WORKDIR /opt/app-root/src

EXPOSE 3000

CMD ["npm", "run", "serve", "-w", "packages/gui"]
