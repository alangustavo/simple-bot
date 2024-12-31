import type { Interval } from '@binance/connector-typescript';
import Kline from './Kline';
import type { Signal, TradeSignal } from './types';
import * as path from 'node:path';
import TelegramBot from './TelegramBot';
import CsvWriter from './CsvWriter';
import Trades from './Trades';
export class BinanceTradeAlan {
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
        let price: number;
        let tradeSignal: TradeSignal;
        try {
            price = this.kline.getPrice();
        } catch (error) {
            console.error(`Failed to get price for ${this.getName()}:`, error);
            tradeSignal = {
                symbol: this.symbol,
                signal: 'HOLD',
                resitenceDistance: 0,
                price: 0
            };
            return tradeSignal;
        }
        try {
            price = await this.kline.getPrice();
        } catch (error) {
            console.error(`Failed to get price for ${this.symbol}_${this.interval}:`, error);
            return {
                symbol: this.symbol,
                price: 0,
                signal: 'HOLD',
                resitenceDistance: 0
            };
        }
        const { support, resistance } = this.calculateSupportResistance();
        const bands = this.calculateBollingerBands(20);
        const movingAverage = this.calculateMovingAverage(50);
        const trades = await Trades.getInstance();
        // this.trade = await trades.getLastOpenTrade(this.symbol);
        // if (this.trade) {
        //     this.trade.setActualPrice(price);
        // }


        const isPriceNearSupport1 = price >= support[0] && price <= support[0] * 1.005; // Ajuste para 1.005
        const isPriceNearSupport2 = price >= support[1] && price <= support[1] * 1.01; // Ajuste para 1.01

        const isPriceNearResistance1 = price <= resistance[0] && price >= resistance[0] * 0.995; // Ajuste para 0.995
        const isPriceNearResistance2 = price <= resistance[1] && price >= resistance[1] * 0.995; // Ajuste para 0.995
        const resitenceDistance = (((resistance[0] + resistance[1]) / 2) / price);

        const isBetweenMiddleAndUpper = price > bands.middle && price < bands.upper;

        const isBelowLowerBand = price < bands.lower;
        const isPriceAboveMA = price > movingAverage;
        const isBetweenLowerAndMiddle = price > bands.lower && price < bands.middle;
        let signal: Signal = 'HOLD';
        tradeSignal = { symbol: this.symbol, signal: 'HOLD', resitenceDistance: resitenceDistance, price };

        if ((isPriceNearSupport1 || isPriceNearSupport2) && (isBelowLowerBand || isPriceAboveMA) && (isBetweenLowerAndMiddle)) {
            signal = 'BUY';
            tradeSignal = { symbol: this.symbol, signal: 'BUY', resitenceDistance: resitenceDistance, price };
            // if (!this.trade || !this.trade.isOpen()) {
            //     this.trade = new Trade(this.symbol, price);
            // }
        }


        if ((isPriceNearResistance1 || isPriceNearResistance2) && (isBetweenMiddleAndUpper)) {
            signal = 'SELL';
            tradeSignal = { symbol: this.symbol, signal: 'SELL', resitenceDistance: resitenceDistance, price };
            // if (this.trade?.isOpen()) {
            //     this.trade.sell(price);
            //     this.trade.sendTradeMessage();
            // }
        }

        if (this.lastSignal !== signal && signal !== 'HOLD') {
            this.lastSignal = signal;
            const telegram = TelegramBot.getInstance();
            telegram.sendMessage(`${process.env.COMPUTER}:Trade_Alan ${this.getName()}: ${signal} ${price}`);
        }
        const dateTime = new Date().toISOString();
        const csvFileName = `${this.getName()}.csv`;
        const csvHeader = 'Date,Current Price,Support1,Support2,Resistance1,Resistance2,Upper Band,Lower Band,Moving Average,Signal\n';
        const csvRow = `${dateTime},${price},${support[0]},${support[1]},${resistance[0]},${resistance[1]},${bands.upper},${bands.lower},${movingAverage},${signal}\n`;
        this.csvWriter.writeCsv(csvFileName, csvHeader, csvRow);

        return tradeSignal;
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