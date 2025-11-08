import { Injectable } from "@nestjs/common";
import { PiqSoftApiService } from "./piqsoft-api.service";
import { logger } from "../common/logger";

@Injectable()
export class RegistrationService {
    constructor(private readonly piqsoftApiService: PiqSoftApiService) {}

    async processMessage(consumerData: any, retryCount: number = 0): Promise<void> {
        try {
            const { eventType, data, messageId } = consumerData;

            switch (eventType) {
                case "upsert-customer": {
                    await this.customerUpsert(data, messageId, retryCount);
                    break;
                }
                case "upsert-doc-offers": {
                    await this.docOffersUpsert(data, messageId, retryCount);
                    break;
                }
                default: {
                    throw new Error(`Unsupported message type: ${eventType}`);
                }
            }
        } catch (error) {
            logger.error("Failed to process message", {
                error: error.message,
                messageType: consumerData?.eventType,
            });
            throw error;
        }
    }

    private async customerUpsert(customerData: any, messageId: string, retryCount: number = 0): Promise<void> {
        await this.piqsoftApiService.upsertCustomer(customerData, messageId, retryCount);
    }

    private async docOffersUpsert(docOffersData: any, messageId: string, retryCount: number = 0): Promise<void> {
        await this.piqsoftApiService.upsertDocOffers(docOffersData, messageId, retryCount);
    }
}
