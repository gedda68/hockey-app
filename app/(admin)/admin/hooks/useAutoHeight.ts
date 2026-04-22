// app/admin/hooks/useAutoHeight.ts

import { useEffect, useRef, useState } from "react";

export function useAutoHeight(deps: unknown[] = []) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [height, setHeight] = useState<number | "auto">(0);

  useEffect(() => {
    if (!ref.current) return;
    setHeight(ref.current.scrollHeight);
  // deps is intentionally dynamic — callers supply the trigger list.
  // ESLint cannot statically verify a non-literal array; disable is correct here.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { ref, height };
}
