import { WebsocketAPI } from '@binance/connector-typescript';

class BinanceWebSocketSingleton {
    private static instance: WebsocketAPI;

    private constructor() { }

    public static async getInstance(): Promise<WebsocketAPI> {
        // console.log;
        const callbacks = {
            open: (client: WebsocketAPI) => {
                console.log('Conectado ao servidor WebSocket');
                client.exchangeInfo();
            },
            close: () => {
                console.log('Desconectado do servidor WebSocket');
            },
            message: (data: string) => {
                console.log('Mensagem recebida:', JSON.parse(data));
            }
        };
        if (!BinanceWebSocketSingleton.instance) {
            BinanceWebSocketSingleton.instance = new WebsocketAPI(process.env.BINANCE_API_KEY || '', process.env.BINANCE_API_SECRET || '', { callbacks });
        }

        return BinanceWebSocketSingleton.instance;
    }
}

export default BinanceWebSocketSingleton;
