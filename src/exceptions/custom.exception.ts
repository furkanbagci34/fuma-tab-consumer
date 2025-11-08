import { HttpException } from "@nestjs/common";

export class CustomException extends HttpException {
    constructor(statusCode: number, message: string, success: boolean, body: any) {
        super(
            {
                success,
                message,
                statusCode,
                body,
            },
            statusCode,
        );
    }
}

export class RabbitMQConnectionException extends Error {
    constructor(
        message: string,
        public readonly originalError?: Error,
    ) {
        super(message);
        this.name = "RabbitMQConnectionException";
    }
}

export class MessageProcessingException extends Error {
    constructor(
        message: string,
        public readonly messageId?: string,
        public readonly originalError?: Error,
    ) {
        super(message);
        this.name = "MessageProcessingException";
    }
}

export class PiqSoftApiException extends Error {
    constructor(
        message: string,
        public readonly statusCode?: number,
        public readonly errorCode?: string,
        public readonly originalError?: Error,
    ) {
        super(message);
        this.name = "PiqSoftApiException";
    }
}

export class ValidationException extends Error {
    constructor(
        message: string,
        public readonly validationErrors?: any[],
    ) {
        super(message);
        this.name = "ValidationException";
    }
}
