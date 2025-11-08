# Fuma Tab Consumer

A professional NestJS-based RabbitMQ consumer service that processes customer registration messages and forwards them to PiqSoft API.

## 🚀 Features

- **RabbitMQ Consumer**: Reliable message consumption with retry logic and dead letter queues
- **PiqSoft Integration**: Seamless customer registration with PiqSoft API
- **Error Handling**: Comprehensive error handling with logging and monitoring
- **Health Checks**: Built-in health endpoints for monitoring and Kubernetes probes
- **Docker Support**: Production-ready Docker configuration
- **TypeScript**: Full TypeScript support with strict typing
- **Configuration Management**: Environment-based configuration with validation
- **Logging**: Structured logging with Winston
- **Graceful Shutdown**: Proper cleanup on application termination

## 📋 Prerequisites

- Node.js 18+
- RabbitMQ 3.12+
- PiqSoft API access credentials

## 🛠️ Installation

### Local Development

1. **Clone and setup the project:**

    ```bash
    cd fuma-tab-consumer
    npm install
    ```

2. **Configure environment variables:**

    ```bash
    cp env.example .env
    # Edit .env with your configuration
    ```

3. **Start RabbitMQ (using Docker):**

    ```bash
    docker run -d --name rabbitmq \
      -p 5672:5672 -p 15672:15672 \
      -e RABBITMQ_DEFAULT_USER=admin \
      -e RABBITMQ_DEFAULT_PASS=admin123 \
      rabbitmq:3.12-management-alpine
    ```

4. **Run the application:**

    ```bash
    # Development mode
    npm run start:dev

    # Production mode
    npm run build
    npm run start:prod
    ```

### Docker Deployment

1. **Using Docker Compose (Recommended):**

    ```bash
    # Set your PiqSoft API key
    export PIQSOFT_API_KEY=your_api_key_here

    # Start all services
    docker-compose up -d
    ```

2. **Using Docker only:**

    ```bash
    # Build image
    docker build -t fuma-tab-consumer .

    # Run container
    docker run -d \
      --name fuma-tab-consumer \
      -p 3000:3000 \
      -e PIQSOFT_API_KEY=your_api_key_here \
      fuma-tab-consumer
    ```

## 📊 Monitoring

### Health Check Endpoints

- **General Health**: `GET /health`
- **Readiness Probe**: `GET /health/ready`
- **Liveness Probe**: `GET /health/live`

### RabbitMQ Management

Access RabbitMQ management interface at: http://localhost:15672

- Username: `admin`
- Password: `admin123`

## 🔧 Configuration

### Environment Variables

| Variable                  | Description              | Default                       |
| ------------------------- | ------------------------ | ----------------------------- |
| `NODE_ENV`                | Application environment  | `development`                 |
| `PORT`                    | HTTP server port         | `3000`                        |
| `LOG_LEVEL`               | Logging level            | `info`                        |
| `RABBITMQ_URL`            | RabbitMQ connection URL  | `amqp://localhost:5672`       |
| `RABBITMQ_QUEUE`          | Queue name for messages  | `customer-registration-queue` |
| `RABBITMQ_EXCHANGE`       | Exchange name            | `fuma-tab-exchange`           |
| `RABBITMQ_ROUTING_KEY`    | Routing key              | `customer.registration`       |
| `RABBITMQ_PREFETCH_COUNT` | Message prefetch count   | `1`                           |
| `RABBITMQ_RETRY_ATTEMPTS` | Max retry attempts       | `3`                           |
| `RABBITMQ_RETRY_DELAY`    | Retry delay (ms)         | `5000`                        |
| `PIQSOFT_BASE_URL`        | PiqSoft API base URL     | `https://api.piqsoft.com`     |
| `PIQSOFT_API_KEY`         | PiqSoft API key          | **Required**                  |
| `PIQSOFT_TIMEOUT`         | API request timeout (ms) | `30000`                       |
| `PIQSOFT_RETRY_ATTEMPTS`  | API retry attempts       | `3`                           |
| `PIQSOFT_RETRY_DELAY`     | API retry delay (ms)     | `2000`                        |

## 📝 Message Format

The consumer expects messages in the following format:

```json
{
    "messageId": "unique-message-id",
    "timestamp": "2023-10-09T10:30:00Z",
    "source": "fuma-tab-integration",
    "customerData": {
        "firstName": "John",
        "lastName": "Doe",
        "email": "john.doe@example.com",
        "phone": "+1234567890",
        "companyName": "Example Corp",
        "taxNumber": "123456789",
        "address": {
            "street": "123 Main St",
            "city": "New York",
            "state": "NY",
            "zipCode": "10001",
            "country": "USA"
        },
        "notes": "Additional notes"
    }
}
```

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   RabbitMQ      │───▶│  Fuma Consumer  │───▶│   PiqSoft API   │
│   Queue         │    │   Service       │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Key Components

- **RabbitMQConsumerService**: Handles message consumption and processing
- **PiqSoftApiService**: Manages API communication with PiqSoft
- **HealthController**: Provides monitoring endpoints
- **Configuration Management**: Environment-based configuration
- **Error Handling**: Custom exceptions and retry logic
- **Logging**: Structured logging with Winston

## 🧪 Testing

```bash
# Run unit tests
npm run test

# Run tests with coverage
npm run test:cov

# Run e2e tests
npm run test:e2e

# Run tests in watch mode
npm run test:watch
```

## 📈 Performance Tuning

### RabbitMQ Settings

- **Prefetch Count**: Adjust `RABBITMQ_PREFETCH_COUNT` based on processing capacity
- **Queue Durability**: Messages are persisted to disk for reliability
- **Dead Letter Queue**: Failed messages are routed to DLQ after max retries

### API Settings

- **Connection Pooling**: HTTP connections are reused for efficiency
- **Timeout Configuration**: Configurable timeouts for API calls
- **Retry Logic**: Exponential backoff for failed API requests

## 🚨 Error Handling

### Message Processing Errors

1. **Validation Errors**: Invalid message format → Reject message
2. **API Errors**: PiqSoft API failures → Retry with exponential backoff
3. **Network Errors**: Connection issues → Retry with backoff
4. **Max Retries**: After max attempts → Send to dead letter queue

### Monitoring and Alerting

- Monitor health check endpoints
- Watch RabbitMQ queue lengths
- Monitor API response times and error rates
- Set up alerts for dead letter queue messages

## 🔒 Security

- **API Key Management**: Secure storage of PiqSoft API credentials
- **Input Validation**: Strict validation of incoming messages
- **Error Sanitization**: Sensitive data not exposed in logs
- **Container Security**: Non-root user in Docker container

## 📚 Development

### Project Structure

```
src/
├── config/           # Configuration management
├── controllers/      # HTTP controllers
├── dto/             # Data Transfer Objects
├── exceptions/      # Custom exceptions
├── interfaces/      # TypeScript interfaces
├── services/        # Business logic services
├── common/          # Shared utilities
└── main.ts         # Application entry point
```

### Code Standards

- **TypeScript**: Strict typing enabled
- **ESLint**: Code linting and formatting
- **Prettier**: Code formatting
- **JSDoc**: Documentation for public APIs
- **SOLID Principles**: Clean architecture patterns

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Submit a pull request

## 📄 License

This project is licensed under the UNLICENSED license.

## 🆘 Support

For support and questions:

1. Check the health endpoints for service status
2. Review application logs for error details
3. Monitor RabbitMQ management interface
4. Contact the Fuma Tab Integration team

---

**Built with ❤️ by the Fuma Tab Integration Team**
