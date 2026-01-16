import { HttpStatus, Injectable, Logger } from "@nestjs/common";
import { Pool, PoolClient } from "pg";
import { CustomException } from "src/exceptions/custom.exception";

@Injectable()
export default class DbService {
    private readonly pool: Pool;
    private readonly logger = new Logger(DbService.name);

    getPoolStatus() {
        return {
            total: this.pool.totalCount,
            idle: this.pool.idleCount,
            waiting: this.pool.waitingCount,
        };
    }

    constructor() {
        this.pool = new Pool({
            connectionString: process.env.SQL_CONNECTION_STRING,
            // Keep pool size safely below Postgres max_connections to avoid "too many clients".
            max: 200,
            idleTimeoutMillis: 10000,
            connectionTimeoutMillis: 20000,
            allowExitOnIdle: false,
            // Recycle clients periodically to prevent long-lived/stuck connections.
            maxUses: 10000,
        });

        // Log pool errors
        this.pool.on("error", (err) => {
            this.logger.error(`[Pool Error] Unexpected database error: ${err}`);
        });

        // Monitor connection pool
        this.pool.on("connect", () => {
            this.logger.debug(
                `[Pool] New client connected. Total: ${this.pool.totalCount}, Idle: ${this.pool.idleCount}, Waiting: ${this.pool.waitingCount}`
            );
        });
        this.pool.on("acquire", () => {
            this.logger.debug(
                `[Pool] Client acquired. Total: ${this.pool.totalCount}, Idle: ${this.pool.idleCount}, Waiting: ${this.pool.waitingCount}`
            );
        });
        this.pool.on("release", () => {
            this.logger.debug(
                `[Pool] Client released. Total: ${this.pool.totalCount}, Idle: ${this.pool.idleCount}, Waiting: ${this.pool.waitingCount}`
            );
        });
        this.pool.on("remove", () => {
            this.logger.debug(
                `[Pool] Client removed. Total: ${this.pool.totalCount}, Idle: ${this.pool.idleCount}, Waiting: ${this.pool.waitingCount}`
            );
        });
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
            // Release client if connection was established but BEGIN failed
            if (client) {
                try {
                    client.release();
                } catch (releaseErr) {
                    this.logger.error(`[beginTransaction] - Failed to release client: ${releaseErr}`);
                }
            }
            throw new CustomException(HttpStatus.BAD_GATEWAY, err.toString(), false, {});
        }

        return client;
    }

    async commitTransaction(client: PoolClient) {
        try {
            await client.query("COMMIT");
        } catch (err) {
            this.logger.error(`[commitTransaction] - ${err}`);
            throw err;
        }
    }

    async rollbackTransaction(client: PoolClient) {
        try {
            await client.query("ROLLBACK");
        } catch (err) {
            this.logger.error(`[rollbackTransaction] - ${err}`);
            // Don't throw, just log - we still want to release the connection
        }
    }

    async closeTransaction(client: PoolClient) {
        if (client) {
            try {
                await client.release();
            } catch (err) {
                this.logger.error(`[closeTransaction] - Failed to release client: ${err}`);
            }
        }
    }
}
