import type { Interval } from '@binance/connector-typescript';
import BinanceClientSingleton from './BinanceClientSingleton';
import Kline from './Kline';
import type { KlineData } from './types';
import * as fs from 'fs';
import * as path from 'path';

class VolatilityMonitor {
    private quote: string;
    private volumeThreshold: number;
    private interval: Interval;
    private candlesCount: number;
    private klinesMap: Map<string, Kline> = new Map();

    constructor(quote: string, volumeThreshold: number, interval: Interval, candlesCount: number) {
        this.quote = quote;
        this.volumeThreshold = volumeThreshold;
        this.interval = interval;
        this.candlesCount = candlesCount;
    }

    public async updateSymbols(): Promise<void> {
        try {
            const client = BinanceClientSingleton.getInstance();
            const tickers = await client.ticker24hr();

            if (Array.isArray(tickers)) {
                const highVolumeSymbols = tickers.filter((ticker: { symbol: string; quoteVolume: string; }) => {
                    const quoteVolume = Number.parseFloat(ticker.quoteVolume);
                    return ticker.symbol.endsWith(this.quote) && quoteVolume >= this.volumeThreshold;
                });

                // Add new high volume symbols to the map
                for (const ticker of highVolumeSymbols) {
                    if (!this.klinesMap.has(ticker.symbol)) {
                        const klines = new Kline(ticker.symbol, this.interval, this.candlesCount);
                        this.klinesMap.set(ticker.symbol, klines);
                    }
                }

                // Remove symbols that no longer meet the volume threshold
                for (const symbol of this.klinesMap.keys()) {
                    if (!highVolumeSymbols.some(ticker => ticker.symbol === symbol)) {
                        this.klinesMap.delete(symbol);
                    }
                }
            } else {
                console.error('Failed to retrieve tickers as an array');
            }
        } catch (error) {
            console.error('Error updating symbols:', error);
        }
    }

    public evaluateSymbols(): void {
        const csvFilePath = path.join(__dirname, 'volatility_data.csv');
        const csvHeader = 'Date,Symbol,Current Price,Support,Resistance,Recommendation\n';

        if (!fs.existsSync(csvFilePath)) {
            fs.writeFileSync(csvFilePath, csvHeader);
        }

        for (const [symbol, klines] of this.klinesMap) {
            const klineData = klines.getKlines();

            if (klineData.length > 0) {
                const support = this.calculateSupport(klineData);
                const resistance = this.calculateResistance(klineData);
                const currentPrice = klineData[klineData.length - 1].close;
                const dateTime = new Date().toISOString();
                let recommendation = '';

                if (currentPrice <= support) {
                    recommendation = 'Buy';
                    console.log(`Potential buy opportunity for ${symbol} at ${currentPrice}, support at ${support}`);
                } else if (currentPrice >= resistance) {
                    recommendation = 'Sell';
                    console.log(`Potential sell opportunity for ${symbol} at ${currentPrice}, resistance at ${resistance}`);
                }

                const csvRow = `${dateTime},${symbol},${currentPrice},${support},${resistance},${recommendation}\n`;
                fs.appendFileSync(csvFilePath, csvRow);
            } else {
                console.warn(`No kline data available for ${symbol}`);
            }
        }
    }

    private calculateSupport(klines: KlineData[]): number {
        const supports = klines.map(kline => kline.low);
        const support = supports.reduce((acc, low) => acc + low, 0) / supports.length;
        return support;
    }

    private calculateResistance(klines: KlineData[]): number {
        const resistances = klines.map(kline => kline.high);
        const resistance = resistances.reduce((acc, high) => acc + high, 0) / resistances.length;
        return resistance;
    }
}

export default VolatilityMonitor;
