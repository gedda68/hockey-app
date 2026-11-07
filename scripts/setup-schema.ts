/**
 * scripts/setup-schema.ts
 *
 * Creates / updates MongoDB collections with `$jsonSchema` validators generated
 * from the app's models:
 *
 *   • Zod schemas in lib/db/schemas/*   (source of truth for the live app)
 *   • Mongoose models in models/*       (legacy models — config_*, registrations,
 *                                        tournaments, trainings, trials)
 *
 * Also creates the indexes declared on the Mongoose models and TEAM_INDEXES /
 * MEMBER_TEAM_INDEXES from team.schema.ts. All other indexes stay in
 * scripts/setup-indexes.ts.
 *
 * Usage
 *   npm run setup:schema                       # apply validators (warn mode)
 *   npm run setup:schema -- --check            # report docs that would fail, change nothing
 *   npm run setup:schema -- --dry-run          # print generated schemas, no DB connection
 *   npm run setup:schema -- --out schemas.json # also write all schemas to a JSON file
 *   npm run setup:schema -- --only users,teams # limit to some collections
 *   npm run setup:schema -- --action error     # reject invalid writes (default: warn)
 *   npm run setup:schema -- --level strict     # validate every write (default: moderate)
 *   npm run setup:schema -- --strict-props     # reject unknown fields (default: allowed)
 *
 * Safe defaults: validationAction "warn" only logs violations to the mongod log,
 * and validationLevel "moderate" skips updates to documents that are already
 * invalid. Run --check first, fix the data, then re-run with --action error.
 */

import { writeFileSync } from "node:fs";
import { MongoClient, type Db, type Document, type IndexDirection } from "mongodb";
import type { Schema as MongooseSchema, SchemaType } from "mongoose";
import { z } from "zod";

// ── Zod schemas (live app) ───────────────────────────────────────────────────
import { AssociationSchema } from "../lib/db/schemas/association.schema";
import { AssociationVenueSchema } from "../lib/db/schemas/associationVenue.schema";
import {
  CompetitionSchema,
  SeasonCompetitionSchema,
} from "../lib/db/schemas/competition.schema";
import { ExpenseLedgerEntryDocSchema } from "../lib/db/schemas/expenseLedger.schema";
import {
  FinanceAccountDocSchema,
  FinanceCostCentreDocSchema,
} from "../lib/db/schemas/financeCoa.schema";
import { IncomeLedgerEntryDocSchema } from "../lib/db/schemas/incomeLedger.schema";
import { LeagueFixtureSchema } from "../lib/db/schemas/leagueFixture.schema";
import { OfficialRegisterRecordSchema } from "../lib/db/schemas/officialRegister.schema";
import { PitchCalendarEntryDocSchema } from "../lib/db/schemas/pitchCalendarEntry.schema";
import { RepTournamentFixtureSchema } from "../lib/db/schemas/repTournamentFixture.schema";
import {
  TeamSchema,
  TEAM_INDEXES,
  MEMBER_TEAM_INDEXES,
} from "../lib/db/schemas/team.schema";
import { UmpireAssignmentDocSchema } from "../lib/db/schemas/umpireAssignment.schema";
import {
  AssociationUmpirePaymentScheduleSchema,
  UmpirePaymentLineDocSchema,
} from "../lib/db/schemas/umpireMatchPayment.schema";
import { UserSchema } from "../lib/db/schemas/user";
import { VolunteerDutyLeadDocSchema } from "../lib/db/schemas/volunteerDutyRoster.schema";

// ── Mongoose models (legacy) ─────────────────────────────────────────────────
import Registration from "../models/Registration";
import Tournament from "../models/Tournament";
import Training from "../models/Training";
import Trial from "../models/Trial";
// models/Config.ts (Role, Gender, RelationshipType) is intentionally NOT used:
// its `id`/`label` shape and unique `id` index don't match what the app and
// seed scripts write (config_relationships uses relationshipId; gender and
// roles moved to the unified `config` collection). Its unique index on a
// field nobody sets made every second insert fail with a duplicate null key.
//
// models/User.ts is intentionally NOT used: it targets the same `users`
// collection as lib/db/schemas/user.ts but has a different, unused shape
// (personal.firstName, contact.emails[] …). The Zod schema matches what
// app/api/admin/users writes, so it wins.

