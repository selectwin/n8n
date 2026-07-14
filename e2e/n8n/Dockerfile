# n8n with the locally packed n8n-nodes-selectwin installed as a community
# package (same load path as a real install: /home/node/.n8n/nodes).
# Build context must contain plugin.tgz — produced by `npm pack` (see e2e/run.ps1).
FROM n8nio/n8n:latest

COPY --chown=node:node plugin.tgz /tmp/plugin.tgz
USER node
RUN mkdir -p /home/node/.n8n/nodes \
  && cd /home/node/.n8n/nodes \
  && npm init -y >/dev/null 2>&1 \
  && npm install --omit=dev /tmp/plugin.tgz
