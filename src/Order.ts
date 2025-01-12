import type { Side, OrderType } from '@binance/connector-typescript';
import BinanceClientSingleton from './BinanceClientSingleton';
import BinanceCryptoInfo from './BinanceCryptoInfo';

export class Order {
    id: string;
    symbol: string;
    quantity: number;
    price: number;
    type: 'market' | 'limit';
    status: 'open' | 'closed' | 'canceled';

    constructor(id: string, symbol: string, quantity: number, price: number, type: 'market' | 'limit') {
        this.id = id;
        this.symbol = symbol;
        this.quantity = quantity;
        this.price = price;
        this.type = type;
        this.status = 'open';
    }

    async execute() {
        const client = BinanceClientSingleton.getInstance();
        if (this.type === 'market') {
            try {
                const stepSize = await this.getStepSize(this.symbol);
                const quantity = this.formatQuantity(this.quantity, stepSize);
                const response = await client.newOrder(this.symbol, 'BUY' as Side, 'MARKET' as OrderType, {
                    quantity: quantity,
                });
                this.status = 'closed';
                console.log(`Market order executed: ${quantity} of ${this.symbol} at market price.`, response);
            } catch (error) {
                console.error('Error executing market order:', error);
            }
        } else if (this.type === 'limit') {
            console.log(`Limit order placed: ${this.quantity} of ${this.symbol} at ${this.price}.`);
        }
    }

    async getStepSize(symbol: string): Promise<number> {
        const cryptoInfo = BinanceCryptoInfo.getInstance();
        const symbolInfo = await cryptoInfo.getSymbolInfo(symbol);
        return symbolInfo.stepSize;
    }

    formatQuantity(quantity: number, stepSize: number): number {
        return Math.floor(quantity / stepSize) * stepSize;
    }

    cancel() {
        if (this.status === 'open') {
            this.status = 'canceled';
            console.log(`Order ${this.id} canceled.`);
        } else {
            console.log(`Order ${this.id} cannot be canceled.`);
        }
    }
}