import BinanceClientSingleton from './BinanceClientSingleton';
import BinanceBalanceStream from './BinanceBalanceStream';
import type { Observer, BalanceData } from './types';

class Balance implements Observer {
    private balances: Map<string, BalanceData> = new Map();
    private balanceStream!: BinanceBalanceStream;
    private lastUpdateTimestamp = 0;

    constructor() {
        this.initialize();
    }

    private async initialize() {
        this.balanceStream = await BinanceBalanceStream.getInstance();
        this.balanceStream.subscribeToBalance(this);
    }

    public async update(balanceUpdate: { stream: string, data: { e: string, E: number, a: string, d: string, T: number; }; }): Promise<void> {
        const { data } = balanceUpdate;
        const currentTimestamp = Math.floor(Date.now() / 1000);

        if (currentTimestamp === this.lastUpdateTimestamp) {
            return;
        }

        this.lastUpdateTimestamp = currentTimestamp;
        await this.getBalances();
        console.log(this.getBalance(data.a));
    }

    public async getBalances(): Promise<BalanceData[]> {
        const client = BinanceClientSingleton.getInstance();
        const accountInfo = await client.accountInformation({ omitZeroBalances: true });
        this.balances.clear();
        for (const balance of accountInfo.balances) {
            this.balances.set(balance.asset, {
                asset: balance.asset,
                free: Number.parseFloat(balance.free),
                locked: Number.parseFloat(balance.locked),
            });
        }
        // console.log(Array.from(this.balances.values()));
        return Array.from(this.balances.values());
    }

    public getBalance(asset: string): BalanceData {
        let balance = this.balances.get(asset);
        if (balance === undefined) {
            balance = {
                asset: asset,
                free: 0,
                locked: 0
            };
        }
        return balance;
    }
}

export default Balance;