// scripts/create-super-admin.ts
//
// Creates a super-admin login in the `users` collection with a randomly
// generated password (printed once, never stored in the repo). The user must
// change it at first login.
//
//   npx tsx scripts/create-super-admin.ts --username=ged --email=you@example.com --first=Ged --last=Admin
//   npx tsx scripts/create-super-admin.ts --username=ged --reset      # new password for an existing login
//
// Options:
//   --username=…   login name (required; letters, numbers, . _ -)
//   --email=…      email (optional; defaults to <username>@hockey-app.local)
//   --first= / --last=   name shown in the app
//   --password=…   use this password instead of generating one (min 12 chars)
//   --reset        if the user exists, set a new password and make them super-admin
//
// Uses MONGODB_URI and DB_NAME (default "hockey-app") from .env.local — the
// same database the login reads.

import "./load-env";
import dns from "node:dns";
import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { MongoClient } from "mongodb";

if (process.env.DNS_SERVERS !== "system") {
  dns.setServers((process.env.DNS_SERVERS || "1.1.1.1,8.8.8.8").split(","));
}

const arg = (k: string) => process.argv.find((a) => a.startsWith(`--${k}=`))?.split("=").slice(1).join("=").trim();
const flag = (k: string) => process.argv.includes(`--${k}`);

function generatePassword(): string {
  // 16 chars from an unambiguous set, guaranteed upper/lower/digit/symbol
  const sets = ["ABCDEFGHJKLMNPQRSTUVWXYZ", "abcdefghijkmnopqrstuvwxyz", "23456789", "!@#$%^&*-_=+"];
  const all = sets.join("");
  const pick = (s: string) => s[crypto.randomInt(s.length)]!;
  const chars = [...sets.map(pick), ...Array.from({ length: 12 }, () => pick(all))];
  for (let i = chars.length - 1; i > 0; i--) {
    const j = crypto.randomInt(i + 1);
    [chars[i], chars[j]] = [chars[j]!, chars[i]!];
  }
  return chars.join("");
}

async function main() {
  const username = arg("username")?.toLowerCase();
  if (!username || !/^[a-z0-9._-]{3,40}$/.test(username)) {
    console.error("Usage: npx tsx scripts/create-super-admin.ts --username=<name> [--email=…] [--first=…] [--last=…] [--reset]");
    console.error("Username: 3–40 characters, letters/numbers/. _ -");
    process.exit(1);
  }
  const email = (arg("email") || `${username}@hockey-app.local`).toLowerCase();
  const firstName = arg("first") || "Super";
  const lastName = arg("last") || "Admin";
  const given = arg("password");
  if (given && given.length < 12) {
    console.error("--password must be at least 12 characters.");
    process.exit(1);
  }
  const password = given || generatePassword();

  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is not set (check .env.local).");
  const dbName = process.env.DB_NAME?.trim() || "hockey-app";
  const client = new MongoClient(uri);
  await client.connect();
  try {
    const users = client.db(dbName).collection("users");
    const existing = await users.findOne({
      $or: [{ username: { $regex: `^${username.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, $options: "i" } }, { email }],
    });
    const now = new Date();
    const passwordHash = await bcrypt.hash(password, 12);

    if (existing && !flag("reset")) {
      console.error(`A user with username "${existing.username ?? "?"}" / email "${existing.email ?? "?"}" already exists in ${dbName}.users.`);
      console.error("Use --reset to give it a new password and super-admin role, or choose another --username/--email.");
      process.exit(1);
    }

    if (existing) {
      await users.updateOne(
        { _id: existing._id },
        {
          $set: {
            role: "super-admin",
            status: "active",
            passwordHash,
            forcePasswordChange: true,
            loginAttempts: 0,
            lockedUntil: null,
            updatedAt: now,
          },
          $unset: { password: "" },
        },
      );
      console.log(`✅ Reset ${existing.username ?? existing.email} in ${dbName}.users (now super-admin).`);
    } else {
      await users.insertOne({
        userId: `user-${Date.now()}-${crypto.randomBytes(3).toString("hex")}`,
        username,
        email,
        firstName,
        lastName,
        phone: null,
        role: "super-admin",
        associationId: null,
        clubId: null,
        assignedTeams: [],
        linkedMembers: [],
        status: "active",
        emailVerified: true,
        passwordHash,
        forcePasswordChange: true,
        lastLogin: null,
        loginAttempts: 0,
        lockedUntil: null,
        createdAt: now,
        updatedAt: now,
      });
      console.log(`✅ Super admin created in ${dbName}.users`);
    }

    console.log("");
    console.log(`   Username: ${username}`);
    console.log(`   Email:    ${email}`);
    console.log(`   Password: ${password}`);
    console.log("");
    console.log("This password is shown once and isn't saved anywhere else.");
    console.log("You'll be asked to change it the first time you log in.");
  } finally {
    await client.close();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
