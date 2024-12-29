import type { Interval } from '@binance/connector-typescript';
import BinanceClientSingleton from './BinanceClientSingleton';
import BinanceKlineStream from './BinanceKlineStream';
import type { ObserverKline, KlineData, Signal } from './types';
import * as fs from 'node:fs';
import * as path from 'node:path';
import TelegramBot from './TelegramBot';

class Kline implements ObserverKline {
    public symbol: string;
    public interval: Interval;
    public stream: string;
    private limit: number;
    private klines: KlineData[] = [];
    private lastSignal: Signal = 'BUY';

    constructor(symbol: string, interval: Interval, limit: number) {
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

    public getPrice() {
        return this.klines[this.klines.length - 1].close;
    }

    private calculateMovingAverage(period: number): number {
        const closes = this.getCloses().slice(-period);
        return closes.reduce((sum, close) => sum + close, 0) / period;
    }

    public getCloses(): number[] {
        return this.klines.map(kline => kline.close);
    }

    public getTradingSignal(): Signal {
        const price = this.getPrice();
        const { support, resistance } = this.calculateSupportResistance();
        const bands = this.calculateBollingerBands(20);
        const movingAverage = this.calculateMovingAverage(50);

        let signal: Signal = 'HOLD';

        const isPriceNearSupport1 = price >= support[0] && price <= support[0] * 1.02;
        const isPriceNearSupport2 = price >= support[1] && price <= support[1] * 1.02;
        const isBelowLowerBand = price < bands.lower;
        const isPriceAboveMA = price > movingAverage;

        if ((isPriceNearSupport1 || isPriceNearSupport2) && (isBelowLowerBand || isPriceAboveMA)) {
            signal = 'BUY';
        }

        const isPriceNearResistance1 = price <= resistance[0] && price >= resistance[0] * 0.98;
        const isPriceNearResistance2 = price <= resistance[1] && price >= resistance[1] * 0.98;
        const isAboveUpperBand = price > bands.upper;

        if ((isPriceNearResistance1 || isPriceNearResistance2) && isAboveUpperBand) {
            signal = 'SELL';
        }

        if (this.lastSignal !== signal) {
            this.lastSignal = signal;
            const telegram = TelegramBot.getInstance();
            const chatId = process.env.TELEGRAM_CHAT_ID;
            if (chatId) {
                telegram.sendMessage(chatId, `${process.env.COMPUTER}: Trading signal for ${this.symbol}_${this.interval}: ${signal} ${price}`);
            } else {
                console.error('TELEGRAM_CHAT_ID is not defined');
            }
        }
        const dateTime = new Date().toISOString();
        const csvFilePath = path.join(__dirname, `${this.symbol}_${this.interval}.csv`);
        const csvHeader = 'Date,Current Price,Support1,Support2,Resistance1,Resistance2,Upper Band,Lower Band,Moving Average,Signal\n';

        if (!fs.existsSync(csvFilePath)) {
            fs.writeFileSync(csvFilePath, csvHeader);
        }
        const csvRow = `${dateTime},${price},${support[0]},${support[1]},${resistance[0]},${resistance[1]},${bands.upper},${bands.lower},${movingAverage},${signal}\n`;
        fs.appendFileSync(csvFilePath, csvRow);

        return signal;
    }

    private calculateSupportResistance(): { support: number[]; resistance: number[]; } {
        const highs = this.getHighs();
        const lows = this.getLows();

        const support = [
            Math.min(...lows.slice(-10)), // Support1 from the last 10 klines
            Math.min(...lows.slice(-20, -10)) // Support2 from the last 20 to 10 klines
        ];
        const resistance = [
            Math.max(...highs.slice(-10)), // Resistance1 from the last 10 klines
            Math.max(...highs.slice(-20, -10)) // Resistance2 from the last 20 to 10 klines
        ];

        return { support, resistance };
    }

    calculateBollingerBands(period: number): { upper: number; lower: number; } {
        const closes = this.getCloses().slice(-period);
        const mean = closes.reduce((sum, close) => sum + close, 0) / period;

        const stddev = Math.sqrt(closes.map((close) => (close - mean) ** 2).reduce((a, b) => a + b, 0) / period);

        return { upper: mean + 2 * stddev, lower: mean - 2 * stddev };
    }

    public getHighs(): number[] {
        return this.klines.map(kline => kline.high);
    }

    public getLows(): number[] {
        return this.klines.map(kline => kline.low);
    }
}

export default Kline;
