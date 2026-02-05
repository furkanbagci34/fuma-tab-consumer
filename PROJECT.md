# Fuma Tab Consumer

**RabbitMQ tabanli mesaj tuketici servisi. Fuma Tab entegrasyonundan gelen mesajlari isleyerek PiqSoft API'sine iletir.**

| Bilgi | Deger |
|-------|-------|
| Framework | NestJS 10.x |
| Dil | TypeScript 5.1 |
| Mesaj Kuyrugu | RabbitMQ (amqp-connection-manager) |
| Veritabani | PostgreSQL (raw SQL, ORM yok) |
| HTTP Istemci | Axios |
| Calisma Modu | HTTP sunucusu yok, sadece consumer |

---

## Dizin Yapisi

```
src/
├── main.ts                              # Uygulama giris noktasi (HTTP yok, context only)
├── app.module.ts                        # Root module
│
├── exceptions/
│   └── custom.exception.ts              # Ozel exception siniflari
│
├── modules/
│   ├── db.module.ts                     # Veritabani modulu
│   └── rabbitmq.module.ts              # RabbitMQ modulu
│
├── services/
│   ├── index.ts                         # Barrel export
│   ├── db.service.ts                    # DB baglanti havuzu yonetimi (~129 satir)
│   ├── rabbitmq-consumer.service.ts     # RabbitMQ baglanti & mesaj tuketimi (~225 satir)
│   ├── registration.service.ts          # Mesaj yonlendirme servisi (~51 satir)
│   └── piqsoft-api.service.ts           # PiqSoft API entegrasyonu (~220 satir)
```

---

## Modul Yapisi

```
AppModule
├── HttpModule (timeout: 30s, maxRedirects: 3)
├── DbModule
│   └── providers: [DbService] (export)
└── providers:
    ├── RabbitMQConsumerService
    ├── PiqSoftApiService
    └── RegistrationService
```

---

## Mimari & Mesaj Akisi

```
RabbitMQ Exchange (fuma-tab-exchange)
    │
    ▼
RabbitMQ Queue (tab-integration-queue)
    │
    ▼
RabbitMQConsumerService.handleMessage()
    │
    ▼
RegistrationService.processMessage()
    │ (eventType'a gore yonlendirir)
    ├── "upsert-customer"    → PiqSoftApiService.upsertCustomer()
    ├── "upsert-doc-orders"  → PiqSoftApiService.upsertDocOrders()
    └── "upsert-doc-invoices"→ PiqSoftApiService.upsertDocInvoice()
                                    │
                                    ▼
                              Seller DB sorgusu (ip_address, port, x-api-key)
                                    │
                                    ▼
                              Axios POST → PiqSoft API (seller endpoint)
                                    │
                                    ▼
                              transfer_log INSERT (audit kaydi)
```

---

## Servisler

### RabbitMQConsumerService (`rabbitmq-consumer.service.ts`)
RabbitMQ baglanti yonetimi ve mesaj tuketimi.

| Metot | Aciklama |
|-------|----------|
| `onModuleInit()` | Uygulama basladiginda RabbitMQ'ya baglanir |
| `onModuleDestroy()` | Kapanista baglanti temizligi |
| `connect()` | RabbitMQ baglantisi kurar (heartbeat: 30s, reconnect: 5s) |
| `setupChannel()` | Exchange, queue, routing key tanimlar, consume baslatir |
| `handleMessage()` | Gelen mesaji parse edip RegistrationService'e iletir |
| `handleMessageError()` | Hata durumunda retry veya reject |
| `publishMessage()` | Retry icin mesaji tekrar kuyruga gonderir |
| `isConnected()` | Baglanti durumu kontrolu |

**RabbitMQ Yapilandirmasi:**

| Parametre | Ortam Degiskeni | Varsayilan |
|-----------|-----------------|------------|
| URL | `RABBITMQ_URL` | amqp://...@rabbitmq.fumagpt.com:5672 |
| Exchange | `RABBITMQ_EXCHANGE` | fuma-tab-exchange |
| Queue | `RABBITMQ_QUEUE` | tab-integration-queue |
| Routing Key | `RABBITMQ_ROUTING_KEY` | tab-integration |
| Prefetch | `RABBITMQ_PREFETCH_COUNT` | 1 |
| Max Retry | `MAX_RETRY_COUNT` | 3 |

