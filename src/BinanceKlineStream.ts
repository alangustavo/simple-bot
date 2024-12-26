import { type Interval, WebsocketStream } from '@binance/connector-typescript';
import type { Observable, ObserverKline } from './types';


class BinanceKlineStream implements Observable {
    private static instance: BinanceKlineStream;
    private websocketStreamClient: WebsocketStream;
    private observers: ObserverKline[] = [];
    private activeStreams: { symbol: string, interval: Interval; }[] = [];

    private constructor() {
        const callbacks = {
            open: () => console.debug('BinanceKlineStream: Connected to WebSocket server'),
            close: () => {
                console.debug('BinanceKlineStream: Disconnected from WebSocket server');
                this.reconnect();
            },
            message: (data: string) => {
                const parsedData = JSON.parse(data);
                const stream = parsedData.stream;
                this.notifyObservers(stream, parsedData);
            },
        };
        this.websocketStreamClient = new WebsocketStream({ callbacks, combinedStreams: true });
    }

    public static getInstance(): BinanceKlineStream {
        if (!BinanceKlineStream.instance) {
            BinanceKlineStream.instance = new BinanceKlineStream();
        }
        return BinanceKlineStream.instance;
    }

    public addObserver(observer: ObserverKline): void {
        this.observers.push(observer);
    }

    public removeObserver(observer: ObserverKline): void {
        this.observers = this.observers.filter(obs => obs !== observer);
    }

    public notifyObservers(stream: string, data: Record<string, unknown>): void {
        for (const observer of this.observers) {
            if (`${observer.symbol.toLowerCase()}@kline_${observer.interval}` === stream) {
                observer.update(data);
            }
        }
    }

    public subscribeToKline(observer: ObserverKline) {
        this.websocketStreamClient.kline(observer.symbol.toLowerCase(), observer.interval);
        this.activeStreams.push({ symbol: observer.symbol, interval: observer.interval });
        this.addObserver(observer);
    }

    public unsubscribeFromKline(symbol: string, interval: Interval) {
        this.websocketStreamClient.unsubscribe(`${symbol.toLowerCase()}@kline_${interval}`);
        this.activeStreams = this.activeStreams.filter(stream => stream.symbol !== symbol || stream.interval !== interval);
        this.observers = this.observers.filter(observer => observer.symbol !== symbol || observer.interval !== interval);
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
                        this.notifyObservers(stream, parsedData);
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
}

export default BinanceKlineStream;
