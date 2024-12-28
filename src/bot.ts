import VolatilityMonitor from './VolatilityMonitor';
// import Balance from './Balance';
// import Kline from './Kline';
// import { Observer } from './types';
// class Bot extendes Observer {
//     private balance: Balance;
//     private kline: Kline;
//     constructor(quote: string) {
//         this.balance = new Balance();
//         this.kline = new Kline();
//     }
//     public update(data: Record<string, unknown>): void {
//         if(data.stream === 'kline') {
//         this.kline.update(data);
//     } else if (data.stream === 'balance') {
//         this.balance.update(data);
//     }
// }
// }

async function main() {
    // ...existing code...

    const monitor = new VolatilityMonitor('USDT', 100000, '15m', 60);
    await monitor.monitorSymbols();

    setInterval(async () => {
        await monitor.monitorSymbols();
    }, 60 * 60 * 1000); // 1 hour interval
}

main();