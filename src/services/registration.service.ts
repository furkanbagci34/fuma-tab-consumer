import { Injectable, Logger } from "@nestjs/common";
import { PiqSoftApiService } from "./piqsoft-api.service";

@Injectable()
export class RegistrationService {
    private readonly logger = new Logger(RegistrationService.name);

    constructor(private readonly piqsoftApiService: PiqSoftApiService) {}

    async processMessage(consumerData: any, retryCount: number = 0): Promise<void> {
        try {
            const { eventType, data, messageId } = consumerData;

            switch (eventType) {
                case "upsert-customer": {
                    await this.customerUpsert(data, messageId, retryCount);
                    break;
                }
                case "upsert-doc-orders": {
                    await this.docOrdersUpsert(data, messageId, retryCount);
                    break;
                }
                case "upsert-doc-invoices": {
                    await this.docInvoiceUpsert(data, messageId, retryCount);
                    break;
                }
                default: {
                    throw new Error(`Unsupported message type: ${eventType}`);
                }
            }
        } catch (error) {
            const vkn = consumerData?.data?.vkn || "N/A";
            this.logger.error(
                `Failed to process message - error: ${error.message}, messageType: ${consumerData?.eventType}, VKN: ${vkn}`,
            );
            throw error;
        }
    }

    private async customerUpsert(customerData: any, messageId: string, retryCount: number = 0): Promise<void> {
        await this.piqsoftApiService.upsertCustomer(customerData, messageId, retryCount);
    }

    private async docOrdersUpsert(docOrdersData: any, messageId: string, retryCount: number = 0): Promise<void> {
        await this.piqsoftApiService.upsertDocOrders(docOrdersData, messageId, retryCount);
    }

    private async docInvoiceUpsert(docInvoiceData: any, messageId: string, retryCount: number = 0): Promise<void> {
        await this.piqsoftApiService.upsertDocInvoice(docInvoiceData, messageId, retryCount);
    }
}
