# ARM64 mimarisi için Node.js'in Alpine tabanlı bir sürümünü kullanıyoruz.
# Projenizin Node.js sürümüne göre bu etiketi güncelleyebilirsiniz (örn: node:18-alpine-arm64v8, node:20-alpine-arm64v8).
# En güncel LTS sürümünü kullanmak genellikle iyi bir pratiktir.
FROM node:20-alpine AS development

# Çalışma dizinini ayarlıyoruz.
WORKDIR /usr/src/app

# package.json ve package-lock.json (veya yarn.lock) dosyalarını kopyalıyoruz.
# Bu, bağımlılık katmanının önbelleğe alınmasını sağlar.
COPY package*.json ./

# Bağımlılıkları yüklüyoruz.
# Eğer yarn kullanıyorsanız, RUN yarn install --frozen-lockfile komutunu kullanın.
RUN npm install

# Proje kaynak kodunu kopyalıyoruz.
COPY . .

# TypeScript kodunu JavaScript'e derliyoruz.
RUN npm run build

# Production imajını oluşturuyoruz.
FROM node:20-alpine AS production

# Build sırasında kullanılacak argümanı tanımlıyoruz
ARG SQL_CONNECTION_STRING

# Gerekli ortam değişkenlerini ayarlıyoruz.
# Coolify genellikle portu kendi yönetir, ancak varsayılan bir değer sağlamak iyidir.
ENV NODE_ENV=production
ENV PORT=3000
# Build argümanını environment variable olarak set ediyoruz ki RUN komutları erişebilsin
ENV SQL_CONNECTION_STRING=${SQL_CONNECTION_STRING}

WORKDIR /usr/src/app

# Sadece production bağımlılıklarını ve build edilmiş dosyaları kopyalıyoruz.
COPY package*.json ./

# Sadece production bağımlılıklarını yüklüyoruz.
# Eğer yarn kullanıyorsanız, RUN yarn install --frozen-lockfile --production komutunu kullanın.
RUN npm install --only=production

# Derlenmiş kodu development aşamasından kopyalıyoruz.
COPY --from=development /usr/src/app/dist ./dist


# Uygulamanın çalışacağı portu açıyoruz.
EXPOSE ${PORT}

# Uygulamayı başlatıyoruz.
CMD ["node", "dist/main.js"]