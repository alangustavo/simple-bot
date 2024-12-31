import DatabaseSingleton from "./DatabaseSingleton";
import type { Database } from 'sqlite';
import TelegramBot from "./TelegramBot";

export default class Result {
    private static instance: Result;
    private static database: DatabaseSingleton;
    private telegram: TelegramBot;
    private db: Database;
    private constructor() {
        this.db = Result.database.getDb();
        this.telegram = TelegramBot.getInstance();
    }

    public static async getInstance(): Promise<Result> {
        if (!Result.instance) {
            Result.database = await DatabaseSingleton.getInstance();
            Result.instance = new Result();

        }
        return Result.instance;
    }

    public async getResults(symbol = ""): Promise<void> {
        let query = "";
        if (symbol === "") {
            query = 'SELECT * FROM trades WHERE open = 0 ORDER BY symbol';
        } else {
            query = `SELECT * FROM trades WHERE open = 0 AND symbol = '${symbol}'`;
        }
        const results = await this.db.all(query);
        let message = "";
        if (results.length !== 0) {
            for (const result of results) {
                message += `<code>${result.symbol}</code>\n`;
                message += `Buy Price: ${result.buyPrice}\n`;
                message += `Sell Price: ${result.sellPrice}\n`;
            }
        }

    }
}
}