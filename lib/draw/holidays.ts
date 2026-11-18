// lib/draw/holidays.ts — Queensland (and national) public holidays, used to keep matches off those days.
import { addDays } from "@/lib/draw/time";

export interface Holiday { date: string; name: string }

const pad = (n: number) => String(n).padStart(2, "0");
const iso = (y: number, m: number, d: number) => `${y}-${pad(m)}-${pad(d)}`;
/** 0 = Sunday ... 6 = Saturday. */
export const weekdayOf = (day: string) => new Date(`${day}T00:00:00Z`).getUTCDay();

/** Easter Sunday (Gregorian). */
export function easterSunday(year: number): string {
  const a = year % 19, b = Math.floor(year / 100), c = year % 100, d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31), day = ((h + l - 7 * m + 114) % 31) + 1;
  return iso(year, month, day);
}

/** The first Monday on or after the 1st of the month. */
function firstMonday(year: number, month: number): string {
  const first = iso(year, month, 1);
  return addDays(first, (8 - weekdayOf(first)) % 7);
}

/** The next Monday after a weekend day (or the day itself when it is already a weekday). */
const toWeekday = (day: string) => (weekdayOf(day) === 6 ? addDays(day, 2) : weekdayOf(day) === 0 ? addDays(day, 1) : day);

/**
 * Queensland statewide public holidays for a year, including the extra days given when a holiday falls on a weekend.
 * Local show days (such as the Brisbane Ekka, a weekday) are left out.
 */
export function queenslandHolidays(year: number): Holiday[] {
  const out: Holiday[] = [];
  const add = (date: string, name: string) => { if (!out.some((h) => h.date === date && h.name === name)) out.push({ date, name }); };
  const ny = iso(year, 1, 1); add(ny, "New Year's Day"); if (weekdayOf(ny) === 6 || weekdayOf(ny) === 0) add(toWeekday(ny), "New Year's Day (extra day)");
  const ad = iso(year, 1, 26); add(ad, "Australia Day"); if (weekdayOf(ad) === 6 || weekdayOf(ad) === 0) add(toWeekday(ad), "Australia Day (extra day)");
  const easter = easterSunday(year);
  add(addDays(easter, -2), "Good Friday"); add(addDays(easter, -1), "Easter Saturday"); add(easter, "Easter Sunday"); add(addDays(easter, 1), "Easter Monday");
  const anzac = iso(year, 4, 25); add(anzac, "Anzac Day"); if (weekdayOf(anzac) === 0) add(addDays(anzac, 1), "Anzac Day (extra day)");
  add(firstMonday(year, 5), "Labour Day");
  add(firstMonday(year, 10), "King's Birthday");
  const xmas = iso(year, 12, 25), box = iso(year, 12, 26);
  add(xmas, "Christmas Day"); add(box, "Boxing Day");
  const wx = weekdayOf(xmas);
  if (wx === 6) { add(addDays(xmas, 2), "Christmas Day (extra day)"); add(addDays(xmas, 3), "Boxing Day (extra day)"); }
  else if (wx === 0) add(addDays(xmas, 2), "Christmas Day (extra day)");
  else if (wx === 5) add(addDays(box, 2), "Boxing Day (extra day)");
  return out.sort((a, b) => a.date.localeCompare(b.date));
}

/** Every day from `from` to `to`, inclusive. */
export function dayRange(from: string, to: string): string[] {
  const out: string[] = [];
  for (let d = from; d <= to && out.length < 400; d = addDays(d, 1)) out.push(d);
  return out;
}
