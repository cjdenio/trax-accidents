import { Database } from "bun:sqlite";
import Parser from "rss-parser";

const URLS = [
    "https://content.govdelivery.com/accounts/UTTA/widgets/UTTA_WIDGET_3.rss", // blue line
    "https://content.govdelivery.com/accounts/UTTA/widgets/UTTA_WIDGET_4.rss", // red line
    "https://content.govdelivery.com/accounts/UTTA/widgets/UTTA_WIDGET_5.rss", // green line
    "https://content.govdelivery.com/accounts/UTTA/widgets/UTTA_WIDGET_11.rss", // s-line
    "https://content.govdelivery.com/accounts/UTTA/widgets/UTTA_WIDGET_7.rss", // frontrunner
];

export default {
    async scheduled(controller) {
        const db = new Database(import.meta.dir + "/../database.db");

        const parser = new Parser();

        for (const url of URLS) {
            const feed = await parser.parseURL(url);

            for (const item of feed.items) {
                const result = item.contentSnippet.match(
                    /train[- ]v(?:ersus|s?\.?)?[- ](?:auto|vehicle)/i,
                );

                let content = item.contentSnippet;

                const footerIndex = content.indexOf(
                    "You have received this message because you are subscribed to UTA Service Alerts",
                );
                if (footerIndex != -1) {
                    content = content.slice(0, footerIndex).trim();
                }

                db.query(
                    `INSERT INTO service_alerts (
                    id,
                    date,
                    content,
                    is_collision
                ) VALUES ($id, $date, $content, $isCollision) ON CONFLICT DO NOTHING`,
                ).run({
                    $id: Bun.hash(
                        item.isoDate + item.contentSnippet,
                    ).toString(),
                    $date: item.isoDate,
                    $content: content,
                    $isCollision: result !== null,
                });
            }
        }
    },
};
