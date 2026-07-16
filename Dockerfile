# Fallback build path for hosts that don't auto-detect Node.js via buildpacks
# (Northflank, and most container-based platforms, can build from this directly).
# Not needed to run the app locally — `node server.js` is all that's required there.

FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev

COPY . .

EXPOSE 3000

CMD ["node", "server.js"]
