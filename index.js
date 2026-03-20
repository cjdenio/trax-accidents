import Handlebars from "handlebars";
import { Database } from "bun:sqlite";
import { differenceInDays, startOfToday, startOfDay } from "date-fns";

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
                        startOfToday(new Date()),
                        startOfDay(new Date(latestCollision.date)),
                    ),
                    latestCollision: {
                        ...latestCollision,
                        formattedDate: new Date(
                            latestCollision.date,
                        ).toLocaleDateString("en-US", { dateStyle: "medium" }),
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
