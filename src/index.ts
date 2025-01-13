import { Interval } from "@binance/connector-typescript";
import TelegramBot from "./TelegramBot";
import DatabaseSingleton from "./DatabaseSingleton";
import 'dotenv/config';
import path from 'node:path';
import Trades from "./Trades";
// import { BinanceTradeAlan } from "./BinanceTradeAlan";
import type { TradeSignal } from "./types";
import Trade from "./Trade";
import CsvWriter from "./CsvWriter";
import { BinanceMarketAnalist } from "./BinanceMarketAnalist";
type Status = 'COMPRADO' | 'VENDIDO';

async function main() {
    let status: Status;
    let decimals: number;
    const date = new Date();
    const db = await DatabaseSingleton.getInstance();
    const traders = await Trades.getInstance();
    const telegraf = TelegramBot.getInstance();
    const telegramBot = telegraf.getBot();

    const computador = process.env.COMPUTER;
    const intervalo = process.env.INTERVAL as keyof typeof Interval || '1h';
    let trailingStopActivation = Number(process.env.TRAILING_STOP_ATIVACTION) || 1.01;
    let trailingStopSellPercent = Number(process.env.TRAILING_STOP_PERCENT) || 0.995;
    let stopLoss = Number(process.env.STOP_LOSS) || 0.99;

    let maxPrice = 0;
    let trailingStop = false;
    let info = false;

    const trades = await Trades.getInstance();
    let trade = await trades.getLastOpenTrade();
    if (trade) {
        status = 'COMPRADO';
        maxPrice = trade.getBuyPrice();

    } else {
        status = 'VENDIDO';
    }

    telegramBot.launch().then(() => {
        console.log('Bot started');
        sendMessagesToTelegram('O Bot foi iniciado');
        sendMessagesToTelegram('Digite /h para ver a lista de comandos');
    }).catch((error) => {
        console.error('Failed to start bot:', error);
    });
    telegramBot.command('me', async (ctx) => {
        ctx.reply('Olá, eu sou o Bot do Alan. Como posso te ajudar?');
        help();
    });

    telegramBot.command('h', async (ctx) => {
        console.log('help command');
        info = !info;
        await help();
    });
    const dec = getDecimalPlacesFromString(maxPrice.toString());
    let trailingStopPrice = (maxPrice * trailingStopSellPercent);
    telegramBot.command('t', async (ctx) => {
        console.log('trailing stop command');
        if (trailingStop) {
            if (trade) {
                await sendMessagesToTelegram(
                    `Trailing Stop Ativo.: ${trailingStop ? 'SIM' : 'NÃO'}
                    Preço Compra........: ${trade.getBuyPrice()}
                    Preço Atual.........: ${trade.getSellPrice()}
                    Trailing Stop.......: ${trailingStopPrice.toFixed(dec)}
                    Trailing %..........: ${(trailingStopSellPercent - 1)}%
                    P/L Estimado........: ${(((maxPrice * 0.99) / trade.getBuyPrice() - 1) * 100).toFixed(2)}%`
                );
            } else {
                await sendMessagesToTelegram(
                    `Trailing Stop Ativo.: ${trailingStop ? 'SIM' : 'NÃO'}
                    Preço Compra........: N/A
                    Preço Atual.........: N/A
                    Trailing Stop.......: ${trailingStopPrice}
                    Trailing %..........: ${(trailingStopSellPercent - 1)}%
                    P/L Estimado........: N/A
                    Tente novamente!`
                );
            }
        } else {
            await sendMessagesToTelegram(`Trailing Stop Ativo.: ${trailingStop ? 'SIM' : 'NÃO'}`);
        }
    });

    telegramBot.command('i', async (ctx) => {
        console.log('info command');
        info = !info;
        await sendMessagesToTelegram(`Notificações Ativas: ${info}`);
    });

    // Register commands
    telegramBot.command('l', async (ctx) => {
        console.log('list command');
        const message = await traders.getTradesResults();
        await sendMessagesToTelegram(message);
    });

    telegramBot.command('r', async (ctx) => {
        console.log('result command');
        const message = await traders.getTradesResults(false);
        await sendMessagesToTelegram(message);
    });


    telegramBot.command('p', async (ctx) => {
        console.log('parcial command');
        if (status === 'COMPRADO') {
            await traders.getTradesPartialResume();
        } else {
            sendMessagesToTelegram('Nenhuma operação aberta no momento');
        }
    });

    telegramBot.command('s', async (ctx) => {
        console.log('status command');
        const icon = status === 'COMPRADO' ? '🟢' : '🔴';

        const uptimeMs = (new Date()).getTime() - date.getTime();
        const uptimeHours = Math.floor(uptimeMs / (1000 * 60 * 60));
        const uptimeMinutes = String(Math.floor((uptimeMs % (1000 * 60 * 60)) / (1000 * 60))).padStart(2, '0');
        const message =
            `           Status.......: ${icon} ${status}
                        Computador...: ${computador?.toUpperCase()}
                        Intervalo....: ${intervalo}
                        Tempo Ativo..: ${uptimeHours}:${uptimeMinutes}
                        Trailing Stop: ${trailingStop ? 'SIM' : 'NÃO'}       
                        Notificações.: ${info ? 'SIM' : 'NÃO'}`;
        await sendMessagesToTelegram(`${message}`);
    });


    // Start the bot
    // await telegramBot.launch().then(async () => {
    //     console.log('Bot is running');
    // }).catch((error) => {
    //     console.error('Failed to start bot:', error);
    // });

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

    const marketAnalist: BinanceMarketAnalist[] = [];
    for (const crypto of cryptos) {
        marketAnalist.push(new BinanceMarketAnalist(crypto, Interval[intervalo]));
    }
    const signalMap = new Map<string, TradeSignal>();
    setInterval(async () => {
        for (const trader of marketAnalist) {
            const tradeSignal = await trader.getTradingSignal();
            signalMap.set(trader.getSymbol(), tradeSignal);
        }

        if (status === 'VENDIDO') {
            const buySignals = Array.from(signalMap.values()).filter(signal => signal.signal === 'BUY');
            if (buySignals.length > 5) {
                const bestSignal = buySignals.reduce((prev, current) => (prev.strength > current.strength) ? prev : current);
                console.log('Best BUY signal:', bestSignal);
                trade = new Trade(bestSignal.symbol, bestSignal.price);
                trade.setActualPrice(bestSignal.price);
                await trade.save();
                status = 'COMPRADO';
                maxPrice = bestSignal.price;
                await traders.getTradesPartialResume();

            }
        } else if (status === 'COMPRADO' && trade) {
            if (info) {
                await traders.getTradesPartialResume();
            }
            const sellSignal = signalMap.get(trade.getSymbol());
            if (sellSignal && sellSignal.price > 0) {
                trade.setActualPrice(sellSignal.price);
                csvComprado(sellSignal, trade);
            }
            // Se o resultado for maior que o trailingStopPercet ativa o trailing stop e ajusta os preços
            if (trade.getResult() > trailingStopSellPercent && sellSignal && sellSignal.price > 0) {
                const oldMaxPrice = maxPrice;
                trailingStop = true;
                maxPrice = maxPrice > sellSignal.price ? maxPrice : sellSignal.price;
                trailingStopPrice = (maxPrice * trailingStopSellPercent);
                if (oldMaxPrice !== maxPrice) {
                    const message =
                        `   Trailing Stop Ativo.: ${trailingStop ? 'SIM' : 'NÃO'}
                            Preço Compra........: ${trade.getBuyPrice()}
                            Preço Atual.........: ${trade.getSellPrice()}
                            Trailing Stop.......: ${trailingStopPrice.toFixed(dec)}
                            Trailing %..........: ${(trailingStopSellPercent - 1) * 100}%
                            P/L Estimado........: ${((trailingStopPrice / trade.getBuyPrice() - 1) * 100).toFixed(2)}%`;
                    await sendMessagesToTelegram(message);
                }
            }

            if (trailingStop && sellSignal && sellSignal.price < trailingStopPrice) {
                await trade.sell(sellSignal.price);
            }

            if (sellSignal && trade.getResult() < stopLoss && trade.isOpen()) {
                await trade.sell(sellSignal.price);
            }

            if (sellSignal?.signal === 'SELL') {
                await trade.sell(sellSignal.price);
            }

            if (!trade.isOpen()) {
                status = 'VENDIDO';
                maxPrice = 0;
                trailingStop = false;
            }

        }
    }, 20 * 1000);

    await telegraf.sendHTMLMessage('🤖');
    await sendMessagesToTelegram('O Bot foi iniciado 🚀');
    await help();
}


