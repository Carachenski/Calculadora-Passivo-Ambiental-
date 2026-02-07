# Etapa 1: Build do Next.js
FROM node:18-alpine AS build

WORKDIR /app

# Copia package.json e instala dependências
COPY package*.json ./
RUN npm install --legacy-peer-deps

# Copia o restante do projeto e faz build
COPY . .
RUN npm run build  # gera build
# Next.js 15 já respeita output: 'export' e cria /out

# Etapa 2: Servir build com Nginx
FROM nginx:stable-alpine

# Remove configuração default
RUN rm /etc/nginx/conf.d/default.conf

# Copia sua configuração customizada (se tiver)
COPY nginx.conf /etc/nginx/conf.d/

# Copia build estático para Nginx
COPY --from=build /app/out /usr/share/nginx/html

# Expondo porta 80
EXPOSE 80

# Inicia Nginx
CMD ["nginx", "-g", "daemon off;"]
