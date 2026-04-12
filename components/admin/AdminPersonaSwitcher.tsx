"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Users } from "lucide-react";
import { useAuth } from "@/lib/auth/AuthContext";
import { toast } from "sonner";

export default function AdminPersonaSwitcher() {
  const router = useRouter();
  const { user, switchPersona } = useAuth();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  if (!user?.personas || user.personas.length <= 1) return null;

  const current =
    user.personas.find((p) => p.key === user.activePersonaKey) ?? user.personas[0];

  const select = async (key: string) => {
    if (key === user.activePersonaKey) {
      setOpen(false);
      return;
    }
    setPending(true);
    try {
      await switchPersona(key);
      toast.success("Switched active role");
      setOpen(false);
      router.refresh();
    } catch {
      toast.error("Could not switch role");
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="relative mb-3" ref={ref}>
      <button
        type="button"
        disabled={pending}
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-white/10 hover:bg-white/15 text-left text-xs transition-colors disabled:opacity-50"
      >
        <Users className="h-4 w-4 flex-shrink-0 opacity-90" />
        <div className="flex-1 min-w-0">
          <div className="text-[10px] font-bold uppercase tracking-wider text-white/50">
            Active role
          </div>
          <div className="font-semibold truncate text-sm">{current.label}</div>
        </div>
        <ChevronDown
          className={`h-4 w-4 flex-shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <ul className="absolute left-0 right-0 bottom-full mb-1 max-h-52 overflow-y-auto rounded-lg bg-[#0f0e3d] border border-white/15 shadow-xl z-[1100] py-1">
          {user.personas.map((p) => (
            <li key={p.key}>
              <button
                type="button"
                disabled={pending}
                onClick={() => void select(p.key)}
                className={`w-full text-left px-3 py-2 text-xs hover:bg-white/10 transition-colors ${
                  p.key === user.activePersonaKey ? "text-yellow-300 font-bold" : "text-white/90"
                }`}
              >
                {p.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
