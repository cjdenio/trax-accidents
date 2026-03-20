import { simpleParser } from "mailparser";
import { readdir } from "node:fs/promises";
import { Database } from "bun:sqlite";

const db = new Database("database.db");

const emails = await readdir("uta-emails/");

for (const filename of emails) {
    const data = await simpleParser(
        await Bun.file(`uta-emails/${filename}`).text(),
    );

    const result = data.text.match(
        /train[- ]v(?:ersus|s?\.?)?[- ](?:auto|vehicle)/i,
    );

    let content = data.text;

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
        $id: Bun.hash(data.date.toISOString() + data.text).toString(),
        $date: data.date.toISOString(),
        $content: content,
        $isCollision: result !== null,
    });
}
