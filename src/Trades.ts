import DatabaseSingleton from "./DatabaseSingleton";
import TelegramBot from "./TelegramBot";
import Trade from "./Trade";

export default class Trades {
    private static instance: Trades;

    private constructor() { }

    public static async getInstance(): Promise<Trades> {
        if (!Trades.instance) {
            Trades.instance = new Trades();
            console.log('Trades instance created');
        }

        return Trades.instance;
    }

    public async getOpenTrades(): Promise<Trade[]> {
        const trades: Trade[] = [];
        const dbInstance = await DatabaseSingleton.getInstance();
        const db = dbInstance.getDb();
        if (!db) {
            console.error('Database not initialized in getOpenTrades');
            throw new Error('Database not initialized');
        }
        const results = await db.all('SELECT * FROM trades WHERE open = 1 ORDER BY buyDate');
        for (const result of results) {
            const trade = new Trade(result.symbol, result.buyPrice);
            trade.setTradeFromDb(result);
            trades.push(trade);
        }
        return trades;
    }

    public async getLastOpenTrade(): Promise<Trade | null> {
        const dbInstance = await DatabaseSingleton.getInstance();
        const db = dbInstance.getDb();
        if (!db) {
            console.error('Database not initialized in getLastOpenTrade');
            throw new Error('Database not initialized');
        }
        const result = await db.get('SELECT * FROM trades WHERE open = 1 LIMIT 1');
        if (!result) {
            console.warn("No open trade found");
            return null;
        }
        const trade = new Trade(result.symbol, result.buyPrice, result.id);
        trade.setTradeFromDb(result);
        console.log('Trade found:', trade.getSymbol(), trade.getBuyPrice());
        return trade;
    }

    public async getTradesPartialResume(): Promise<string> {
        const dbInstance = await DatabaseSingleton.getInstance();
        const db = dbInstance.getDb();
        if (!db) {
            console.error('Database not initialized in getTradesPartialResume');
            throw new Error('Database not initialized');
        }
        const results = await db.all('SELECT * FROM trades WHERE open = 1 ORDER BY buyDate');
        // this.sendMessagesToTelegram('ESTADO DAS ORDENS ABERTAS:\n');
        let result = 1;
        for (const res of results) {
            const trade = new Trade(res.symbol, res.buyPrice);
            trade.setTradeFromDb(res);
            await this.sendMessagesToTelegram(await trade.getTradeMessage());
            result *= trade.getResult();
        }
        result = (result - 1) * 100;
        return "\n";
        // return `\nRESULTADO PARCIAL: ${result.toFixed(2)}%`;
    }

    public async sendMessagesToTelegram(message: string) {
        const telegramBot = TelegramBot.getInstance();
        await telegramBot.sendMarkDownMessage(message);
    }

    public async getTradesResults(list = true) {
        const dbInstance = await DatabaseSingleton.getInstance();
        const db = dbInstance.getDb();
        if (!db) {
            console.error('Database not initialized in getTradesResults');
            throw new Error('Database not initialized');
        }
        const results = await db.all('SELECT * FROM trades WHERE open = 0 ORDER BY buyDate');
        let message = 'RESULTADO DO BOT:\n';
        let symbol = '';
        let result = 1;
        for (const res of results) {
            if (res.symbol !== symbol) {
                symbol = res.symbol;
                message += `\nSYMBOL.: ${res.symbol}:\n`;
            }
            const trade = new Trade(res.symbol, res.buyPrice);
            trade.setTradeFromDb(res);
            result *= trade.getResult();
            if (list) {
                await this.sendMessagesToTelegram(await trade.getTradeMessage());
            }

        }
        result = (result - 1) * 100;
        return `\nRESULTADO: ${result.toFixed(2)}%`;
    }

}