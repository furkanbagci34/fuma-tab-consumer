import { Module } from "@nestjs/common";
import DbService from "../services/db.service";

@Module({
    providers: [DbService],
    exports: [DbService],
})
export class DbModule {}
