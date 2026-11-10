"use client";

import { useCallback, useMemo, useState } from "react";
import { clampVisible, nextVisibleCount, sanitizePageSize } from "./incremental";

/**
 * Reveals a long list a page at a time. Pass a `resetKey` that changes whenever the
 * list is re-filtered, so the visitor goes back to the first page (adjusting state
 * during render, which React supports, rather than in an effect).
 */
export function useIncrementalList<T>(items: readonly T[], pageSize?: number, resetKey = "") {
  const size = sanitizePageSize(pageSize);
  const [state, setState] = useState({ count: size, key: resetKey });

  let count = state.count;
  if (state.key !== resetKey) {
    count = size;
    setState({ count: size, key: resetKey });
  }

  const total = items.length;
  const shown = clampVisible(count, total, size);
  const visible = useMemo(() => items.slice(0, shown), [items, shown]);

  const showMore = useCallback(() => {
    setState((s) => ({
      key: s.key,
      count: nextVisibleCount(clampVisible(s.count, total, size), total, size),
    }));
  }, [total, size]);

  return { visible, shown, total, hasMore: shown < total, showMore };
}
