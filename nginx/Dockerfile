FROM nginx:stable-alpine

# Remove a config default
RUN rm /etc/nginx/conf.d/default.conf

# Copia sua config personalizada se tiver
COPY nginx.conf /etc/nginx/conf.d/

# Copia o build do frontend para o Nginx
COPY .next /usr/share/nginx/html

# Expondo porta
EXPOSE 80

# Inicia o Nginx
CMD ["nginx", "-g", "daemon off;"]
