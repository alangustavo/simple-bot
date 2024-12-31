import { Interval } from "@binance/connector-typescript";
import TelegramBot from "./TelegramBot";
import DatabaseSingleton from "./DatabaseSingleton";
import 'dotenv/config';
import Trades from "./Trades";
import { BinanceTradeAlan } from "./BinanceTradeAlan";
import type { Signal, TradeSignal } from "./types";
import Trade from "./Trade";
type Status = 'COMPRADO' | 'VENDIDO';

async function main() {
    let status: Status;
    const db = await DatabaseSingleton.getInstance();
    const traders = await Trades.getInstance();
    const telegraf = TelegramBot.getInstance();
    const telegramBot = telegraf.getBot();

    const trades = await Trades.getInstance();
    let trade = await trades.getLastOpenTrade();
    if (trade) {
        status = 'COMPRADO';
    } else {
        status = 'VENDIDO';
    }

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


    telegramBot.command('status', async (ctx) => {
        ctx.reply(`<code>${status}</code>`, { parse_mode: 'HTML' });
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

    const alans: BinanceTradeAlan[] = [];
    for (const crypto of cryptos) {
        alans.push(new BinanceTradeAlan(crypto, Interval['3m']));
    }
    const signalMap = new Map<string, TradeSignal>();
    setInterval(async () => {
        for (const trader of alans) {
            const tradeSignal = await trader.getTradingSignal();
            signalMap.set(trader.getSymbol(), tradeSignal);
            tradeSignal.resitenceDistance;
            tradeSignal.signal;
        }

        if (status === 'VENDIDO') {
            const buySignals = Array.from(signalMap.values()).filter(signal => signal.signal === 'BUY');
            if (buySignals.length > 0) {
                status = 'COMPRADO';
                const bestSignal = buySignals.reduce((prev, current) => (prev.resitenceDistance > current.resitenceDistance) ? prev : current);
                console.log('Best BUY signal:', bestSignal);
                // Aqui você pode adicionar a lógica para agir com base no melhor sinal de compra
                trade = new Trade(bestSignal.symbol, bestSignal.price);
                trade.setActualPrice(bestSignal.price);
                await trade.save();
            }
        } else if (status === 'COMPRADO' && trade) {
            const sellSignal = signalMap.get(trade.getSymbol());
            if (sellSignal && sellSignal.price > 0) {
                trade.setActualPrice(sellSignal.price);
            }
            if (sellSignal?.signal === 'SELL') {
                trade.sell(sellSignal.price);
                if (!trade.isOpen()) {
                    status = 'VENDIDO';
                }
            }
        }

    }, 60 * 1000);
}


main();