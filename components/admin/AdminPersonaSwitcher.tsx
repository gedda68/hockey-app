"use client";

// One entry per organisation (club / association), plus Personal. Roles held in an organisation combine,
// so there is no separate role picker. The last organisation used is restored after sign-in.

import { useState, useRef, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Building2, ChevronDown, User as UserIcon } from "lucide-react";
import { useAuth } from "@/lib/auth/AuthContext";
import { groupPersonasByOrg } from "@/lib/auth/orgPersonas";
import { toast } from "sonner";

export default function AdminPersonaSwitcher() {
  const router = useRouter();
  const { user, switchPersona } = useAuth();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const entries = useMemo(() => groupPersonasByOrg(user?.personas, user?.activePersonaKey), [user?.personas, user?.activePersonaKey]);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  // After sign-in, reopen the organisation the person last worked in (once per browser session).
  useEffect(() => {
    if (!user?.lastPersonaKey || !user.personas) return;
    try {
      if (sessionStorage.getItem("persona-restored") === user.memberId) return;
      sessionStorage.setItem("persona-restored", user.memberId ?? "1");
    } catch { /* storage unavailable: just skip */ }
    const last = user.personas.find((p) => p.key === user.lastPersonaKey);
    const lastEntry = last ? entries.find((e) => e.orgKey === (last.orgKey ?? "personal")) : null;
    if (!lastEntry || lastEntry.active) return;
    void switchPersona(lastEntry.personaKey).then(() => router.refresh()).catch(() => undefined);
  }, [user?.lastPersonaKey, user?.personas, user?.memberId, entries, switchPersona, router]);

  // One organisation (and no personal view) means nothing to choose.
  if (entries.length <= 1) return null;

  const current = entries.find((e) => e.active) ?? entries[0];

  const select = async (personaKey: string, active: boolean) => {
    if (active) { setOpen(false); return; }
    setPending(true);
    try {
      await switchPersona(personaKey);
      toast.success("Switched organisation");
      setOpen(false);
      router.refresh();
    } catch {
      toast.error("Could not switch organisation");
    } finally {
      setPending(false);
    }
  };

  const Icon = current.orgKey === "personal" ? UserIcon : Building2;

  return (
    <div className="relative mb-3" ref={ref}>
      <button
        type="button"
        disabled={pending}
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-white/10 hover:bg-white/15 text-left text-xs transition-colors disabled:opacity-50"
      >
        <Icon className="h-4 w-4 flex-shrink-0 opacity-90" />
        <div className="flex-1 min-w-0">
          <div className="text-[10px] font-bold uppercase tracking-wider text-white/50">Working in</div>
          <div className="font-semibold truncate text-sm">{current.label}</div>
        </div>
        <ChevronDown className={`h-4 w-4 flex-shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <ul className="absolute left-0 right-0 bottom-full mb-1 max-h-64 overflow-y-auto rounded-lg bg-[#0f0e3d] border border-white/15 shadow-xl z-[1100] py-1">
          {entries.map((e) => (
            <li key={e.orgKey}>
              <button
                type="button"
                disabled={pending}
                onClick={() => void select(e.personaKey, e.active)}
                className={`w-full text-left px-3 py-2 text-xs hover:bg-white/10 transition-colors ${e.active ? "text-yellow-300" : "text-white/90"}`}
              >
                <div className="font-bold">{e.label}</div>
                <div className="text-[10px] opacity-60 truncate">{e.orgKey === "personal" ? "My profile, stats and invitations" : e.roleLabels.join(" · ")}</div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
