import { WebsocketStream } from '@binance/connector-typescript';
import type { Observable, Observer } from './types';
import BinanceClientSingleton from './BinanceClientSingleton';

class BinanceBalanceStream implements Observable {
    private static instance: BinanceBalanceStream;
    private websocketStreamClient: WebsocketStream;
    private observers: Set<Observer> = new Set();
    private listenKey: string | null = null;
    private listenKeyInterval: NodeJS.Timeout | null = null;

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

    public static async getInstance(): Promise<BinanceBalanceStream> {
        if (!BinanceBalanceStream.instance) {
            BinanceBalanceStream.instance = new BinanceBalanceStream();
            await BinanceBalanceStream.instance.createListenKey();
            BinanceBalanceStream.instance.keepListenKeyAlive();
        }
        return BinanceBalanceStream.instance;
    }

    public addObserver(observer: Observer): void {
        this.observers.add(observer);
        console.log(`Quantidade de Observers ${this.observers.size}`);
    }

    public removeObserver(observer: Observer): void {
        this.observers.delete(observer);
    }

    public notifyObservers(data: Record<string, unknown>): void {
        for (const observer of this.observers) {
            observer.update(data);
        }
    }

    public async subscribeToBalance(observer: Observer) {
        if (!this.listenKey) {
            await this.createListenKey();
        }
        if (this.listenKey) {

            this.websocketStreamClient.userData(this.listenKey);
        } else {
            console.error('ListenKey is null');
        }
        this.addObserver(observer);
    }

    public unsubscribeFromBalance(observer: Observer) {
        this.removeObserver(observer);
    }

    public disconnect() {
        this.websocketStreamClient.disconnect();
    }

    private reconnect() {
        setTimeout(async () => {
            console.debug('BinanceBalanceStream: Reconnecting to WebSocket server');
            await this.createListenKey();
            this.keepListenKeyAlive();
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
            if (this.listenKey) {
                this.websocketStreamClient.userData(this.listenKey);
            } else {
                console.error('ListenKey is null');
            }
        }, 1000); // Wait 1 second before attempting to reconnect
    }

    private async createListenKey(): Promise<string> {
        const client = BinanceClientSingleton.getInstance();
        const response = await client.createListenKey();
        this.listenKey = response.listenKey;
        return this.listenKey;
    }

    private keepListenKeyAlive() {
        if (this.listenKeyInterval) {
            clearInterval(this.listenKeyInterval);
        }
        this.listenKeyInterval = setInterval(async () => {
            if (this.listenKey) {
                const client = BinanceClientSingleton.getInstance();
                await client.renewListenKey(this.listenKey);
                console.debug('BinanceBalanceStream: ListenKey renewed');
            }
        }, 30 * 60 * 1000); // Extend listenKey every 30 minutes
    }
}

export default BinanceBalanceStream;
