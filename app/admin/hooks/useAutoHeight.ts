// app/admin/hooks/useAutoHeight.ts

import { useEffect, useRef, useState } from "react";

export function useAutoHeight(deps: unknown[] = []) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [height, setHeight] = useState<number | "auto">(0);

  useEffect(() => {
    if (!ref.current) return;
    setHeight(ref.current.scrollHeight);
  }, deps);

  return { ref, height };
}
