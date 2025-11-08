#!/bin/bash
# RabbitMQ Manuel Kuyruk Oluşturma Komutları

# 1. RabbitMQ Management API bekle
sleep 15

# 2. Main Exchange oluştur
curl -u admin:admin123 -X PUT http://localhost:15672/api/exchanges/%2F/fuma-tab-exchange \
  -H "content-type: application/json" \
  -d '{"type":"topic","durable":true}'

# 3. Dead Letter Exchange oluştur
curl -u admin:admin123 -X PUT http://localhost:15672/api/exchanges/%2F/fuma-tab-dlx \
  -H "content-type: application/json" \
  -d '{"type":"topic","durable":true}'

# 4. Main Queue oluştur
curl -u admin:admin123 -X PUT http://localhost:15672/api/queues/%2F/customer-registration-queue \
  -H "content-type: application/json" \
  -d '{"durable":true,"arguments":{"x-dead-letter-exchange":"fuma-tab-dlx","x-dead-letter-routing-key":"dead-letter"}}'

# 5. Dead Letter Queue oluştur
curl -u admin:admin123 -X PUT http://localhost:15672/api/queues/%2F/customer-registration-dlq \
  -H "content-type: application/json" \
  -d '{"durable":true,"arguments":{"x-message-ttl":86400000}}'

# 6. Main Queue Binding
curl -u admin:admin123 -X POST http://localhost:15672/api/bindings/%2F/e/fuma-tab-exchange/q/customer-registration-queue \
  -H "content-type: application/json" \
  -d '{"routing_key":"customer.registration"}'

# 7. DLQ Binding
curl -u admin:admin123 -X POST http://localhost:15672/api/bindings/%2F/e/fuma-tab-dlx/q/customer-registration-dlq \
  -H "content-type: application/json" \
  -d '{"routing_key":"dead-letter"}'

echo "RabbitMQ kuyruklari olusturuldu!"

