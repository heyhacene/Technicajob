import axios from 'axios';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

export async function sendTelegramAlert(job: any) {
    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
        console.warn('Telegram credentials not set in environment variables. Skipping notification.');
        return;
    }

    const message = `
🚀 **New Job Alert!**
**Title:** ${job.title}
**Company:** ${job.company}
**Location:** ${job.location}

[Apply Here](${job.link})
    `.trim();

    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;

    try {
        await axios.post(url, {
            chat_id: TELEGRAM_CHAT_ID,
            text: message,
            parse_mode: 'Markdown',
            disable_web_page_preview: true
        });
        console.log(`Notification sent for job: ${job.title}`);
    } catch (error: any) {
        console.error('Failed to send Telegram message:', error.response?.data || error.message);
    }
}