function csvComprado(tradeSignal: TradeSignal, trade: Trade): void {
    const csvWriter = new CsvWriter(path.join(__dirname, 'csv'));
    const dateTime = new Date().toISOString();
    const csvHeader = 'Date,Symbol,BuyPrice,ActualPrice,shortTermMA,longTermMA,strength,Signal,P/L\n';
    const csvRow = `${dateTime},${tradeSignal.symbol},${trade.getBuyPrice()},${tradeSignal.price},${tradeSignal.shortTermMA},${tradeSignal.longTermMA},${tradeSignal.strength},${tradeSignal.signal},${trade.getResult()}\n`;
    csvWriter.writeCsv('MARKET_COMPRADO.csv', csvHeader, csvRow);
}

async function help(): Promise<void> {
    const message = `Lista de comandos:
    /h - Exibe essa mensagem
    /t - Exibe dados do Trailling Stop
    /m - Exibe o preço do Trailling Stop
    /i - Ativa/Desativa as notificações
    /r - Exibe o resultado das operações
    /l - Lista todas as operações
    /p - Exibe a operação atual
    /s - Exibe o status do bot
    `;
    sendMessagesToTelegram(message);
};


async function sendMessagesToTelegram(message: string) {
    const m = message.split('\n').map(line => line.replace(/\s+/g, ' ')).join('\n');
    const telegramBot = TelegramBot.getInstance();
    await telegramBot.sendMarkDownMessage(m);
}

function getDecimalPlacesFromString(numStr: string): number {
    const decimalIndex = numStr.indexOf('.');
    if (decimalIndex === -1) return 0;
    return numStr.length - decimalIndex - 1;
}
main();