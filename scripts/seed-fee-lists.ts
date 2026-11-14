/**
 * scripts/seed-fee-lists.ts   (DRY-RUN by default — nothing changes without --apply)
 *
 * Gives every club and association a STARTING registration fee list (`fees[]`) where it has none:
 *   junior $20 · senior $100 · other $20 (all levels) · volunteer $0 (clubs only)
 * Association fees are flagged `inherited` (added to every registration automatically); club fees are
 * flagged `chosenByMember` (picked by the person registering). Administrators then add, edit or
 * remove lines on /admin/fees. Existing fee lists are never overwritten.
 *
 *   npm run seed:fee-lists [-- --apply]
 */
import "./load-env";
import { MongoClient } from "mongodb";
import { starterFees } from "../lib/registrations/feeList";

const DB_NAME = process.env.DB_NAME || "hockey-app";

async function main() {
  const apply = process.argv.includes("--apply");
  const client = new MongoClient(process.env.MONGODB_URI!);
  await client.connect();
  const db = client.db(DB_NAME);
  const now = new Date().toISOString();
  let seeded = 0, kept = 0, oddShape = 0;

  for (const [col, type, key] of [["clubs", "club", "id"], ["associations", "association", "associationId"]] as const) {
    const docs = await db.collection(col).find({}, { projection: { id: 1, clubId: 1, associationId: 1, name: 1, fees: 1 } }).toArray();
    for (const d of docs) {
      const has = Array.isArray(d.fees) ? d.fees.length > 0 : d.fees && Object.keys(d.fees).length > 0;
      if (has) { kept++; if (!Array.isArray(d.fees)) oddShape++; continue; }
      seeded++;
      if (apply) await db.collection(col).updateOne({ _id: d._id }, { $set: { fees: starterFees(type, String(d.name ?? d[key])), updatedAt: now } });
    }
  }
  console.log(`Fee lists to create: ${seeded}   already have fees (left alone): ${kept}${oddShape ? `  (${oddShape} use the older object format)` : ""}`);
  console.log(apply ? "Done." : "DRY RUN — nothing changed. Add --apply to write.");
  await client.close();
}
main().catch((e) => { console.error(e.message ?? e); process.exit(1); });
