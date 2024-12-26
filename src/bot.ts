import { Interval } from '@binance/connector-typescript';
import BinanceKlineStream from './BinanceKlineStream';
import Kline from './Kline';
import BinanceClientSingleton from './BinanceClientSingleton';

async function main() {
    const kline = new Kline('BTCUSDT', Interval['1m'], 4);

    const stream = BinanceKlineStream.getInstance();
    stream.addObserver(kline);


    // const client = BinanceClientSingleton.getInstance();
    // const accountInfo = await client.accountInformation();
    // console.log(accountInfo);

}

main();