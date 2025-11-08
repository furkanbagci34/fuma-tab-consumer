import { HttpStatus, Injectable, Logger } from "@nestjs/common";
import { Pool, PoolClient } from "pg";
import { CustomException } from "../exceptions/custom.exception";

@Injectable()
export class DbService {
    private readonly pool: Pool;
    private readonly logger = new Logger(DbService.name);

    constructor() {
        this.pool = new Pool({ connectionString: process.env.SQL_CONNECTION_STRING, max: 50 });
    }

    async query(sql: string, params: any[] = []) {
        const client = await this.pool.connect();
        try {
            const result = await client.query(sql, params);
            return result;
        } catch (err) {
            this.logger.error(`[query] - ${err}`);
            throw new CustomException(HttpStatus.BAD_GATEWAY, err.toString(), false, {});
        } finally {
            client.release();
        }
    }

    async queryWithCheckConnection(sql: string, params: any[] = [], client: PoolClient = null) {
        try {
            const result = await client.query(sql, params);
            return result;
        } catch (err) {
            this.logger.error(`[queryWithCheckConnection] - ${err}`);
            throw new CustomException(HttpStatus.BAD_GATEWAY, err.toString(), false, {});
        }
    }

    async beginTransaction(): Promise<PoolClient> {
        let client = null;
        try {
            client = await this.pool.connect();
            await client.query("BEGIN");
        } catch (err) {
            this.logger.error(`[beginTransaction] - ${err}`);
            throw new CustomException(HttpStatus.BAD_GATEWAY, err.toString(), false, {});
        }

        return client;
    }

    async commitTransaction(client: PoolClient) {
        await client.query("COMMIT");
    }

    async rollbackTransaction(client: PoolClient) {
        await client.query("ROLLBACK");
    }

    async closeTransaction(client: PoolClient) {
        await client.release();
    }

    async insertTransferLog(params: {
        title: string;
        request: any;
        transactionId: string;
        errorMessage: string;
        responseMessage: string;
    }): Promise<void> {
        const sql = `
            INSERT INTO public.transfer_log
                (title, request, transaction_id, error_message, created_at, response_message)
            VALUES
                ($1, $2, $3, $4, now(), $5)
        `;

        const values = [
            params.title || "",
            JSON.stringify(params.request ?? {}),
            params.transactionId || "",
            params.errorMessage || "",
            params.responseMessage || "",
        ];

        await this.query(sql, values);
    }

    async fetchSellerRowById(sellerId: number) {
        const sql = `
            SELECT
                id, 
                "name", 
                vkn, 
                created_at, 
                updated_at, 
                is_active, 
                ip_address, 
                port, 
                "x-api-key" as api_key
            FROM public.sellers
            WHERE id = $1 AND is_active = true
        `;
        const result = await this.query(sql, [sellerId]);
        return result.rows;
    }
}