**Retry Mekanizmasi:**
- Mesaj isleme basarisiz olursa retry sayaci arttirilir
- `x-retry-count` header'i ile takip edilir
- Max retry'a ulasinca mesaj reject edilir (nack, no requeue)

### RegistrationService (`registration.service.ts`)
Mesajlari eventType'a gore ilgili servise yonlendirir.

| eventType | Hedef Metot |
|-----------|-------------|
| `upsert-customer` | `PiqSoftApiService.upsertCustomer()` |
| `upsert-doc-orders` | `PiqSoftApiService.upsertDocOrders()` |
| `upsert-doc-invoices` | `PiqSoftApiService.upsertDocInvoice()` |

### PiqSoftApiService (`piqsoft-api.service.ts`)
Seller bilgilerini DB'den alip PiqSoft API'sine HTTP istegi gonderir.

**Her metottaki akis:**
```
1. seller_id kontrolu
2. DB'den seller sorgulama (ip_address, port, x-api-key, vkn)
3. VKN bilgisi alinir
4. Seller endpoint'ine Axios POST istegi
5. Basari/hata durumu loglanir
6. transfer_log tablosuna audit kaydi (VKN dahil)
```

| Metot | Hedef API | Aciklama |
|-------|-----------|----------|
| `upsertCustomer()` | `{seller}/api/fuma/customer/upsert` | Musteri migrasyon |
| `upsertDocOrders()` | `{seller}/api/fuma/doc-orders/upsert` | Siparis migrasyon |
| `upsertDocInvoice()` | `{seller}/api/fuma/doc-invoice/upsert` | Fatura migrasyon |

### DbService (`db.service.ts`)
PostgreSQL baglanti havuzu yonetimi.

| Parametre | Deger |
|-----------|-------|
| Max Connections | 200 |
| Idle Timeout | 10 saniye |
| Connection Timeout | 20 saniye |
| Max Uses Per Connection | 10000 |

| Metot | Aciklama |
|-------|----------|
| `query(sql, params)` | Sorgu calistir (otomatik release) |
| `queryWithCheckConnection(sql, params, client)` | Verilen client ile sorgu |
| `beginTransaction()` | Transaction baslat |
| `commitTransaction(client)` | Onayla |
| `rollbackTransaction(client)` | Geri al |
| `closeTransaction(client)` | Baglantiyi serbest birak |
| `getPoolStatus()` | Havuz metrikleri |

---

## Veritabani

### Kullanilan Tablolar

| Tablo | Islem | Aciklama |
|-------|-------|----------|
| `sellers` | SELECT | Satici bilgileri (ip_address, port, x-api-key, vkn, is_active) |
| `transfer_log` | INSERT | Audit kaydi (title, request, transaction_id, error_message, response_message, from, vkn) |

---

## Loglama Stratejisi

### PiqSoftApiService (her metot icin)

| Log Noktasi | Level | Icerik |
|-------------|-------|--------|
| API istegi oncesi | `log` | `Making API request - url, sellerId, VKN, messageId, retryCount` |
| Hata durumu | `error` | `{method} failed - messageId, VKN, retryCount, error` |

### RabbitMQConsumerService

| Log Noktasi | Level | Icerik |
|-------------|-------|--------|
| Mesaj alindi | `log` | `Raw message received - messageId, retryCount, queue` |
| Isleme basarisiz | `error` | `Message processing failed - messageId, VKN, retryCount, error` |
| Max retry | `error` | `Max retry attempts reached - messageId, VKN, retryCount, maxRetries` |

### RegistrationService

| Log Noktasi | Level | Icerik |
|-------------|-------|--------|
| Isleme basarisiz | `error` | `Failed to process message - error, messageType, VKN` |

### DB transfer_log INSERT

Her API cagrisinin sonucunda (basarili veya basarisiz) `transfer_log` tablosuna kayit atilir:
```sql
INSERT INTO transfer_log (title, request, transaction_id, error_message, response_message, created_at, "from", vkn)
VALUES ($1, $2, $3, $4, $5, NOW(), 'FumaConsumer', $7)
```

