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

export interface BalanceData {
    asset: string;
    free: number;
    locked: number;
}

export interface Observer {
    update(data: Record<string, unknown>): void;
}
export interface ObserverKline extends Observer {
    symbol: string;
    interval: Interval;
    stream: string;
}

export interface Observable {
    addObserver(observer: Observer): void;
    removeObserver(observer: Observer): void;
    notifyObservers(data: Record<string, unknown>): void;
}
