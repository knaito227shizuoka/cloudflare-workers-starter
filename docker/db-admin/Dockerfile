FROM node:24-bookworm-slim
WORKDIR /app
COPY source-db-admin/package*.json ./
RUN npm ci
EXPOSE 8080
CMD ["npm", "run", "dev", "--", "--ip", "0.0.0.0", "--port", "8080"]
