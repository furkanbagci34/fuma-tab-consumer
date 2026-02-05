import { Injectable, Logger } from "@nestjs/common";
import axios from "axios";
import DbService from "./db.service";
@Injectable()
export class PiqSoftApiService {
    private readonly logger = new Logger(PiqSoftApiService.name);
    constructor(private readonly dbService: DbService) {}

    async upsertCustomer(customerData: any, messageId: string, retryCount: number = 0): Promise<void> {
        let errorMessage = "";
        let responseMessage = "";
        let vkn = "N/A";
        try {
            const sellerId = customerData.seller_id;
            if (!sellerId) {
                errorMessage = "seller_id is required in customer data";
                throw new Error(errorMessage);
            }

            const sellerResult = await this.dbService.query(
                "SELECT * FROM sellers WHERE id = $1 AND is_active = true",
                [sellerId],
            );
            if (!sellerResult.rows || sellerResult.rows.length === 0) {
                errorMessage = `Seller with id ${sellerId} not found or inactive`;
                throw new Error(errorMessage);
            }

            const seller = sellerResult.rows[0];
            vkn = seller.vkn || "N/A";
            const host = seller.ip_address;
            const port = seller.port ? `:${seller.port}` : "";
            const baseUrl = `${host}${port}`;
            const url = `${baseUrl}/api/fuma/customer/upsert`;

            this.logger.log(
                `Making API request - url: ${url}, sellerId: ${sellerId}, VKN: ${vkn}, messageId: ${messageId}, retryCount: ${retryCount}, hasApiKey: ${!!seller["x-api-key"]}`,
            );

            const response = await axios.post(url, customerData, {
                headers: {
                    "Content-Type": "application/json",
                    "x-api-key": `${seller["x-api-key"]}`,
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
                vkn,
            };

            errorMessage = JSON.stringify(errorDetails);

            this.logger.error(
                `upsertCustomer failed - messageId: ${messageId}, VKN: ${vkn}, retryCount: ${retryCount}, error: ${error?.message}`,
            );

            throw error;
        } finally {
            await this.dbService.query(
                'INSERT INTO transfer_log (title, request, transaction_id, error_message, response_message, created_at, "from", vkn) VALUES ($1, $2, $3, $4, $5, NOW(), $6, $7)',
                [
                    customerData.eventType,
                    JSON.stringify(customerData),
                    messageId,
                    errorMessage,
                    responseMessage,
                    "FumaConsumer",
                    vkn,
                ],
            );
        }
    }

    async upsertDocOrders(docOrdersData: any, messageId: string, retryCount: number = 0): Promise<void> {
        let errorMessage = "";
        let responseMessage = "";
        let vkn = "N/A";
        try {
            const sellerId = docOrdersData.seller_id;
            if (!sellerId) {
                errorMessage = "seller_id is required in doc offers data";
                throw new Error(errorMessage);
            }

            const sellerResult = await this.dbService.query(
                "SELECT * FROM sellers WHERE id = $1 AND is_active = true",
                [sellerId],
            );
            if (!sellerResult.rows || sellerResult.rows.length === 0) {
                errorMessage = `Seller with id ${sellerId} not found or inactive`;
                throw new Error(errorMessage);
            }

            const seller = sellerResult.rows[0];
            vkn = seller.vkn || "N/A";
            const host = seller.ip_address;
            const port = seller.port ? `:${seller.port}` : "";
            const baseUrl = `${host}${port}`;
            const url = `${baseUrl}/api/fuma/doc-orders/upsert`;

            this.logger.log(
                `Making API request - url: ${url}, sellerId: ${sellerId}, VKN: ${vkn}, messageId: ${messageId}, retryCount: ${retryCount}`,
            );

            const response = await axios.post(url, docOrdersData, {
                headers: {
                    "Content-Type": "application/json",
                    "x-api-key": `${seller["x-api-key"]}`,
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
                vkn,
            };

            errorMessage = JSON.stringify(errorDetails);

            this.logger.error(
                `upsertDocOrders failed - messageId: ${messageId}, VKN: ${vkn}, retryCount: ${retryCount}, error: ${error?.message}`,
            );

            throw error;
        } finally {
            await this.dbService.query(
                'INSERT INTO transfer_log (title, request, transaction_id, error_message, response_message, created_at, "from", vkn) VALUES ($1, $2, $3, $4, $5, NOW(), $6, $7)',
                [
                    docOrdersData.eventType,
                    JSON.stringify(docOrdersData),
                    messageId,
                    errorMessage,
                    responseMessage,
                    "FumaConsumer",
                    vkn,
                ],
            );
        }
    }

    async upsertDocInvoice(docInvoiceData: any, messageId: string, retryCount: number = 0): Promise<void> {
        let errorMessage = "";
        let responseMessage = "";
        let vkn = "N/A";
        try {
            const sellerId = docInvoiceData.seller_id;
            if (!sellerId) {
                errorMessage = "seller_id is required in doc offers data";
                throw new Error(errorMessage);
            }

            const sellerResult = await this.dbService.query(
                "SELECT * FROM sellers WHERE id = $1 AND is_active = true",
                [sellerId],
            );
            if (!sellerResult.rows || sellerResult.rows.length === 0) {
                errorMessage = `Seller with id ${sellerId} not found or inactive`;
                throw new Error(errorMessage);
            }

            const seller = sellerResult.rows[0];
            vkn = seller.vkn || "N/A";
            const host = seller.ip_address;
            const port = seller.port ? `:${seller.port}` : "";
            const baseUrl = `${host}${port}`;
            const url = `${baseUrl}/api/fuma/doc-invoice/upsert`;

            this.logger.log(
                `Making API request - url: ${url}, sellerId: ${sellerId}, VKN: ${vkn}, messageId: ${messageId}, retryCount: ${retryCount}`,
            );

            const response = await axios.post(url, docInvoiceData, {
                headers: {
                    "Content-Type": "application/json",
                    "x-api-key": `${seller["x-api-key"]}`,
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
                vkn,
            };

            errorMessage = JSON.stringify(errorDetails);

            this.logger.error(
                `upsertDocInvoice failed - messageId: ${messageId}, VKN: ${vkn}, retryCount: ${retryCount}, error: ${error?.message}`,
            );

            throw error;
        } finally {
            await this.dbService.query(
                'INSERT INTO transfer_log (title, request, transaction_id, error_message, response_message, created_at, "from", vkn) VALUES ($1, $2, $3, $4, $5, NOW(), $6, $7)',
                [
                    docInvoiceData.eventType,
                    JSON.stringify(docInvoiceData),
                    messageId,
                    errorMessage,
                    responseMessage,
                    "FumaConsumer",
                    vkn,
                ],
            );
        }
    }
}
