import Kline from "./Kline";
import { Interval } from '@binance/connector-typescript';
import SymbolDecimal from "./SymbolDecimal";

function getDecimalPlacesFromString(numStr: string): number {
    const decimalIndex = numStr.indexOf('.');
    if (decimalIndex === -1) return 0;
    return numStr.length - decimalIndex - 1;
}

async function main() {
    const symbolDecimal = SymbolDecimal.getInstance();
    symbolDecimal.setDecimals('SOLUSDT', '124.45');
    symbolDecimal.setDecimals('IOTAUSDT', '1.0593');

    console.log('SOLUSDT decimals:', symbolDecimal.getDecimals('SOLUSDT')); // Deve retornar 2
    console.log('IOTAUSDT decimals:', symbolDecimal.getDecimals('IOTAUSDT')); // Deve retornar 4

    const k1 = Kline.getInstance('SOLUSDT', Interval['1m']);
    const k2 = Kline.getInstance('IOTAUSDT', Interval['1m']);

    console.log(k1.getDecimalPlaces(), k2.getDecimalPlaces());
    setInterval(async () => {
        console.log('SOLUSDT:', k1.getPrice(), k1.getDecimalPlaces());
        console.log('IOTAUSDT:', k2.getPrice(), k2.getDecimalPlaces());
    }, 5000);

}

console.log(getDecimalPlacesFromString('192.54')); // Deve retornar 2
console.log(getDecimalPlacesFromString('1.0593')); // Deve retornar 4

main();