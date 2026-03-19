// lib/auth/username.ts
// Username generation and password utilities for member authentication

import bcrypt from "bcryptjs";
import { Db } from "mongodb";

/**
 * Generate a unique username following the pattern:
 * {firstInitial}{cleanLastName}{3-digit counter}
 * e.g. "Sarah Johnson" → "sjohnson001"
 */
export async function generateUsername(
  firstName: string,
  lastName: string,
  db: Db
): Promise<string> {
  // Strip non-alpha characters and lowercase
  const firstInitial = firstName
    .trim()
    .replace(/[^a-zA-Z]/g, "")
    .charAt(0)
    .toLowerCase();

  const cleanLastName = lastName
    .trim()
    .replace(/[^a-zA-Z]/g, "")
    .toLowerCase();

  const base = `${firstInitial}${cleanLastName}`;

  // Find all existing members whose username starts with this base
  const existingMembers = await db
    .collection("members")
    .find(
      { "auth.username": { $regex: `^${base}\\d{3}$` } },
      { projection: { "auth.username": 1 } }
    )
    .toArray();

  // Extract all counters from existing usernames
  const usedCounters = existingMembers
    .map((m) => {
      const username: string = m.auth?.username || "";
      const match = username.match(new RegExp(`^${base}(\\d{3})$`));
      return match ? parseInt(match[1], 10) : null;
    })
    .filter((n): n is number => n !== null);

  // Find the next available counter starting at 1
  let counter = 1;
  while (usedCounters.includes(counter)) {
    counter++;
  }

  // Format counter as 3-digit zero-padded string
  const counterStr = String(counter).padStart(3, "0");

  return `${base}${counterStr}`;
}

/**
 * Hash a plain-text password using bcrypt with 12 rounds.
 */
export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 12);
}

/**
 * Verify a plain-text password against a bcrypt hash.
 */
export async function verifyPassword(
  plain: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

/**
 * Generate a random temporary password in the format Hockey{YYYY}!
 */
export function generateTempPassword(): string {
  const year = new Date().getFullYear();
  return `Hockey${year}!`;
}

/**
 * Generate a random 8-character alphanumeric password.
 */
export function generateRandomPassword(length: number = 8): string {
  const chars =
    "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}
