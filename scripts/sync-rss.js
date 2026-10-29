import { Database } from "bun:sqlite";

export default {
    async scheduled(controller) {
        const db = new Database(import.meta.dir + "/../database.db");

        const activeAlerts = await fetch(
            "https://api.prod.simplifytransit.com/public/alerts/uta",
        ).then((r) => r.json());

        const railAlerts = activeAlerts.filter((alert) =>
            alert.informed_entity.some(
                (e) =>
                    typeof e.route_short_name === "string" &&
                    e.route_short_name.startsWith("7"),
            ),
        );

        for (const alert of railAlerts) {
            const title =
                alert.header_text.find((t) => t.language === "en")?.text ?? "";
            const description =
                alert.description_text.find((t) => t.language === "en")?.text ??
                "";

            const content = title + "\n\n" + description;

            const result = content.match(
                /train[- ]v(?:ers[eu]s|s?\.?)?[- ](?:auto|vehicle|car)/i,
            );

            db.query(
                `INSERT INTO service_alerts (
                                id,
                                date,
                                content,
                                is_collision
                            ) VALUES ($id, $date, $content, $isCollision) ON CONFLICT DO NOTHING`,
            ).run({
                $id: alert.uuid,
                $date: new Date(
                    alert.active_period[0].start * 1000,
                ).toISOString(),
                $content: content,
                $isCollision: result !== null,
            });
        }
    },
};
