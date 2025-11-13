import { Injectable, Logger } from "@nestjs/common";
import axios from "axios";
import { DbService } from "./db.service";
@Injectable()
export class PiqSoftApiService {
    private readonly logger = new Logger(PiqSoftApiService.name);
    constructor(private readonly dbService: DbService) {}

    async upsertCustomer(customerData: any, messageId: string, retryCount: number = 0): Promise<void> {
        let errorMessage = "";
        let responseMessage = "";
        try {
            const sellerId = customerData.seller_id;
            if (!sellerId) {
                errorMessage = "seller_id is required in customer data";
                throw new Error(errorMessage);
            }

            const rows = await this.dbService.fetchSellerRowById(sellerId);
            if (!rows || rows.length === 0) {
                errorMessage = `Seller with id ${sellerId} not found or inactive`;
                throw new Error(errorMessage);
            }

            const seller = rows[0];
            const host = seller.ip_address;
            const port = seller.port ? `:${seller.port}` : "";
            const baseUrl = `${host}${port}`;
            const url = `${baseUrl}/api/fuma/customer/upsert`;

            this.logger.log(
                `Making API request - url: ${url}, sellerId: ${sellerId}, messageId: ${messageId}, retryCount: ${retryCount}, hasApiKey: ${!!seller.api_key}`,
            );

            const response = await axios.post(url, customerData, {
                headers: {
                    "Content-Type": "application/json",
                    "x-api-key": seller.api_key,
                },
                timeout: parseInt(process.env.PIQSOFT_TIMEOUT || "30000", 10),
            });

            responseMessage = JSON.stringify(response.data) || "";
        } catch (error: any) {
            const errorDetails = {
                message: error?.message || "Unknown error",
                statusCode: error?.response?.status || error?.status || 0,
                statusText: error?.response?.statusText || error?.statusText || "",
                responseData: error?.response?.data ? JSON.stringify(error.response.data) : "",
                retryCount,
            };

            errorMessage = JSON.stringify(errorDetails);

            throw error;
        } finally {
            await this.dbService.insertTransferLog({
                title: customerData.eventType,
                request: customerData,
                transactionId: messageId,
                errorMessage: errorMessage,
                responseMessage: responseMessage,
            });
        }
    }

    async upsertDocOffers(docOffersData: any, messageId: string, retryCount: number = 0): Promise<void> {
        let errorMessage = "";
        let responseMessage = "";
        try {
            const sellerId = docOffersData.seller_id;
            if (!sellerId) {
                errorMessage = "seller_id is required in doc offers data";
                throw new Error(errorMessage);
            }

            const rows = await this.dbService.fetchSellerRowById(sellerId);
            if (!rows || rows.length === 0) {
                errorMessage = `Seller with id ${sellerId} not found or inactive`;
                throw new Error(errorMessage);
            }

            const seller = rows[0];
            const host = seller.ip_address;
            const port = seller.port ? `:${seller.port}` : "";
            const baseUrl = `${host}${port}`;
            const url = `${baseUrl}/api/fuma/doc-orders/upsert`;

            const response = await axios.post(url, docOffersData, {
                headers: {
                    "Content-Type": "application/json",
                    "x-api-key": seller.api_key,
                },
                timeout: parseInt(process.env.PIQSOFT_TIMEOUT || "30000", 10),
            });

            responseMessage = JSON.stringify(response.data) || "";
        } catch (error: any) {
            const errorDetails = {
                message: error?.message || "Unknown error",
                statusCode: error?.response?.status || error?.status || 0,
                statusText: error?.response?.statusText || error?.statusText || "",
                responseData: error?.response?.data ? JSON.stringify(error.response.data) : "",
                retryCount,
            };

            errorMessage = JSON.stringify(errorDetails);

            throw error;
        } finally {
            await this.dbService.insertTransferLog({
                title: docOffersData.eventType,
                request: docOffersData,
                transactionId: messageId,
                errorMessage: errorMessage,
                responseMessage: responseMessage,
            });
        }
    }
}
