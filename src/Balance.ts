import BinanceClientSingleton from './BinanceClientSingleton';
import BinanceKlineStream from './BinanceKlineStream';
import type { BalanceData, Observer } from './types';

class Balance {
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
    }

    public updateBalances(balances: { a: string, f: string, l: string; }[]): void {
        for (const balance of balances) {
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

class BalanceStream implements Observer {
    private balance: Balance;

    constructor(balance: Balance) {
        this.balance = balance;
        const stream = BinanceKlineStream.getInstance();
        stream.addObserver(this);
    }

    public update(data: Record<string, unknown>): void {
        if (data.e === 'outboundAccountPosition') {
            const balances = data.B as { a: string, f: string, l: string; }[];
            this.balance.updateBalances(balances);
        }
    }
}

export default Balance;
