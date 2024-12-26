import { Interval } from '@binance/connector-typescript';
import BinanceKlineStream from './BinanceKlineStream';
import Kline from './Kline';

async function main() {
    const kline = new Kline('BTCUSDT', Interval['1m'], 4);

}

main();