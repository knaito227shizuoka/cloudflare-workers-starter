FROM node:24-bookworm-slim
WORKDIR /app
COPY source/package*.json ./
RUN npm ci
EXPOSE 8787
CMD ["npm", "run", "dev", "--", "--ip", "0.0.0.0", "--port", "8787"]
