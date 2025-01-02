import BinanceCryptoInfo from './BinanceCryptoInfo';
import { OrderType } from '@binance/connector-typescript';
type Order = {
    symbol: string;
    side: OrderSide;
    type: OrderType;
    quantity: string;
    price?: string;
    timeInForce?: string;
};

type OrderSide = 'BUY' | 'SELL';

class BinanceOrder {

    public async createOrder(symbol: string, side: OrderSide, quantity: number, price?: number): Promise<Order> {
        const cryptoInfo = BinanceCryptoInfo.getInstance();
        const symbolInfo = await cryptoInfo.getSymbolInfo(symbol);

        const formattedQuantity = this.formatQuantity(quantity, symbolInfo.quantityScale);
        const formattedPrice = price ? this.formatPrice(price, symbolInfo.priceScale) : undefined;

        const order: Order = {
            symbol,
            side,
            type: price ? OrderType.LIMIT : OrderType.MARKET,
            quantity: formattedQuantity,
            ...(price && { price: formattedPrice }),
            timeInForce: price ? 'GTC' : undefined
        };

        // Aqui você pode adicionar a lógica para enviar a ordem para a Binance usando a API
        console.log('Order created:', order);
        return order;
    }

    private formatQuantity(quantity: number, scale: number): string {
        return quantity.toFixed(scale);
    }

    private formatPrice(price: number, scale: number): string {
        return price.toFixed(scale);
    }
}

export default BinanceOrder;
