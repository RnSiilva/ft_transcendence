FROM node:20-alpine

WORKDIR /app

COPY package*json ./
RUN npm install

COPY . .

EXPOSE 5173

# If NODE_ENV is production, build the static files and serve them using 'serve'.
# Otherwise, use the Vite dev server for hot-reloading.
CMD if [ "$NODE_ENV" = "production" ]; then \
      npm run build && npx serve -s dist -l 5173; \
    else \
      npm run dev; \
    fi