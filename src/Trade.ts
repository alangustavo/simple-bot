import TelegramBot from './TelegramBot';
import DatabaseSingleton from './DatabaseSingleton';

class Trade {
    private id?: number;
    private symbol: string;
    private buyPrice: number;
    private sellPrice!: number;
    private buyDate: Date;
    private sellDate?: Date;
    private open = true;
    private telegramBot: TelegramBot;

    constructor(symbol: string, buyPrice: number) {
        this.buyPrice = buyPrice;
        this.symbol = symbol;
        this.buyDate = new Date();
        this.telegramBot = TelegramBot.getInstance();
        this.save();
    }

    setTradeFromDb(result: { id: number; symbol: string; buyPrice: number; sellPrice: number; buyDate: string; sellDate?: string; open: number; }) {
        this.id = result.id;
        this.symbol = result.symbol;
        this.buyPrice = result.buyPrice;
        this.sellPrice = result.sellPrice;
        this.buyDate = new Date(result.buyDate);
        this.sellDate = result.sellDate ? new Date(result.sellDate) : undefined;
        this.open = result.open === 1;
    }

    public async save() {
        const dbInstance = await DatabaseSingleton.getInstance();
        const db = dbInstance.getDb();
        if (this.id) {
            console.log('Updating trade');
            db.run(
                'UPDATE trades SET symbol = ?, buyPrice = ?, sellPrice = ?, buyDate = ?, sellDate = ?, open = ? WHERE id = ?',
                this.symbol, this.buyPrice, this.sellPrice, this.buyDate.getTime(), this.sellDate?.getTime(), this.open ? 1 : 0, this.id
            );
        } else {
            console.log('Inserting new trade');
            const result = await db.run(
                'INSERT INTO trades ( symbol, buyPrice, sellPrice, buyDate, sellDate, open) VALUES (?, ?, ?, ?, ?, ?)',
                this.symbol, this.buyPrice, this.sellPrice, this.buyDate.getTime(), this.sellDate?.getTime(), this.open ? 1 : 0
            );
            this.id = result.lastID;
        }
    }

    public setActualPrice(sellPrice: number) {
        this.sellPrice = sellPrice;
        this.save();
    }

    public sell(sellPrice: number) {
        if (this.open) {
            const result = sellPrice / this.buyPrice;
            if (result < 0.99 || result > 1.005) {
                this.sellPrice = sellPrice;
                this.sellDate = new Date();
                this.open = false;
                this.save();
            }
        }
        this.sendTradeMessage();
    }

    public isOpen() {
        return this.open;
    }

    public getResult() {
        if (this.sellPrice !== undefined) {
            return this.sellPrice / this.buyPrice;
        }
        return 1;
    }

    public formatDate = (date: Date) => {
        const pad = (n: number) => n.toString().padStart(2, '0');
        return `${pad(date.getDate())}/${pad(date.getMonth() + 1)} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
    };

    public async getTradeMessage() {
        const buyDateFormatted = this.formatDate(this.buyDate);
        const sellDateFormatted = this.sellDate ? this.formatDate(this.sellDate) : 'N/A';
        const buyPriceFormatted = this.buyPrice.toFixed(8);
        const sellPriceFormatted = this.sellPrice ? this.sellPrice.toFixed(8) : 'N/A';
        const resultFormatted = ((this.getResult() - 1) * 100).toFixed(2);
        let message = `SYMBOL_: ${this.symbol.toUpperCase()}\n`;
        message += `BUY____: ${buyDateFormatted} ${buyPriceFormatted}\n`;
        message += `SELL___: ${sellDateFormatted} ${sellPriceFormatted}\n`;
        message += `P/L____: ${resultFormatted}% \n`;
        return message;
    }

    public async sendTradeMessage() {
        const message = await this.getTradeMessage();
        if (!this.open) {
            await this.telegramBot.sendMarkDownMessage(message);
            if (this.getResult() > 1) {
                await this.telegramBot.sendMessage("🤑");
            } else {
                await this.telegramBot.sendMessage("😭");
            }
        }
    }

}

export default Trade;
