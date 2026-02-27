export async function sendTelegramMessage(message: string) {
    const BOT_TOKEN = '8518632582:AAGPiuljJN5xEPCf7_QKVOaCG5IyVPZvuGg';
    const CHAT_ID = '1734114014';

    try {
        const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                chat_id: CHAT_ID,
                text: message,
            }),
        });

        if (!response.ok) {
            console.error('Failed to send Telegram message:', await response.text());
        }
    } catch (error) {
        console.error('Error sending Telegram message:', error);
    }
}
