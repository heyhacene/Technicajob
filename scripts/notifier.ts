import axios from 'axios';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
// Comma-separated list of Chat IDs
const TELEGRAM_CHAT_IDS = process.env.TELEGRAM_CHAT_IDS;

export async function sendTelegramAlert(job: any) {
    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_IDS) {
        console.warn('Telegram credentials not set in environment variables. Skipping notification.');
        return;
    }

    const message = `
🚀 **New Job Alert!**
**Title:** ${job.title}
**Company:** ${job.company}
**Location:** ${job.location}
**Contract:** ${job.contract}

[Apply Here](${job.link})
    `.trim();

    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;

    // Split the comma-separated string into an array of IDs and trim whitespace
    const chatIds = TELEGRAM_CHAT_IDS.split(',').map(id => id.trim()).filter(id => id.length > 0);

    for (const chatId of chatIds) {
        try {
            await axios.post(url, {
                chat_id: chatId,
                text: message,
                parse_mode: 'Markdown',
                disable_web_page_preview: true
            });
            console.log(`Notification sent for job: ${job.title} to chat ID: ${chatId}`);
        } catch (error: any) {
            console.error(`Failed to send Telegram message to chat ID ${chatId}:`, error.response?.data || error.message);
        }
    }
}
