/**
 * Notification channels — Telegram + Discord webhook support
 *
 * Usage:
 *   const notifier = createNotifier();
 *   if (notifier) await notifier.send("Daily brief: ...");
 */

interface NotificationChannel {
    send(message: string): Promise<void>;
}

class TelegramChannel implements NotificationChannel {
    constructor(
        private botToken: string,
        private chatId: string
    ) {}

    async send(message: string): Promise<void> {
        const url = `https://api.telegram.org/bot${this.botToken}/sendMessage`;
        const res = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                chat_id: this.chatId,
                text: message,
                parse_mode: "Markdown",
            }),
        });
        if (!res.ok) {
            const body = await res.text();
            throw new Error(`Telegram send failed: ${res.status} ${body}`);
        }
    }
}

class DiscordWebhookChannel implements NotificationChannel {
    constructor(private webhookUrl: string) {}

    async send(message: string): Promise<void> {
        const res = await fetch(this.webhookUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ content: message }),
        });
        if (!res.ok) {
            const body = await res.text();
            throw new Error(`Discord send failed: ${res.status} ${body}`);
        }
    }
}

export interface Notifier {
    send(message: string): Promise<void>;
}

/**
 * Creates a notifier from env vars. Returns null if no channels are configured.
 *
 * Env vars:
 *   TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID — enables Telegram
 *   DISCORD_WEBHOOK_URL — enables Discord
 */
export function createNotifier(): Notifier | null {
    const channels: NotificationChannel[] = [];

    if (process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID) {
        channels.push(
            new TelegramChannel(
                process.env.TELEGRAM_BOT_TOKEN,
                process.env.TELEGRAM_CHAT_ID
            )
        );
    }

    if (process.env.DISCORD_WEBHOOK_URL) {
        channels.push(new DiscordWebhookChannel(process.env.DISCORD_WEBHOOK_URL));
    }

    if (channels.length === 0) return null;

    return {
        async send(message: string) {
            await Promise.allSettled(
                channels.map((ch) => ch.send(message))
            );
        },
    };
}
