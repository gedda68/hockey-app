/** RFC 4180-style CSV field escaping. */
export function csvEscapeField(value: string): string {
  const s = value ?? "";
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export function toCsvRow(fields: string[]): string {
  return fields.map(csvEscapeField).join(",") + "\r\n";
}
