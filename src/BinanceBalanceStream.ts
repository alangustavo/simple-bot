import { WebsocketStream } from '@binance/connector-typescript';
import type { Observable, Observer } from './types';

class BinanceBalanceStream implements Observable {
    private static instance: BinanceBalanceStream;
    private websocketStreamClient: WebsocketStream;
    private observers: Set<Observer> = new Set();

    private constructor() {
        const callbacks = {
            open: () => console.debug('BinanceBalanceStream: Connected to WebSocket server'),
            close: () => {
                console.debug('BinanceBalanceStream: Disconnected from WebSocket server');
                this.reconnect();
            },
            message: (data: string) => {
                const parsedData = JSON.parse(data);
                this.notifyObservers(parsedData);
            },
        };
        this.websocketStreamClient = new WebsocketStream({ callbacks, combinedStreams: true });
    }

    public static getInstance(): BinanceBalanceStream {
        if (!BinanceBalanceStream.instance) {
            BinanceBalanceStream.instance = new BinanceBalanceStream();
        }
        return BinanceBalanceStream.instance;
    }

    public addObserver(observer: Observer): void {
        this.observers.add(observer);
        if (this.observers.size === 1) {
            this.subscribeToBalanceUpdates();
        }
        // console.log(`Quantidade de Observers ${this.observers.size}`);
    }

    public removeObserver(observer: Observer): void {
        this.observers.delete(observer);
    }

    public notifyObservers(data: Record<string, unknown>): void {
        for (const observer of this.observers) {
            observer.update(data);
        }
    }

    public subscribeToBalanceUpdates() {
        this.websocketStreamClient.subscribe('!balance@arr');
    }

    public unsubscribeFromBalanceUpdates() {
        this.websocketStreamClient.unsubscribe('!balance@arr');
    }

    public disconnect() {
        this.websocketStreamClient.disconnect();
    }

    private reconnect() {
        setTimeout(() => {
            console.debug('BinanceBalanceStream: Reconnecting to WebSocket server');
            this.websocketStreamClient = new WebsocketStream({
                callbacks: {
                    open: () => console.debug('BinanceBalanceStream: Reconnected to WebSocket server'),
                    close: () => {
                        console.debug('BinanceBalanceStream: Disconnected from WebSocket server');
                        this.reconnect();
                    },
                    message: (data: string) => {
                        const parsedData = JSON.parse(data);
                        this.notifyObservers(parsedData);
                    },
                },
                combinedStreams: true
            });

            // Re-subscribe to balance updates
            this.subscribeToBalanceUpdates();
        }, 1000); // Wait 1 second before attempting to reconnect
    }
}

export default BinanceBalanceStream;
