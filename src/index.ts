import { Interval } from "@binance/connector-typescript";
import Kline from "./Kline";
import TelegramBot from "./TelegramBot";
import DatabaseSingleton from "./DatabaseSingleton";
import 'dotenv/config';
import { BinanceTradeAnalist } from "./BinanceTradeAnalist";
import Trades from "./Trades";
import { BinanceTradeAlan } from "./BinanceTradeAlan";

async function main() {
    const db = await DatabaseSingleton.getInstance();
    const traders = await Trades.getInstance();
    const telegraf = TelegramBot.getInstance();
    const telegramBot = telegraf.getBot();

    // Register commands
    telegramBot.command('resultados', async (ctx) => {
        console.log('resultados command');
        const message = await traders.getTradesResults();
        ctx.reply(`<code>${message}</code>`, { parse_mode: 'HTML' });
    });

    telegramBot.command('parcial', async (ctx) => {
        console.log('parcial command');
        const message = await traders.getTradesPartialResume();
        ctx.reply(`<code>${message}</code>`, { parse_mode: 'HTML' });
    });

    // Start the bot
    telegramBot.launch().then(() => {
        console.log('Bot started');
    }).catch((error) => {
        console.error('Failed to start bot:', error);
    });

    const cryptos = [
        "ADAUSDT",
        "ARBUSDT",
        "ATAUSDT",
        "AVAUSDT",
        "BEAMXUSDT",
        "BNBUSDT",
        "BTCUSDT",
        "ENAUSDT",
        "IDEXUSDT",
        "IOTAUSDT",
        "LINKUSDT",
        "LITUSDT",
        "MBOXUSDT",
        "MDTUSDT",
        "OGNUSDT",
        "RLCUSDT",
        "SCRTUSDT",
        "SOLUSDT",
        "STEEMUSDT",
        "SXPUSDT",
        "UTKUSDT",
        "WINUSDT",
        "XLMUSDT"
    ];
    const analists: BinanceTradeAnalist[] = [];
    const alans: BinanceTradeAlan[] = [];
    for (const crypto of cryptos) {
        analists.push(new BinanceTradeAnalist(crypto, Interval['1h']));
        alans.push(new BinanceTradeAlan(crypto, Interval['1h']));
    }

    setInterval(() => {
        for (const trader of analists) {
            trader.getTradingSignal();
        }
    }, 60 * 1000);
}

main();