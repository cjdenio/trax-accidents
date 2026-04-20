import Handlebars from "handlebars";
import { Database } from "bun:sqlite";
import { differenceInDays, startOfToday, startOfDay, format, formatDate, subDays } from "date-fns";
import { tz } from "@date-fns/tz";

const db = new Database("database.db");

await Bun.cron("./scripts/sync-rss.js", "*/5 * * * *", "rss-sync");

interface ServiceAlert {
    id: string
    date: string
    is_collision: number
    content: string
}

Bun.serve({
    routes: {
        "/": async () => {
            const homeTemplate = Handlebars.compile(
                await Bun.file(
                    import.meta.dir + "/templates/home.handlebars",
                ).text(),
            );

            const latestCollision = db
                .query<ServiceAlert, []>(
                    "SELECT * FROM service_alerts WHERE is_collision ORDER BY date DESC LIMIT 1;",
                )
                .get()!;

            const allCollisions = db.query<ServiceAlert, []>("SELECT * FROM service_alerts WHERE is_collision ORDER BY date ASC").all()

            let last60Days = new Array<{ collision: boolean; renderedDate: string; }>(60).fill({
                collision: false,
                renderedDate: "",
            })

            last60Days = last60Days.map((v, index) => {
                return {
                    ...v,
                    renderedDate: format(subDays(new Date(), index), "LLL d, yyyy", { in: tz("America/Denver") }),
                }
            })

            for (const collision of allCollisions) {
                const collisionDay = startOfDay(new Date(collision.date), { in: tz("America/Denver") })
                const difference = differenceInDays(startOfToday({ in: tz("America/Denver") }), collisionDay)
                if (difference >= 60) {
                    continue
                }

                last60Days[difference].collision = true
            }

            last60Days.reverse()

            return new Response(
                homeTemplate({
                    daysSince: differenceInDays(
                        startOfToday({ in: tz("America/Denver") }),
                        startOfDay(new Date(latestCollision.date), {
                            in: tz("America/Denver"),
                        }),
                    ),
                    latestCollision: {
                        ...latestCollision,
                        formattedDate: format(
                            new Date(latestCollision.date),
                            "LLL d, yyyy",
                            { in: tz("America/Denver") },
                        ),
                    },
                    last90Days: last60Days,
                }),
                {
                    headers: { "Content-Type": "text/html" },
                },
            );
        },
        "/uta-logo.svg": Bun.file(import.meta.dir + "/public/uta-logo.svg"),
    },
});
