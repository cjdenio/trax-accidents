import Handlebars from "handlebars";
import { Database } from "bun:sqlite";
import { differenceInDays, startOfToday, startOfDay, format } from "date-fns";
import { tz } from "@date-fns/tz";

const db = new Database("database.db");

await Bun.cron("./scripts/sync-rss.js", "*/5 * * * *", "rss-sync");

Bun.serve({
    routes: {
        "/": async () => {
            const homeTemplate = Handlebars.compile(
                await Bun.file(
                    import.meta.dir + "/templates/home.handlebars",
                ).text(),
            );

            const latestCollision = await db
                .query(
                    "SELECT * FROM service_alerts WHERE is_collision ORDER BY date DESC LIMIT 1;",
                )
                .get();

            return new Response(
                homeTemplate({
                    daysSince: differenceInDays(
                        startOfToday({ in: tz("America/Denver") }),
                        startOfDay(new Date(latestCollision.date), { in: tz("America/Denver") }),
                    ),
                    latestCollision: {
                        ...latestCollision,
                        formattedDate: format(new Date(
                            latestCollision.date,
                        ), "LLL d, yyyy", { in: tz("America/Denver") }),
                    },
                }),
                {
                    headers: { "Content-Type": "text/html" },
                },
            );
        },
        "/uta-logo.svg": Bun.file(import.meta.dir + "/public/uta-logo.svg"),
    },
});
