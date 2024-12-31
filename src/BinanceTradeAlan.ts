import type { Interval } from '@binance/connector-typescript';
import Kline from './Kline';
import Trade from './Trade';
import type { Signal } from './types';
import * as fs from 'node:fs';
import * as path from 'node:path';
import TelegramBot from './TelegramBot';
import CsvWriter from './CsvWriter';
import Trades from './Trades';

export class BinanceTradeAlan {
    private symbol: string;
    private interval: Interval;
    private kline: Kline;
    private trade: Trade | undefined | null;
    private lastSignal: Signal = 'HOLD';
    private csvWriter: CsvWriter;

    constructor(symbol: string, interval: Interval) {
        this.symbol = symbol;
        this.interval = interval;
        this.kline = Kline.getInstance(symbol, interval);
        this.csvWriter = new CsvWriter(path.join(__dirname, 'csv'));
    }

    private calculateMovingAverage(period: number): number {
        const closes = this.kline.getCloses().slice(-period);
        return closes.reduce((sum, close) => sum + close, 0) / period;
    }


    public async getTradingSignal(): Promise<Signal> {
        let price: number;
        try {
            price = this.kline.getPrice();
        } catch (error) {
            console.error(`Failed to get price for ${this.symbol}_${this.interval}:`, error);
            return 'HOLD';
        }
        const { support, resistance } = this.calculateSupportResistance();
        const bands = this.calculateBollingerBands(20);
        const movingAverage = this.calculateMovingAverage(50);
        const trades = await Trades.getInstance();
        this.trade = await trades.getLastOpenTrade(this.symbol);
        if (this.trade) {
            this.trade.setActualPrice(price);
        }

        let signal: Signal = 'HOLD';

        const isPriceNearSupport1 = price >= support[0] && price <= support[0] * 1.005; // Ajuste para 1.005
        const isPriceNearSupport2 = price >= support[1] && price <= support[1] * 1.01; // Ajuste para 1.01
        const isBelowLowerBand = price < bands.lower;
        const isPriceAboveMA = price > movingAverage;
        const isBetweenLowerAndMiddle = price > bands.lower && price < bands.middle;

        if ((isPriceNearSupport1 || isPriceNearSupport2) && (isBelowLowerBand || isPriceAboveMA) && isBetweenLowerAndMiddle) {
            signal = 'BUY';
            if (!this.trade || !this.trade.isOpen()) {
                this.trade = new Trade(this.symbol, price);
            }
        }

        const isPriceNearResistance1 = price <= resistance[0] && price >= resistance[0] * 0.995; // Ajuste para 0.995
        const isPriceNearResistance2 = price <= resistance[1] && price >= resistance[1] * 0.995; // Ajuste para 0.995

        const isBetweenMiddleAndUpper = price > bands.middle && price < bands.upper;

        if ((isPriceNearResistance1 || isPriceNearResistance2) && isBetweenMiddleAndUpper) {
            signal = 'SELL';
            if (this.trade?.isOpen()) {
                this.trade.sell(price);
                this.trade.sendTradeMessage();
            }
        }

        if (this.lastSignal !== signal && signal !== 'HOLD') {
            this.lastSignal = signal;
            const telegram = TelegramBot.getInstance();
            telegram.sendMessage(`${process.env.COMPUTER}:Trade_Alan ${this.symbol}_${this.interval}: ${signal} ${price}`);
        }
        const dateTime = new Date().toISOString();
        const csvFileName = `${this.symbol}_${this.interval}.csv`;
        const csvHeader = 'Date,Current Price,Support1,Support2,Resistance1,Resistance2,Upper Band,Lower Band,Moving Average,Signal\n';
        const csvRow = `${dateTime},${price},${support[0]},${support[1]},${resistance[0]},${resistance[1]},${bands.upper},${bands.lower},${movingAverage},${signal}\n`;

        this.csvWriter.writeCsv(csvFileName, csvHeader, csvRow);

        return signal;
    }

    private calculateSupportResistance(): { support: number[]; resistance: number[]; } {
        const highs = this.kline.getHighs();
        const lows = this.kline.getLows();

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

    calculateBollingerBands(period: number): { upper: number; lower: number; middle: number; } {
        const closes = this.kline.getCloses().slice(-period);
        const mean = closes.reduce((sum, close) => sum + close, 0) / period;

        const stddev = Math.sqrt(closes.map((close) => (close - mean) ** 2).reduce((a, b) => a + b, 0) / period);

        return { upper: mean + 2 * stddev, lower: mean - 2 * stddev, middle: ((mean + 2 * stddev) + (mean - 2 * stddev)) / 2 };
    }
}