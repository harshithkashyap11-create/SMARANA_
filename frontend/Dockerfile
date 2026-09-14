FROM node:20-alpine

RUN addgroup -S smarana \
    && adduser -S smarana -G smarana

WORKDIR /app

RUN chown smarana:smarana /app

USER smarana

COPY --chown=smarana:smarana package.json package-lock.json ./
RUN npm ci

COPY --chown=smarana:smarana . .

EXPOSE 5173

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
