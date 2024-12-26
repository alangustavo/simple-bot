import { Spot } from '@binance/connector-typescript';
import 'dotenv/config';

const apiKey = process.env.BINANCE_API_KEY || '';
const apiSecret = process.env.BINANCE_API_SECRET || '';

class BinanceClientSingleton {
    private static instance: Spot;

    private constructor() { }

    public static getInstance(): Spot {
        if (!BinanceClientSingleton.instance) {
            BinanceClientSingleton.instance = new Spot(apiKey, apiSecret);
        }
        return BinanceClientSingleton.instance;
    }
}

export default BinanceClientSingleton;