type IndexSpec = { key: Record<string, IndexDirection>; options?: Record<string, unknown> };
type Entry = {
  collection: string;
  source: string;
  schema: Document; // MongoDB $jsonSchema
  indexes: IndexSpec[];
};

// ═════════════════════════════════════════════════════════════════════════════
// CLI
// ═════════════════════════════════════════════════════════════════════════════
const argv = process.argv.slice(2);
const flag = (name: string) => argv.includes(`--${name}`);
const opt = (name: string) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 ? argv[i + 1] : undefined;
};

const DRY_RUN = flag("dry-run");
const CHECK = flag("check");
const STRICT_PROPS = flag("strict-props");
const OUT = opt("out");
const ONLY = opt("only")?.split(",").map((s) => s.trim()).filter(Boolean);
const ACTION = (opt("action") ?? "warn") as "warn" | "error";
const LEVEL = (opt("level") ?? "moderate") as "moderate" | "strict";

if (!["warn", "error"].includes(ACTION)) throw new Error(`--action must be warn|error`);
if (!["moderate", "strict"].includes(LEVEL)) throw new Error(`--level must be moderate|strict`);

// ═════════════════════════════════════════════════════════════════════════════
// JSON Schema → MongoDB $jsonSchema
// MongoDB implements draft-4 with a fixed keyword set, adds `bsonType`, and has
// no $ref, format, default, const, propertyNames, etc.
// ═════════════════════════════════════════════════════════════════════════════
const MONGO_KEYWORDS = new Set([
  "bsonType", "type", "enum", "allOf", "anyOf", "oneOf", "not",
  "multipleOf", "maximum", "exclusiveMaximum", "minimum", "exclusiveMinimum",
  "maxLength", "minLength", "pattern",
  "maxProperties", "minProperties", "required", "additionalProperties",
  "properties", "patternProperties", "dependencies",
  "additionalItems", "items", "maxItems", "minItems", "uniqueItems",
  "title", "description",
]);

const NUMERIC_BSON = ["int", "long", "double", "decimal"];

