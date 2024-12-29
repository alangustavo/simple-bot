import { Interval } from "@binance/connector-typescript";
import Balance from "./Balance";
import Kline from "./Kline";
import BinanceClientSingleton from "./BinanceClientSingleton";
import VolatilityMonitor from "./VolatilityMonitor";

async function main() {
    // const kline = new Kline('BTCUSDT', Interval['1m'], 4);

    // const stream = BinanceKlineStream.getInstance();
    // stream.addObserver(kline);


    const client = BinanceClientSingleton.getInstance();
    // const accountInfo = await client.accountInformation();
    // console.log(accountInfo);

    // const balance = new Balance();

    // console.log(await balance.getBalances());
    // const balance = new Balance();
    // console.log(await balance.getBalances());

    // setInterval(async () => {
    //     console.log('Updating balances...');
    //     console.log(await balance.getBalances());
    // }, 2 * 60 * 1000); // 2 minutes interval
    // const tickers = await client.ticker24hr({ type: 'MINI' });
    // console.log(tickers);

    // const monitor = new VolatilityMonitor('USDT', 20000000, Interval['15m'], 200);
    // await monitor.updateSymbols();

    // setInterval(async () => {
    //     await monitor.updateSymbols();
    // }, 60 * 60 * 1000); // 1 hour interval
    const SOL = new Kline('SOLUSDT', Interval['15m'], 200);
    const RLC = new Kline('RLCUSDT', Interval['15m'], 200);
    const LIT = new Kline('LITUSDT', Interval['15m'], 200);
    const ATA = new Kline('ATAUSDT', Interval['15m'], 200);
    const IDEX = new Kline('IDEXUSDT', Interval['15m'], 200);
    const SCRT = new Kline('SCRTUSDT', Interval['15m'], 200);
    const STEEM = new Kline('STEEMUSDT', Interval['15m'], 200);
    const MDT = new Kline('MDTUSDT', Interval['15m'], 200);
    const OGN = new Kline('OGNUSDT', Interval['15m'], 200);
    const UTK = new Kline('UTKUSDT', Interval['15m'], 200);
    setInterval(() => {
        SOL.getTradingSignal();
        RLC.getTradingSignal();
        LIT.getTradingSignal();
        ATA.getTradingSignal();
        IDEX.getTradingSignal();
        SCRT.getTradingSignal();
        STEEM.getTradingSignal();
        MDT.getTradingSignal();
        OGN.getTradingSignal();
        UTK.getTradingSignal();
    }, 60 * 1000); // 1 minute interval
    // setInterval(() => {
    //     monitor.evaluateSymbols();
    // }, 60 * 1000); // 1 minute interval
}

main();