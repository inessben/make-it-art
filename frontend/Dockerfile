FROM node:22-alpine

WORKDIR /app

ARG NPM_REGISTRY=https://registry.npmjs.org

COPY package*.json ./

RUN npm config set registry ${NPM_REGISTRY} \
 && npm config set fetch-retries 6 \
 && npm config set fetch-retry-factor 2 \
 && npm config set fetch-retry-mintimeout 20000 \
 && npm config set fetch-retry-maxtimeout 120000 \
 && npm config set fetch-timeout 300000 \
 && i=1; until npm install --legacy-peer-deps --no-audit --no-fund; do \
      if [ "$i" -ge 5 ]; then echo "npm install failed after retries"; exit 1; fi; \
      echo "npm install failed, retry $i/5 in 10s"; \
      i=$((i+1)); \
      sleep 10; \
    done

COPY . .

EXPOSE 3000

CMD ["npm", "run", "dev"]
