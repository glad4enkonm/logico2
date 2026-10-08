# Logico2 — single production image (MCP spec §2, step 4).
#
# Stage 1: parcel build of the frontend.
# Stage 2: FastAPI serving the built bundle via StaticFiles at / plus the
#          multi-graph API, /graphs static JSON, /healthz.
#
# Run (uvicorn MUST stay single-worker: all state is in-process):
#   docker build -t logico2 .
#   docker run -p 127.0.0.1:8000:8000 -v logico2-data:/data logico2
#
# Env:
#   LOGICO_DATA_DIR      default /data       (graphs live in $DIR/graphs)
#   LOGICO_GRAPHS_DIR    default /data/graphs
#   LOGICO_FRONT_DIST    default /app/front_dist
#   LOGICO_ENABLE_EMBEDDINGS / LOGICO_ENABLE_NEO4J  default 1 (set 0 to gate off)

FROM node:22-bookworm-slim AS front-build
# (NOT node:22-alpine: the `canvas` devDep has no prebuilt musl binaries —
# it would fall back to a node-gyp source build needing python+make+gcc.)
WORKDIR /build
COPY front/package.json front/yarn.lock ./
RUN yarn install --frozen-lockfile
COPY front/public ./public
COPY front/src ./src
COPY front/babel.config.json front/jest.config.js ./
COPY front/prompt ./prompt
RUN yarn build

FROM python:3.13-alpine
WORKDIR /app

COPY back/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY back/ ./
COPY --from=front-build /build/dist ./front_dist

ENV LOGICO_GRAPHS_DIR=/data/graphs \
    LOGICO_FRONT_DIST=/app/front_dist \
    PYTHONUNBUFFERED=1

# /data/graphs is the persisted graph registry (write-through, atomic saves)
VOLUME ["/data"]

EXPOSE 8000

# --workers 1 is mandatory: graph state lives in this one process (spec §2)
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1"]
