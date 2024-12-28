import { Telegraf } from 'telegraf';

class TelegramBot {
    private static instance: TelegramBot;
    private bot: Telegraf;

    private constructor() {
        const token = process.env.TELEGRAM_BOT_TOKEN;
        if (!token) {
            throw new Error('TELEGRAM_BOT_TOKEN is not defined');
        }
        this.bot = new Telegraf(token);
    }

    public static getInstance(): TelegramBot {
        if (!TelegramBot.instance) {
            TelegramBot.instance = new TelegramBot();
        }
        return TelegramBot.instance;
    }

    public async sendMessage(chatId: string, message: string): Promise<void> {
        await this.bot.telegram.sendMessage(chatId, message);
    }
}

export default TelegramBot;
