import { promises as fs } from "node:fs";
import path from "node:path";

const appDir = path.join(process.cwd(), "app");

function isDynamicSegment(name) {
  return /^\[[^/]+\]$/.test(name);
}

async function exists(p) {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

async function countFilesRecursive(dir) {
  let count = 0;
  const stack = [dir];

  while (stack.length > 0) {
    const current = stack.pop();
    if (!current) continue;
    const entries = await fs.readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(fullPath);
      } else if (entry.isFile()) {
        count += 1;
      }
    }
  }

  return count;
}

async function walkAndClean(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const dynamicSiblings = entries.filter(
    (entry) => entry.isDirectory() && isDynamicSegment(entry.name),
  );

  if (dynamicSiblings.length > 1) {
    const checks = await Promise.all(
      dynamicSiblings.map(async (entry) => {
        const fullPath = path.join(dir, entry.name);
        const fileCount = await countFilesRecursive(fullPath);
        return { name: entry.name, fullPath, fileCount };
      }),
    );

    const stale = checks.filter((item) => item.fileCount === 0);
    for (const item of stale) {
      await fs.rm(item.fullPath, { recursive: true, force: true });
      const rel = path.relative(process.cwd(), item.fullPath);
      console.log(`[slug-cleanup] removed stale empty dynamic route dir: ${rel}`);
    }

    const remaining = checks.filter((item) => item.fileCount > 0);
    if (remaining.length > 1) {
      const relParent = path.relative(process.cwd(), dir);
      const names = remaining.map((item) => item.name).join(", ");
      throw new Error(
        `[slug-cleanup] conflicting dynamic route segments under ${relParent}: ${names}`,
      );
    }
  }

  const refreshed = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of refreshed) {
    if (!entry.isDirectory()) continue;
    await walkAndClean(path.join(dir, entry.name));
  }
}

async function main() {
  if (!(await exists(appDir))) return;
  await walkAndClean(appDir);
}

main().catch((error) => {
  console.error(
    "[slug-cleanup] failed:",
    error instanceof Error ? error.message : String(error),
  );
  process.exit(1);
});
