import type { Interval } from '@binance/connector-typescript';
import Kline from './Kline';
import type { Signal, TradeSignal } from './types';
import * as path from 'node:path';
import TelegramBot from './TelegramBot';
import CsvWriter from './CsvWriter';
import Trades from './Trades';
export class BinanceMarketAnalist {
    private symbol: string;
    private interval: Interval;
    private kline: Kline;
    // private trade: Trade | undefined | null;
    private lastSignal: Signal = 'HOLD';
    private csvWriter: CsvWriter;


    constructor(symbol: string, interval: Interval) {
        this.symbol = symbol;
        this.interval = interval;
        this.kline = Kline.getInstance(symbol, interval);
        this.csvWriter = new CsvWriter(path.join(__dirname, 'csv'));
    }

    public getSymbol(): string {
        return this.symbol;
    }

    public getName(): string {
        return `${this.symbol}_${this.interval}`;
    }

    private calculateMovingAverage(period: number): number {
        const closes = this.kline.getCloses().slice(-period);
        return closes.reduce((sum, close) => sum + close, 0) / period;
    }

    public async getTradingSignal(): Promise<TradeSignal> {
        const shortTermPeriod = 7;
        const longTermPeriod = 25;

        const shortTermMA = this.calculateMovingAverage(shortTermPeriod);
        const longTermMA = this.calculateMovingAverage(longTermPeriod);
        const currentPrice = this.kline.getCloses().slice(-1)[0];

        let signal: Signal = 'HOLD';

        if (shortTermMA > longTermMA && currentPrice > shortTermMA) {
            signal = 'BUY';
        } else if (shortTermMA < longTermMA && currentPrice < shortTermMA) {
            signal = 'SELL';
        }

        this.lastSignal = signal;

        return {
            symbol: this.symbol,
            signal,
            shortTermMA,
            longTermMA,
            price: currentPrice,
            strength: currentPrice / shortTermMA
        };
    }

}