---

## Exception Siniflari

| Sinif | Aciklama |
|-------|----------|
| `CustomException` | Genel HTTP exception (statusCode, message, success, body) |
| `RabbitMQConnectionException` | RabbitMQ baglanti hatalari |
| `MessageProcessingException` | Mesaj isleme hatalari (messageId dahil) |
| `PiqSoftApiException` | PiqSoft API hatalari (statusCode, errorCode dahil) |
| `ValidationException` | Dogrulama hatalari (validationErrors dahil) |

---

## Uygulama Baslatma (main.ts)

- **HTTP sunucusu yok** - `NestFactory.createApplicationContext()` kullanilir
- Graceful shutdown: SIGTERM, SIGINT sinyalleri yakalanir
- Unhandled rejection ve uncaught exception yakalanir
- setInterval ile process ayakta tutulur

---

## Ortam Degiskenleri

| Degisken | Aciklama | Zorunlu |
|----------|----------|---------|
| `SQL_CONNECTION_STRING` | PostgreSQL baglanti dizesi | Evet |
| `RABBITMQ_URL` | RabbitMQ baglanti URL'i | Hayir |
| `RABBITMQ_EXCHANGE` | Exchange adi (varsayilan: fuma-tab-exchange) | Hayir |
| `RABBITMQ_QUEUE` | Queue adi (varsayilan: tab-integration-queue) | Hayir |
| `RABBITMQ_ROUTING_KEY` | Routing key (varsayilan: tab-integration) | Hayir |
| `RABBITMQ_PREFETCH_COUNT` | Ayni anda islenecek mesaj (varsayilan: 1) | Hayir |
| `MAX_RETRY_COUNT` | Maksimum tekrar deneme (varsayilan: 3) | Hayir |
| `PIQSOFT_TIMEOUT` | API istek timeout ms (varsayilan: 30000) | Hayir |
| `NODE_ENV` | Ortam (development/production) | Hayir |

---

## Docker

```dockerfile
# Multi-stage build
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN NODE_ENV=development npm ci
COPY . .
RUN npm run build

FROM node:18-alpine AS production
WORKDIR /app
RUN addgroup -g 1001 -S nodejs && adduser -S nestjs -u 1001
COPY --from=builder /app/package*.json ./
RUN npm ci --omit=dev
COPY --from=builder /app/dist ./dist
RUN mkdir -p logs && chown -R nestjs:nodejs /app
ENV NODE_ENV=production
USER nestjs
CMD ["node", "dist/main.js"]
```

---

## Bagimliliklar

### Core
- `@nestjs/common`, `@nestjs/core` ^10.0.0
- `@nestjs/microservices` ^10.0.0
- `@nestjs/axios` ^3.0.1

### Mesaj Kuyrugu
- `amqp-connection-manager` ^5.0.0
- `amqplib` ^0.10.9

### Veritabani
- `pg` ^8.13.1

### Loglama
- `winston` ^3.11.0
- `nest-winston` ^1.9.4

### Yardimci
- `axios` ^1.6.0, `dotenv` ^17.2.3, `rxjs` ^7.8.1

---

## Diger Projelerle Farklar

| Ozellik | fuma-tab-integration | fuma-tab-consumer |
|---------|---------------------|-------------------|
| Tip | REST API | RabbitMQ Consumer |
| HTTP Sunucu | Var (port 3090) | Yok |
| Auth | FumaGuard (API key) | Yok (kuyruktan okur) |
| Veri Alimi | HTTP POST request | RabbitMQ mesaj |
| Veri Isleme | Dogrudan DB islem | PiqSoft API'ye iletme |
| NestJS | ^9.0.0 | ^10.0.0 |
| Node | 20-alpine | 18-alpine |
| Retry | Yok | RabbitMQ retry (max 3) |
| Controller | 3 controller | Controller yok |

---

## Istatistikler

| Metrik | Deger |
|--------|-------|
| Servis Dosyasi | 4 |
| Modul Dosyasi | 2 |
| Exception Sinifi | 5 |
| Desteklenen eventType | 3 |
| Max DB Pool | 200 |
| Default Retry | 3 |
