FROM node:22-alpine

RUN apk add --no-cache postgresql16-client openssl && corepack enable

WORKDIR /repo
COPY . .
RUN pnpm install --frozen-lockfile --filter @hierarchy-hub/api... \
  && pnpm turbo run build --filter @hierarchy-hub/api...

ADD --chmod=644 https://truststore.pki.rds.amazonaws.com/global/global-bundle.pem /repo/rds-ca.pem

ENV NODE_ENV=production \
    PORT=3000 \
    DATABASE_SSL=verify-full \
    DATABASE_SSL_CA_FILE=/repo/rds-ca.pem

WORKDIR /repo/apps/api
USER node
EXPOSE 3000
ENTRYPOINT ["sh", "scripts/docker-entrypoint.sh"]
CMD ["api"]
