import { Telegraf } from 'telegraf';
import 'dotenv/config';

class TelegramBot {
    private static instance: TelegramBot;
    private bot: Telegraf;
    private chatId: string;

    private constructor() {
        const token = process.env.TELEGRAM_BOT_TOKEN;
        this.chatId = process.env.TELEGRAM_CHAT_ID || '';
        if (!token) {
            throw new Error('TELEGRAM_BOT_TOKEN is not defined');
        }
        this.bot = new Telegraf(token);
    }

    public static getInstance(): TelegramBot {
        if (!TelegramBot.instance) {
            TelegramBot.instance = new TelegramBot();
            console.log('TelegramBot instance created');
        }

        return TelegramBot.instance;
    }

    public async sendMessage(message: string): Promise<void> {
        await this.bot.telegram.sendMessage(this.chatId, message);
    }

    public async sendHTMLMessage(message: string): Promise<void> {
        await this.bot.telegram.sendMessage(this.chatId, message, { parse_mode: 'HTML' });
    }

    public async sendMonoEspacado(message: string): Promise<void> {
        await this.bot.telegram.sendMessage(this.chatId, `<code>${message}</code>`, { parse_mode: 'HTML' });
    }

    public async sendMarkDownMessage(message: string): Promise<void> {
        const formattedMessage = message.replace(/([_*\[\]()~`>#+\-=|{}.!])/g, '\\$1');
        await this.bot.telegram.sendMessage(this.chatId, `\`\`\`\n${formattedMessage}\`\`\``, { parse_mode: 'MarkdownV2' });
    }

    public async sendCardMessage(title: string, body: string): Promise<void> {
        const message = `${title}\n${body}`;
        await this.bot.telegram.sendMessage(this.chatId, `<code>${message}<code>`, { parse_mode: 'HTML' });
    }

    public getBot(): Telegraf {
        console.log('Returning Telegraf instance');
        return this.bot;
    }

}

export default TelegramBot;
