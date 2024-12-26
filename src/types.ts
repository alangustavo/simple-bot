import type { Interval } from "@binance/connector-typescript";

export interface KlineData {
    openTime: number;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
    closeTime: number;
    quoteAssetVolume: number;
    numberOfTrades: number;
    takerBuyBaseAssetVolume: number;
    takerBuyQuoteAssetVolume: number;
    // ignore: string;
}

export interface Observer {
    update(data: Record<string, unknown>): void;
}
export interface ObserverKline extends Observer {
    symbol: string;
    interval: Interval;
}

export interface Observable {
    addObserver(observer: Observer): void;
    removeObserver(observer: Observer): void;
    notifyObservers(stream: string, data: Record<string, unknown>): void;
}
