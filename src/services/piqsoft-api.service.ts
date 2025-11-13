import { Injectable } from "@nestjs/common";
import axios from "axios";
import { logger } from "../common/logger";
import { DbService } from "./db.service";

@Injectable()
export class PiqSoftApiService {
    constructor(private readonly dbService: DbService) {}

    async upsertCustomer(customerData: any, messageId: string, retryCount: number = 0): Promise<void> {
        let errorMessage = "";
        let responseMessage = "";
        try {
            const sellerId = customerData.seller_id;
            if (!sellerId) {
                logger.error("seller_id is missing in customer data", {
                    guid: customerData.guid,
                    messageId,
                });

                errorMessage = "seller_id is required in customer data";
                throw new Error(errorMessage);
            }

            const rows = await this.dbService.fetchSellerRowById(sellerId);
            if (!rows || rows.length === 0) {
                logger.error("Seller not found or inactive", {
                    sellerId,
                    guid: customerData.guid,
                    messageId,
                });
                errorMessage = `Seller with id ${sellerId} not found or inactive`;
                throw new Error(errorMessage);
            }

            const seller = rows[0];
            let host = seller.ip_address;

            logger.info("Building URL for customer upsert", {
                sellerId,
                originalIpAddress: seller.ip_address,
                originalPort: seller.port,
                messageId,
            });

            // Protokol kontrolü: Eğer http:// veya https:// yoksa, varsayılan olarak http:// ekle
            if (!host.startsWith("http://") && !host.startsWith("https://")) {
                host = `http://${host}`;
                logger.info("Protocol added to host", { originalHost: seller.ip_address, newHost: host });
            }

            // Port kontrolü: Varsayılan portları (80, 443) atla
            let port = "";
            if (seller.port) {
                const isHttps = host.startsWith("https://");
                const isHttp = host.startsWith("http://");
                // HTTPS için 443, HTTP için 80 varsayılan portlardır, eklemeye gerek yok
                if ((isHttps && seller.port !== 443) || (isHttp && seller.port !== 80)) {
                    port = `:${seller.port}`;
                } else {
                    logger.info("Default port skipped", {
                        protocol: isHttps ? "https" : "http",
                        port: seller.port,
                    });
                }
            }

            const baseUrl = `${host}${port}`;
            const url = `${baseUrl}/api/fuma/customer/upsert`;

            logger.info("Making API request", {
                url,
                sellerId,
                messageId,
                retryCount,
                hasApiKey: !!seller.api_key,
            });

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

            logger.error("Customer upsert failed with detailed error", {
                sellerId: customerData.seller_id,
                guid: customerData.guid,
                error: errorDetails.statusCode,
                messageId,
                retryCount,
            });

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
                logger.error("seller_id is missing in doc offers data", {
                    guid: docOffersData.guid,
                    messageId,
                });

                errorMessage = "seller_id is required in doc offers data";
                throw new Error(errorMessage);
            }

            const rows = await this.dbService.fetchSellerRowById(sellerId);
            if (!rows || rows.length === 0) {
                logger.error("Seller not found or inactive", {
                    sellerId,
                    guid: docOffersData.guid,
                    messageId,
                });
                errorMessage = `Seller with id ${sellerId} not found or inactive`;
                throw new Error(errorMessage);
            }

            const seller = rows[0];
            let host = seller.ip_address;

            logger.info("Building URL for doc offers upsert", {
                sellerId,
                originalIpAddress: seller.ip_address,
                originalPort: seller.port,
                messageId,
            });

            // Protokol kontrolü: Eğer http:// veya https:// yoksa, varsayılan olarak http:// ekle
            if (!host.startsWith("http://") && !host.startsWith("https://")) {
                host = `http://${host}`;
                logger.info("Protocol added to host", { originalHost: seller.ip_address, newHost: host });
            }

            // Port kontrolü: Varsayılan portları (80, 443) atla
            let port = "";
            if (seller.port) {
                const isHttps = host.startsWith("https://");
                const isHttp = host.startsWith("http://");
                // HTTPS için 443, HTTP için 80 varsayılan portlardır, eklemeye gerek yok
                if ((isHttps && seller.port !== 443) || (isHttp && seller.port !== 80)) {
                    port = `:${seller.port}`;
                } else {
                    logger.info("Default port skipped", {
                        protocol: isHttps ? "https" : "http",
                        port: seller.port,
                    });
                }
            }

            const baseUrl = `${host}${port}`;
            const url = `${baseUrl}/api/fuma/doc-orders/upsert`;

            logger.info("Making API request", {
                url,
                sellerId,
                messageId,
                retryCount,
                hasApiKey: !!seller.api_key,
            });

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

            logger.error("Doc offers upsert failed with detailed error", {
                sellerId: docOffersData.seller_id,
                guid: docOffersData.guid,
                error: errorDetails.statusCode,
                messageId,
                retryCount,
            });

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
