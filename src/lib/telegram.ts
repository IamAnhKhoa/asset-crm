const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
export const TELEGRAM_CHAT_ID = '1734114014'; // Exported for use in update functions

export async function sendTelegramMessage(message: string, replyMarkup?: any): Promise<number | undefined> {
    try {
        const body: any = {
            chat_id: TELEGRAM_CHAT_ID,
            text: message,
            parse_mode: 'HTML',
        };

        if (replyMarkup) {
            body.reply_markup = replyMarkup;
        }

        const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
        });

        if (!response.ok) {
            console.error('Failed to send Telegram message:', await response.text());
            return undefined;
        }

        const data = await response.json();
        return data?.result?.message_id;
    } catch (error) {
        console.error('Error sending Telegram message:', error);
        return undefined;
    }
}

export async function updateTelegramMessage(chatId: string | number, messageId: number, newText: string, replyMarkup?: any) {
    try {
        await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/editMessageText`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: chatId,
                message_id: messageId,
                text: newText,
                parse_mode: 'HTML',
                reply_markup: replyMarkup || { inline_keyboard: [] }
            }),
        });
    } catch (error) {
        console.error('Failed to update message:', error);
    }
}