function toMongoSchema(node: unknown, defs: Record<string, unknown>, seen = new Set<string>()): Document {
  if (node === true || node === undefined) return {};
  if (node === false) return { not: {} };
  if (typeof node !== "object" || node === null) return {};
  let s = { ...(node as Record<string, unknown>) };

  // Inline local $refs (Zod only emits them for recursive schemas).
  if (typeof s.$ref === "string") {
    const name = s.$ref.replace(/^#\/(\$defs|definitions)\//, "");
    if (seen.has(name) || !(name in defs)) return {}; // cycle → accept anything below this point
    const { $ref: _r, ...rest } = s;
    s = { ...(defs[name] as object), ...rest };
    seen = new Set(seen).add(name);
  }

  const out: Document = {};

  // const → enum
  if ("const" in s) out.enum = [s.const];

  // draft-2020 numeric exclusive bounds → draft-4 booleans
  if (typeof s.exclusiveMinimum === "number") {
    out.minimum = s.exclusiveMinimum;
    out.exclusiveMinimum = true;
    delete s.exclusiveMinimum;
  }
  if (typeof s.exclusiveMaximum === "number") {
    out.maximum = s.exclusiveMaximum;
    out.exclusiveMaximum = true;
    delete s.exclusiveMaximum;
  }

  // `integer` is not a MongoDB type; whole numbers may be stored as int, long or double.
  const types = s.type === undefined ? [] : Array.isArray(s.type) ? s.type : [s.type];
  if (types.includes("integer")) {
    const bson = types.flatMap((t: string) =>
      t === "integer" ? ["int", "long", "double"] : t === "number" ? NUMERIC_BSON : [jsonToBson(t)]
    );
    out.bsonType = [...new Set(bson)];
    if (!types.includes("number")) out.multipleOf = 1;
    delete s.type;
  }

  // tuples (draft-2020 prefixItems) → draft-4 items array
  if (Array.isArray(s.prefixItems)) {
    out.items = s.prefixItems.map((i) => toMongoSchema(i, defs, seen));
    if (s.items !== undefined) out.additionalItems = toMongoSchema(s.items, defs, seen);
    delete s.items;
  }

  for (const [k, v] of Object.entries(s)) {
    if (!MONGO_KEYWORDS.has(k) || k in out) continue;
    switch (k) {
      case "properties":
      case "patternProperties":
        out[k] = Object.fromEntries(
          Object.entries(v as object).map(([p, sub]) => [p, toMongoSchema(sub, defs, seen)])
        );
        break;
      case "items":
        out.items = Array.isArray(v) ? v.map((i) => toMongoSchema(i, defs, seen)) : toMongoSchema(v, defs, seen);
        break;
      case "additionalProperties":
      case "additionalItems":
      case "not":
        if (v === false && k === "additionalProperties") {
          if (STRICT_PROPS) out[k] = false;
        } else if (typeof v === "boolean") {
          out[k] = v;
        } else {
          out[k] = toMongoSchema(v, defs, seen);
        }
        break;
      case "allOf":
      case "anyOf":
      case "oneOf":
        out[k] = (v as unknown[]).map((i) => toMongoSchema(i, defs, seen));
        break;
      case "required":
      case "enum":
        if (Array.isArray(v) && v.length > 0) out[k] = v;
        break;
      default:
        out[k] = v;
    }
  }

  // `type` and `bsonType` can't coexist.
  if (out.bsonType && out.type) delete out.type;
  return out;
}

function jsonToBson(t: string): string {
  return ({ string: "string", boolean: "bool", object: "object", array: "array", null: "null" } as Record<string, string>)[t] ?? t;
}

// ═════════════════════════════════════════════════════════════════════════════
// Zod → $jsonSchema
// ═════════════════════════════════════════════════════════════════════════════
function fromZod(schema: z.ZodType): Document {
  const json = z.toJSONSchema(schema, {
    // "input": fields with .default() are optional, which matches documents
    // written before a default existed (or written without going through Zod).
    io: "input",
    unrepresentable: "any",
    override: (ctx) => {
      const def = (ctx.zodSchema as { _zod: { def: { type: string; catchall?: unknown } } })._zod.def;
      if (def.type === "date") {
        for (const k of Object.keys(ctx.jsonSchema)) delete (ctx.jsonSchema as Record<string, unknown>)[k];
        (ctx.jsonSchema as Record<string, unknown>).bsonType = "date";
      }
      // In "input" mode Zod only closes .strict() objects. --strict-props closes
      // plain objects too; a catchall (.loose(), .catchall()) stays open on purpose.
      if (STRICT_PROPS && def.type === "object" && def.catchall === undefined) {
        (ctx.jsonSchema as Record<string, unknown>).additionalProperties = false;
      }
    },
  }) as Record<string, unknown>;
  const defs = (json.$defs ?? json.definitions ?? {}) as Record<string, unknown>;
  return withRoot(toMongoSchema(json, defs));
}

// ═════════════════════════════════════════════════════════════════════════════
// Mongoose → $jsonSchema
// ═════════════════════════════════════════════════════════════════════════════
type AnySchemaType = SchemaType & {
  instance: string;
  options: Record<string, unknown>;
  enumValues?: unknown[];
  schema?: MongooseSchema;
  caster?: AnySchemaType;
  embeddedSchemaType?: AnySchemaType;
};

const MONGOOSE_BSON: Record<string, string | string[]> = {
  String: "string",
  Number: NUMERIC_BSON,
  Double: "double",
  Int32: "int",
  BigInt: "long",
  Decimal128: "decimal",
  Boolean: "bool",
  Date: "date",
  ObjectId: "objectId",
  Buffer: "binData",
  UUID: "binData",
  Map: "object",
};

function isRequired(st: AnySchemaType): boolean {
  const r = st.options?.required;
  return r === true || (Array.isArray(r) && r[0] === true);
}

function mongooseType(st: AnySchemaType): Document {
  const o = st.options ?? {};

  if (st.instance === "Array") {
    const inner = st.schema
      ? fromMongooseSchema(st.schema, false) // DocumentArray
      : st.embeddedSchemaType ?? st.caster
        ? mongooseType((st.embeddedSchemaType ?? st.caster)!)
        : {};
    return { bsonType: "array", items: inner };
  }
  if (st.instance === "Embedded" && st.schema) return fromMongooseSchema(st.schema, false);
  if (st.instance === "Mixed") return {};

  const out: Document = {};
  const bson = MONGOOSE_BSON[st.instance];
  if (bson) out.bsonType = bson;

  const enumVals = (o.enum as unknown) ?? st.enumValues;
  const list = Array.isArray(enumVals) ? enumVals : (enumVals as { values?: unknown[] })?.values;
  if (list?.length) out.enum = list;

  const num = (v: unknown) => (Array.isArray(v) ? v[0] : v) as number | undefined;
  if (num(o.min) !== undefined && typeof num(o.min) === "number") out.minimum = num(o.min);
  if (num(o.max) !== undefined && typeof num(o.max) === "number") out.maximum = num(o.max);
  if (num(o.minlength) !== undefined) out.minLength = num(o.minlength);
  if (num(o.maxlength) !== undefined) out.maxLength = num(o.maxlength);
  const match = Array.isArray(o.match) ? o.match[0] : o.match;
  if (match instanceof RegExp) out.pattern = match.source;
  return out;
}

/** Mongoose allows null on any non-required path, so the validator must too. */
function nullable(s: Document): Document {
  if (s.bsonType) {
    const b = Array.isArray(s.bsonType) ? s.bsonType : [s.bsonType];
    const next: Document = { ...s, bsonType: [...new Set([...b, "null"])] };
    if (next.enum) next.enum = [...new Set([...next.enum, null])];
    return next;
  }
  return Object.keys(s).length ? { anyOf: [s, { bsonType: "null" }] } : s;
}

function fromMongooseSchema(schema: MongooseSchema, root = true): Document {
  // Build a tree from dotted paths ("personal.firstName" → personal: { firstName })
  type Node = { props: Record<string, Node | Document>; required: string[] };
  const tree: Node = { props: {}, required: [] };

  for (const [path, stRaw] of Object.entries(schema.paths)) {
    const st = stRaw as unknown as AnySchemaType;
    if (path === "__v") {
      // Unconstrained, but it must stay listed or --strict-props rejects it as unknown.
      if (STRICT_PROPS) tree.props.__v = {};
      continue;
    }
    const parts = path.split(".");
    let node = tree;
    for (const part of parts.slice(0, -1)) {
      node.props[part] ??= { props: {}, required: [] } as Node;
      node = node.props[part] as Node;
    }
    const leaf = parts[parts.length - 1];
    const req = isRequired(st) || path === "_id";
    let t = mongooseType(st);
    if (!req) t = nullable(t);
    node.props[leaf] = t;
    if (isRequired(st)) node.required.push(leaf);
  }

  const build = (n: Node): Document => {
    const properties = Object.fromEntries(
      Object.entries(n.props).map(([k, v]) => ("props" in v ? [k, build(v as Node)] : [k, v]))
    );
    const out: Document = { bsonType: "object", properties };
    if (n.required.length) out.required = n.required;
    if (STRICT_PROPS) out.additionalProperties = false;
    return out;
  };

  const s = build(tree);
  return root ? withRoot(s) : s;
}

function mongooseIndexes(schema: MongooseSchema): IndexSpec[] {
  return schema.indexes().map(([key, options]) => ({
    key: key as Record<string, IndexDirection>,
    options: options as Record<string, unknown>,
  }));
}

// ── shared ───────────────────────────────────────────────────────────────────
function withRoot(s: Document): Document {
  const out: Document = { bsonType: "object", ...s };
  delete out.type;
  // Leave _id unconstrained: the driver adds ObjectIds, some seed scripts use strings.
  if (out.properties?._id) {
    out.properties = { ...out.properties };
    delete out.properties._id;
  }
  // A closed object must still list _id, or every document fails validation.
  if (out.additionalProperties === false) out.properties = { ...out.properties, _id: {} };
  if (Array.isArray(out.required)) {
    out.required = out.required.filter((r: string) => r !== "_id");
    if (!out.required.length) delete out.required;
  }
  return out;
}

function teamIdx(list: readonly { key: Record<string, number>; unique?: boolean }[]): IndexSpec[] {
  return list.map(({ key, ...options }) => ({ key: key as Record<string, IndexDirection>, options }));
}

// ═════════════════════════════════════════════════════════════════════════════
// Registry: collection ← model
// ═════════════════════════════════════════════════════════════════════════════
const zodEntries: [string, z.ZodType, string, IndexSpec[]?][] = [
  ["associations", AssociationSchema, "association.schema.ts"],
  ["association_venues", AssociationVenueSchema, "associationVenue.schema.ts"],
  ["competitions", CompetitionSchema, "competition.schema.ts"],
  ["season_competitions", SeasonCompetitionSchema, "competition.schema.ts"],
  ["expense_ledger", ExpenseLedgerEntryDocSchema, "expenseLedger.schema.ts"],
  ["finance_accounts", FinanceAccountDocSchema, "financeCoa.schema.ts"],
  ["finance_cost_centres", FinanceCostCentreDocSchema, "financeCoa.schema.ts"],
  ["income_ledger", IncomeLedgerEntryDocSchema, "incomeLedger.schema.ts"],
  ["league_fixtures", LeagueFixtureSchema, "leagueFixture.schema.ts"],
  ["association_official_register", OfficialRegisterRecordSchema, "officialRegister.schema.ts"],
  ["pitch_calendar_entries", PitchCalendarEntryDocSchema, "pitchCalendarEntry.schema.ts"],
  ["rep_tournament_fixtures", RepTournamentFixtureSchema, "repTournamentFixture.schema.ts"],
  ["teams", TeamSchema, "team.schema.ts", teamIdx(TEAM_INDEXES)],
  ["umpire_assignments", UmpireAssignmentDocSchema, "umpireAssignment.schema.ts"],
  ["association_umpire_payment_schedules", AssociationUmpirePaymentScheduleSchema, "umpireMatchPayment.schema.ts"],
  ["umpire_match_payment_lines", UmpirePaymentLineDocSchema, "umpireMatchPayment.schema.ts"],
  ["club_volunteer_duty_leads", VolunteerDutyLeadDocSchema, "volunteerDutyRoster.schema.ts"],
  ["users", UserSchema, "user.ts"],
];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mongooseModels: any[] = [Registration, Tournament, Training, Trial];

function buildRegistry(): Entry[] {
  const entries: Entry[] = [];
  for (const [collection, schema, file, indexes] of zodEntries) {
    entries.push({ collection, source: `zod  lib/db/schemas/${file}`, schema: fromZod(schema), indexes: indexes ?? [] });
  }
  for (const m of mongooseModels) {
    entries.push({
      collection: m.collection.collectionName,
      source: `mongoose  models/${m.modelName}`,
      schema: fromMongooseSchema(m.schema),
      indexes: mongooseIndexes(m.schema),
    });
  }
  // members isn't modelled yet, but team.schema.ts declares its team indexes.
  entries.push({ collection: "members", source: "team.schema.ts (indexes only)", schema: {}, indexes: teamIdx(MEMBER_TEAM_INDEXES) });
  return ONLY ? entries.filter((e) => ONLY.includes(e.collection)) : entries;
}

// ═════════════════════════════════════════════════════════════════════════════
// Apply / check
// ═════════════════════════════════════════════════════════════════════════════
async function applyEntry(db: Db, e: Entry, existing: Set<string>) {
  const hasValidator = Object.keys(e.schema).length > 0;
  const validator = { $jsonSchema: e.schema };

  if (!existing.has(e.collection)) {
    await db.createCollection(
      e.collection,
      hasValidator ? { validator, validationLevel: LEVEL, validationAction: ACTION } : {}
    );
    console.log(`  ✔ created${hasValidator ? " with validator" : ""}`);
  } else if (hasValidator) {
    await db.command({ collMod: e.collection, validator, validationLevel: LEVEL, validationAction: ACTION });
    console.log(`  ✔ validator updated`);
  }

  let indexFailures = 0;
  for (const { key, options } of e.indexes) {
    const label = JSON.stringify(key) + (options?.unique ? " unique" : "");
    try {
      await db.collection(e.collection).createIndex(key, options ?? {});
      console.log(`  ✔ index ${label}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      const benign = /already exists|same name/i.test(msg);
      if (!benign) indexFailures++;
      console.warn(`  ${benign ? "⚠" : "✘"} index ${label} — ${msg}`);
    }
  }
  if (indexFailures) throw new Error(`${indexFailures} index(es) failed on ${e.collection}`);
}

async function checkEntry(db: Db, e: Entry, existing: Set<string>) {
  if (!existing.has(e.collection) || !Object.keys(e.schema).length) {
    console.log(`  – ${existing.has(e.collection) ? "no validator" : "collection does not exist yet"}`);
    return;
  }
  const col = db.collection(e.collection);
  const total = await col.estimatedDocumentCount();
  const bad = await col.countDocuments({ $nor: [{ $jsonSchema: e.schema }] });
  if (!bad) {
    console.log(`  ✔ all ${total} documents valid`);
    return;
  }
  console.log(`  ✘ ${bad}/${total} documents would fail. By field:`);

  // Narrow down to top-level fields so the report is actionable.
  const props = (e.schema.properties ?? {}) as Record<string, Document>;
  const required = new Set<string>(e.schema.required ?? []);
  for (const [p, sub] of Object.entries(props)) {
    const missing = required.has(p) ? await col.countDocuments({ [p]: { $exists: false } }) : 0;
    const wrong = await col.countDocuments({ $nor: [{ $jsonSchema: { properties: { [p]: sub } } }] });
    if (missing || wrong) {
      const sample = wrong
        ? await col.findOne({ $nor: [{ $jsonSchema: { properties: { [p]: sub } } }] }, { projection: { [p]: 1 } })
        : null;
      const eg = sample ? `  e.g. _id ${sample._id}: ${JSON.stringify(sample[p])?.slice(0, 80)}` : "";
      console.log(`      ${p.padEnd(28)} ${missing ? `${missing} missing ` : ""}${wrong ? `${wrong} wrong type/value` : ""}${eg}`);
    }
  }
  if (STRICT_PROPS) console.log(`      (--strict-props: unknown fields also cause failures)`);
}

// ═════════════════════════════════════════════════════════════════════════════
// Main
// ═════════════════════════════════════════════════════════════════════════════
function loadEnv() {
  for (const f of [".env.local", ".env"]) {
    try {
      process.loadEnvFile(f);
    } catch {
      /* file not present */
    }
  }
}

async function main() {
  const entries = buildRegistry();

  if (OUT) {
    writeFileSync(OUT, JSON.stringify(Object.fromEntries(entries.map((e) => [e.collection, e.schema])), null, 2));
    console.log(`📝  Wrote ${entries.length} schemas to ${OUT}`);
  }

  if (DRY_RUN) {
    for (const e of entries) {
      console.log(`\n── ${e.collection}  (${e.source})`);
      console.log(JSON.stringify(e.schema, null, 2));
      for (const i of e.indexes) console.log(`   index ${JSON.stringify(i.key)} ${JSON.stringify(i.options ?? {})}`);
    }
    return;
  }

  loadEnv();
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("❌  MONGODB_URI is not set (.env or .env.local)");
    process.exit(1);
  }
  const dbName = process.env.DB_NAME?.trim() || "hockey-app";

  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db(dbName);
    const existing = new Set((await db.listCollections({}, { nameOnly: true }).toArray()).map((c) => c.name));

    console.log(`\n✅  Connected — database "${dbName}"`);
    console.log(CHECK ? `🔎  Check mode: nothing will be changed\n` : `⚙️   validationAction=${ACTION}  validationLevel=${LEVEL}  strictProps=${STRICT_PROPS}\n`);

    let failed = 0;
    for (const e of entries) {
      console.log(`${e.collection}  ← ${e.source}`);
      try {
        await (CHECK ? checkEntry(db, e, existing) : applyEntry(db, e, existing));
      } catch (err) {
        failed++;
        console.error(`  ✘ ${err instanceof Error ? err.message : String(err)}`);
      }
    }
    console.log(failed ? `\n⚠️   Done with ${failed} error(s)` : `\n🎉  Done`);
    if (failed) process.exitCode = 1;
  } finally {
    await client.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
