export async function sendTelegramMessage(message: string, replyMarkup?: any) {
    const BOT_TOKEN = '8518632582:AAGPiuljJN5xEPCf7_QKVOaCG5IyVPZvuGg';
    const CHAT_ID = '1734114014';

    try {
        const body: any = {
            chat_id: CHAT_ID,
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
        }
    } catch (error) {
        console.error('Error sending Telegram message:', error);
    }
}
