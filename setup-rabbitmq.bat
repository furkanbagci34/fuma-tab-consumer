@echo off
echo ====================================
echo RabbitMQ Kuyruk Olusturma
echo ====================================

echo.
echo [1/6] Network olusturuluyor...
docker network create fuma-network 2>nul
if %errorlevel% equ 0 (
    echo Network olusturuldu!
) else (
    echo Network zaten mevcut.
)

echo.
echo [2/6] RabbitMQ container baslatiiliyor...
docker run -d --name fuma-rabbitmq --network fuma-network -p 5672:5672 -p 15672:15672 -e RABBITMQ_DEFAULT_USER=admin -e RABBITMQ_DEFAULT_PASS=admin123 rabbitmq:3.12-management-alpine
if %errorlevel% neq 0 (
    echo Container zaten calisiyor, devam ediliyor...
)

echo.
echo [3/6] RabbitMQ hazir olana kadar bekleniyor (20 saniye)...
timeout /t 20 /nobreak >nul

echo.
echo [4/6] Exchange olusturuluyor (fuma-tab-exchange)...
curl -u admin:admin123 -X PUT http://localhost:15672/api/exchanges/%%2F/fuma-tab-exchange -H "content-type: application/json" -d "{\"type\":\"topic\",\"durable\":true}" 2>nul
echo Done!

echo.
echo [5/6] Queue olusturuluyor (customer-registration-queue)...
curl -u admin:admin123 -X PUT http://localhost:15672/api/queues/%%2F/customer-registration-queue -H "content-type: application/json" -d "{\"durable\":true}" 2>nul
echo Done!

echo.
echo [6/6] Queue binding yapiliyor...
curl -u admin:admin123 -X POST http://localhost:15672/api/bindings/%%2F/e/fuma-tab-exchange/q/customer-registration-queue -H "content-type: application/json" -d "{\"routing_key\":\"customer.registration\"}" 2>nul
echo Done!

echo.
echo Kuyruklar kontrol ediliyor...
docker exec fuma-rabbitmq rabbitmqctl list_queues

echo.
echo ====================================
echo TAMAMLANDI!
echo ====================================
echo.
echo Management UI: http://localhost:15672
echo Username: admin
echo Password: admin123
echo.
echo Olusturulan:
echo - Exchange: fuma-tab-exchange (topic)
echo - Queue: customer-registration-queue
echo - Routing Key: customer.registration
echo ====================================

pause

