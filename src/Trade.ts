import TelegramBot from './TelegramBot';
import DatabaseSingleton from './DatabaseSingleton';
import BinanceCryptoInfo from './BinanceCryptoInfo';

class Trade {
    private id?: number;
    private symbol: string;
    private buyPrice: number;
    private sellPrice!: number;
    private buyDate: Date;
    private sellDate?: Date;
    private open = true;
    private telegramBot: TelegramBot;

    constructor(symbol: string, buyPrice: number, id?: number) {
        this.buyPrice = buyPrice;
        this.symbol = symbol;
        this.buyDate = new Date();
        this.telegramBot = TelegramBot.getInstance();
        this.save();
    }

    public getSymbol() {
        return this.symbol;
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
        if (this.buyDate && this.symbol) {
            const result = await db.run(
                'INSERT OR REPLACE INTO trades(symbol, buyPrice, sellPrice, buyDate, sellDate, open) VALUES(?, ?, ?, ?, ?, ?)',
                this.symbol, this.buyPrice, this.sellPrice, this.buyDate.getTime(), this.sellDate?.getTime(), this.open ? 1 : 0
            );
        }
    }

    public setActualPrice(sellPrice: number) {
        this.sellPrice = sellPrice;
        this.save();
    }

    public sell(sellPrice: number) {
        if (this.open) {
            const result = sellPrice / this.buyPrice;
            if (result < 0.99 || result > 1.007) {
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

    public getBuyPrice() {
        return this.buyPrice;
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

        const dec1 = this.getDecimalPlacesFromString(this.buyPrice.toString());
        const dec2 = this.getDecimalPlacesFromString(this.sellPrice.toString());
        const fixed = Math.max(dec1, dec2);
        const symbolInfo = await BinanceCryptoInfo.getInstance().getSymbolInfo(this.symbol);
        const buyDateFormatted = this.formatDate(this.buyDate);
        const sellDateFormatted = this.sellDate ? this.formatDate(this.sellDate) : 'N/A        ';
        const buyPriceFormatted = this.buyPrice.toFixed(fixed);
        const sellPriceFormatted = this.sellPrice ? this.sellPrice.toFixed(fixed) : 'N/A        ';
        const resultFormatted = ((this.getResult() - 1) * 100).toFixed(2);
        const emoji = this.getResult() > 1 ? "😀" : "😮";
        let message = `SYMBOL.: ${this.symbol.toUpperCase()}\n`;
        message += `BUY....: ${buyDateFormatted} ${buyPriceFormatted}\n`;
        message += `SELL...: ${sellDateFormatted} ${sellPriceFormatted}\n`;
        message += `P/L....: ${resultFormatted}% ${emoji}\n\n`;
        console.log(message);
        return message;
    }

    getDecimalPlacesFromString(numStr: string): number {
        const decimalIndex = numStr.indexOf('.');
        if (decimalIndex === -1) return 0;
        return numStr.length - decimalIndex - 1;
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
