# Frontend Dockerfile
FROM nginx:alpine

WORKDIR /usr/share/nginx/html

# Remove default nginx index page
RUN rm -rf ./*

# Copy frontend files
COPY . .

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
