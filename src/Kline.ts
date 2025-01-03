import type { Interval } from '@binance/connector-typescript';
import BinanceClientSingleton from './BinanceClientSingleton';
import BinanceKlineStream from './BinanceKlineStream';
import type { ObserverKline, KlineData, Signal } from './types';



class Kline implements ObserverKline {
    public symbol: string;
    public interval: Interval;
    public stream: string;
    private limit: number;
    private klines: KlineData[] = [];
    private static instances: Map<string, Kline> = new Map();

    public static getInstance(symbol: string, interval: Interval, limit = 500): Kline {
        const key = `${symbol}_${interval}`;
        if (!Kline.instances.has(key)) {
            Kline.instances.set(key, new Kline(symbol, interval, limit));
        }
        const instance = Kline.instances.get(key);
        if (!instance) {
            throw new Error(`Instance for ${key} not found`);
        }
        return instance;
    }

    private constructor(symbol: string, interval: Interval, limit: number) {
        this.symbol = symbol;
        this.interval = interval;
        this.limit = limit;
        this.stream = `${this.symbol.toLowerCase()}@kline_${this.interval}`;
        this.initialize();
    }

    private async initialize() {
        const client = BinanceClientSingleton.getInstance();
        const historicalKlines = await client.klineCandlestickData(this.symbol.toUpperCase(), this.interval, { limit: this.limit });

        this.klines = historicalKlines.map((kline: (string | number)[]) => ({
            openTime: kline[0] as number,
            open: Number.parseFloat(kline[1] as string),
            high: Number.parseFloat(kline[2] as string),
            low: Number.parseFloat(kline[3] as string),
            close: Number.parseFloat(kline[4] as string),
            volume: Number.parseFloat(kline[5] as string),
            closeTime: kline[6] as number,
            quoteAssetVolume: Number.parseFloat(kline[7] as string),
            numberOfTrades: kline[8] as number,
            takerBuyBaseAssetVolume: Number.parseFloat(kline[9] as string),
            takerBuyQuoteAssetVolume: Number.parseFloat(kline[10] as string),
        }));

        const stream = BinanceKlineStream.getInstance();
        stream.subscribeToKline(this);
    }

    public update(data: Record<string, unknown>): void {
        const lastKline = this.klines[this.klines.length - 1];
        if (this.stream === data.stream) {
            const kline = (data.data as Record<string, unknown>).k as {
                t: number;
                T: number;
                o: string;
                c: string;
                h: string;
                l: string;
                v: string;
                n: number;
                x: boolean;
                q: string;
                V: string;
                Q: string;
                B: string;
            };

            const klineData: KlineData = {
                openTime: kline.t,
                open: Number.parseFloat(kline.o),
                high: Number.parseFloat(kline.h),
                low: Number.parseFloat(kline.l),
                close: Number.parseFloat(kline.c),
                volume: Number.parseFloat(kline.v),
                closeTime: kline.T,
                quoteAssetVolume: Number.parseFloat(kline.q),
                numberOfTrades: kline.n,
                takerBuyBaseAssetVolume: Number.parseFloat(kline.V),
                takerBuyQuoteAssetVolume: Number.parseFloat(kline.Q),
            };

            if (lastKline.openTime !== klineData.openTime) {
                this.klines.shift();
                this.klines.push(klineData);
            } else {
                this.klines[this.klines.length - 1] = klineData;
            }
        }
    }

    public getKlines(): KlineData[] {
        return this.klines;
    }
    public getCloses(): number[] {
        return this.klines.map(kline => kline.close);
    }
    public getPrice() {
        if (this.klines.length === 0) {
            throw new Error('No klines available');
        }
        return this.klines[this.klines.length - 1].close;
    }
    public getHighs(): number[] {
        return this.klines.map(kline => kline.high);
    }
    public getLows(): number[] {
        return this.klines.map(kline => kline.low);
    }

}

export default Kline;
