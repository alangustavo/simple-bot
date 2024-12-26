import BinanceBalanceStream from './BinanceBalanceStream';
import BinanceClientSingleton from './BinanceClientSingleton';
import type { BalanceData, Observer } from './types';

class Balance implements Observer {
    private balances: Record<string, BalanceData> = {};

    constructor() {
        this.initialize();
    }

    private async initialize() {
        const client = BinanceClientSingleton.getInstance();
        const accountInfo = await client.accountInformation();
        this.balances = accountInfo.balances.reduce((acc: Record<string, BalanceData>, balance: { asset: string, free: string, locked: string; }) => {
            acc[balance.asset] = {
                asset: balance.asset,
                free: Number.parseFloat(balance.free),
                locked: Number.parseFloat(balance.locked),
            };
            return acc;
        }, {});

        const stream = BinanceBalanceStream.getInstance();
        stream.addObserver(this);
    }

    public update(data: Record<string, unknown>): void {
        for (const key of Object.keys(data)) {
            const balance = data[key] as { a: string, f: string, l: string; };
            this.balances[balance.a] = {
                asset: balance.a,
                free: Number.parseFloat(balance.f),
                locked: Number.parseFloat(balance.l),
            };
        }
    }

    public getBalances(): Record<string, BalanceData> {
        return this.balances;
    }
}
