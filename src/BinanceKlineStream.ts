import { type Interval, WebsocketStream } from '@binance/connector-typescript';
import type { Observable, ObserverKline } from './types';

class BinanceKlineStream implements Observable {
    private static instance: BinanceKlineStream;
    private websocketStreamClient: WebsocketStream;
    private observers: Set<ObserverKline> = new Set();
    private activeStreams: { symbol: string, interval: Interval; }[] = [];
    private lastNotificationTime: number = Date.now();

    private constructor() {
        const callbacks = {
            open: () => console.debug('BinanceKlineStream: Connected to WebSocket server'),
            close: () => {
                console.debug('BinanceKlineStream: Disconnected from WebSocket server');
                this.reconnect();
            },
            message: (data: string) => {
                const parsedData = JSON.parse(data);
                this.notifyObservers(parsedData);
            },
        };
        this.websocketStreamClient = new WebsocketStream({ callbacks, combinedStreams: true });
        this.startReconnectionTimer();
        this.startNotificationCheckTimer();
    }

    public static getInstance(): BinanceKlineStream {
        if (!BinanceKlineStream.instance) {
            BinanceKlineStream.instance = new BinanceKlineStream();
            console.log('BinanceKlineStream instance created');
        }
        return BinanceKlineStream.instance;
    }

    public addObserver(observer: ObserverKline): void {
        this.observers.add(observer);
        console.log(`Quantidade de Observers ${this.observers.size}`);

    }

    public removeObserver(observer: ObserverKline): void {
        this.observers.delete(observer);
    }


    public notifyObservers(data: Record<string, unknown>): void {
        this.lastNotificationTime = Date.now();
        for (const observer of this.observers) {
            if (observer.stream === data.stream) {
                observer.update(data);
            }
        }
    }

    private startNotificationCheckTimer() {
        setInterval(() => {
            const currentTime = Date.now();
            if (currentTime - this.lastNotificationTime > 60 * 1000) { // 1 minute in milliseconds
                console.debug('BinanceKlineStream: No notifications in the last minute, reconnecting');
                this.websocketStreamClient.disconnect();
                this.reconnect();
            }
        }, 60 * 1000); // Check every minute
    }

    public subscribeToKline(observer: ObserverKline) {
        this.websocketStreamClient.kline(observer.symbol.toLowerCase(), observer.interval);
        this.activeStreams.push({ symbol: observer.symbol, interval: observer.interval });
        this.addObserver(observer);
    }

    public unsubscribeFromKline(symbol: string, interval: Interval) {
        this.websocketStreamClient.unsubscribe(`${symbol.toLowerCase()}@kline_${interval}`);
        this.activeStreams = this.activeStreams.filter(stream => stream.symbol !== symbol || stream.interval !== interval);
        this.observers = new Set([...this.observers].filter(observer => observer.symbol !== symbol || observer.interval !== interval));
    }

    public disconnect() {
        this.websocketStreamClient.disconnect();
    }

    private reconnect() {
        setTimeout(() => {
            console.debug('BinanceKlineStream: Reconnecting to WebSocket server');
            this.websocketStreamClient = new WebsocketStream({
                callbacks: {
                    open: () => console.debug('BinanceKlineStream: Reconnected to WebSocket server'),
                    close: () => {
                        console.debug('BinanceKlineStream: Disconnected from WebSocket server');
                        this.reconnect();
                    },
                    message: (data: string) => {
                        const parsedData = JSON.parse(data);
                        const stream = parsedData.stream;
                        this.notifyObservers(parsedData);
                    },
                },
                combinedStreams: true
            });

            // Re-subscribe to all active streams
            for (const { symbol, interval } of this.activeStreams) {
                this.websocketStreamClient.kline(symbol.toLowerCase(), interval);
            }
        }, 1000); // Wait 1 second before attempting to reconnect
    }

    private startReconnectionTimer() {
        setTimeout(() => {
            console.debug('BinanceKlineStream: 24 hours passed, reconnecting to WebSocket server');
            this.websocketStreamClient.disconnect();
            this.reconnect();
        }, 24 * 60 * 60 * 1000); // 24 hours in milliseconds
    }
}

export default BinanceKlineStream;
