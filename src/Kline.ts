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
            // ignore: kline[11] as string,
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
                // ignore: kline.B,
            };

            if (lastKline.openTime !== klineData.openTime) { // kline is closed
                this.klines.shift(); // Remove the first kline
                this.klines.push(klineData); // Add the new closed kline
            } else {
                this.klines[this.klines.length - 1] = klineData; // Update the last kline
            }
            // console.log(klineData, this.klines.length);
            // console.log(this.getCloses());
        }
    }

    public getKlines(): KlineData[] {
        return this.klines;
    }

    public getPrice() {
        return this.klines[this.klines.length - 1].close;
    }

    public getCloses(): number[] {
        return this.klines.map(kline => kline.close);
    }

    public getOpens(): number[] {
        return this.klines.map(kline => kline.open);
    }

    public getHighs(): number[] {
        return this.klines.map(kline => kline.high);
    }

    public getLows(): number[] {
        return this.klines.map(kline => kline.low);
    }

    public getVolumes(): number[] {
        return this.klines.map(kline => kline.volume);
    }

    public getQuoteAssetVolumes(): number[] {
        return this.klines.map(kline => kline.quoteAssetVolume);
    }

    public getTakerBuyBaseAssetVolumes(): number[] {
        return this.klines.map(kline => kline.takerBuyBaseAssetVolume);
    }

    public getTakerBuyQuoteAssetVolumes(): number[] {
        return this.klines.map(kline => kline.takerBuyQuoteAssetVolume);
    }

    calculatePivotPoints(): { pivot: number; support: number[]; resistance: number[]; } {
        const high = Math.max(...this.getHighs());
        const low = Math.min(...this.getLows());
        const close = this.getPrice();

        const pivot = (high + low + close) / 3;
        const resistance = [2 * pivot - low, pivot + (high - low)];
        const support = [2 * pivot - high, pivot - (high - low)];

        return { pivot, support, resistance };
    }

    calculateRSI(period: number): number {
        let gains = 0;
        let losses = 0;
        const closes = this.getCloses();
        for (let i = 1; i < period + 1; i++) {
            const change = closes[i] - closes[i - 1];
            if (change > 0) gains += change;
            else losses -= change;
        }

        const averageGain = gains / period;
        const averageLoss = losses / period;

        const rs = averageGain / averageLoss;
        return 100 - 100 / (1 + rs);
    }

    calculateBollingerBands(period: number): { upper: number; lower: number; } {
        const closes = this.getCloses().slice(-period);
        const mean = closes.reduce((sum, close) => sum + close, 0) / period;

        const stddev = Math.sqrt(closes.map((close) => (close - mean) ** 2).reduce((a, b) => a + b, 0) / period);

        return { upper: mean + 2 * stddev, lower: mean - 2 * stddev };
    }

    public getTradingSignal(): Signal {
        const price = this.getPrice();
        const pivotLevels = this.calculatePivotPoints();
        const rsi = this.calculateRSI(14);
        const bands = this.calculateBollingerBands(20);
        const dateTime = new Date().toISOString();
        const csvFilePath = path.join(__dirname, `${this.symbol}.csv`);
        const csvHeader = 'Date,Current Price,Pivot,Support1,Support2,Resistance1,Resistance2,RSI,Upper Band,Lower Band,Signal\n';

        if (!fs.existsSync(csvFilePath)) {
            fs.writeFileSync(csvFilePath, csvHeader);
        }

        let signal: Signal = 'HOLD';

        // Buy conditions
        const isPriceNearSupport = price <= pivotLevels.support[0] * 1.01; // 1% above support
        const isOversold = rsi < 30;
        const isBelowLowerBand = price < bands.lower;

        if (isPriceNearSupport && isOversold && isBelowLowerBand) {
            signal = 'BUY';
        }

        // Sell conditions
        const isPriceNearResistance = price >= pivotLevels.resistance[0] * 0.99; // 1% below resistance
        const isOverbought = rsi > 70;
        const isAboveUpperBand = price > bands.upper;

        if (isPriceNearResistance && isOverbought && isAboveUpperBand) {
            signal = 'SELL';
        }

        const csvRow = `${dateTime},${price},${pivotLevels.pivot},${pivotLevels.support[0]},${pivotLevels.support[1]},${pivotLevels.resistance[0]},${pivotLevels.resistance[1]},${rsi},${bands.upper},${bands.lower},${signal}\n`;
        fs.appendFileSync(csvFilePath, csvRow);
        if (this.lastSignal !== signal) {
            this.lastSignal = signal;
            const telegram = TelegramBot.getInstance();
            const chatId = process.env.TELEGRAM_CHAT_ID;
            if (chatId) {
                telegram.sendMessage(chatId, `Trading signal for ${this.symbol}: ${signal} {${price}}`);
            } else {
                console.error('TELEGRAM_CHAT_ID is not defined');
            }
        }

        return signal;
    }
}

export default Kline;
