"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

type Account = {
  accountId: string;
  code: string;
  name: string;
  type: "income" | "expense" | "asset" | "liability" | "equity";
  active: boolean;
};

type CostCentre = {
  costCentreId: string;
  code: string;
  name: string;
  active: boolean;
};

const TYPES: Array<Account["type"]> = ["income", "expense", "asset", "liability", "equity"];

export function AssociationCoaClient({ associationId }: { associationId: string }) {
  const [tab, setTab] = useState<"accounts" | "costCentres">("accounts");
  const [loading, setLoading] = useState(true);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [costCentres, setCostCentres] = useState<CostCentre[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [newAccount, setNewAccount] = useState({ code: "", name: "", type: "income" as Account["type"] });
  const [newCc, setNewCc] = useState({ code: "", name: "" });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [aRes, cRes] = await Promise.all([
        fetch(`/api/admin/associations/${encodeURIComponent(associationId)}/finance/accounts`),
        fetch(`/api/admin/associations/${encodeURIComponent(associationId)}/finance/cost-centres`),
      ]);

      const aJson = await aRes.json();
      const cJson = await cRes.json();

      if (!aRes.ok) throw new Error(aJson?.error || "Failed to load accounts");
      if (!cRes.ok) throw new Error(cJson?.error || "Failed to load cost centres");

      setAccounts((aJson.accounts ?? []) as Account[]);
      setCostCentres((cJson.costCentres ?? []) as CostCentre[]);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [associationId]);

  useEffect(() => {
    void load();
  }, [load]);

  const groupedAccounts = useMemo(() => {
    const m = new Map<Account["type"], Account[]>();
    for (const t of TYPES) m.set(t, []);
    for (const a of accounts) (m.get(a.type) ?? m.set(a.type, []).get(a.type)!).push(a);
    return m;
  }, [accounts]);

  async function createAccount() {
    try {
      const res = await fetch(`/api/admin/associations/${encodeURIComponent(associationId)}/finance/accounts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newAccount),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Failed to create account");
      toast.success("Account created");
      setNewAccount({ code: "", name: "", type: "income" });
      await load();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : String(e));
    }
  }

  async function patchAccount(accountId: string, patch: Partial<Account>) {
    const res = await fetch(
      `/api/admin/associations/${encodeURIComponent(associationId)}/finance/accounts/${encodeURIComponent(accountId)}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      },
    );
    const json = await res.json();
    if (!res.ok) throw new Error(json?.error || "Failed to update account");
  }

  async function deactivateAccount(accountId: string) {
    try {
      const res = await fetch(
        `/api/admin/associations/${encodeURIComponent(associationId)}/finance/accounts/${encodeURIComponent(accountId)}`,
        { method: "DELETE" },
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Failed to deactivate account");
      toast.success("Account deactivated");
      await load();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : String(e));
    }
  }

  async function createCostCentre() {
    try {
      const res = await fetch(`/api/admin/associations/${encodeURIComponent(associationId)}/finance/cost-centres`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newCc),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Failed to create cost centre");
      toast.success("Cost centre created");
      setNewCc({ code: "", name: "" });
      await load();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : String(e));
    }
  }

  async function patchCostCentre(costCentreId: string, patch: Partial<CostCentre>) {
    const res = await fetch(
      `/api/admin/associations/${encodeURIComponent(associationId)}/finance/cost-centres/${encodeURIComponent(costCentreId)}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      },
    );
    const json = await res.json();
    if (!res.ok) throw new Error(json?.error || "Failed to update cost centre");
  }

  async function deactivateCostCentre(costCentreId: string) {
    try {
      const res = await fetch(
        `/api/admin/associations/${encodeURIComponent(associationId)}/finance/cost-centres/${encodeURIComponent(costCentreId)}`,
        { method: "DELETE" },
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Failed to deactivate cost centre");
      toast.success("Cost centre deactivated");
      await load();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : String(e));
    }
  }

  async function inlineEdit<T extends { id: string }>(fn: () => Promise<void>, rollback: () => void) {
    try {
      await fn();
      await load();
    } catch (e: unknown) {
      rollback();
      toast.error(e instanceof Error ? e.message : String(e));
    }
  }

  if (loading) {
    return <div className="p-6 text-sm text-slate-600">Loading…</div>;
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between gap-4 mb-5">
        <div>
          <h1 className="text-2xl font-black text-[#06054e]">Financials · Chart of accounts</h1>
          <p className="text-sm text-slate-600 mt-1">Codes are unique per association. Deleting just deactivates.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setTab("accounts")}
            className={`px-3 py-2 rounded-lg text-sm font-black border ${
              tab === "accounts" ? "bg-[#06054e] text-white border-[#06054e]" : "bg-white text-[#06054e] border-slate-200"
            }`}
          >
            Accounts
          </button>
          <button
            onClick={() => setTab("costCentres")}
            className={`px-3 py-2 rounded-lg text-sm font-black border ${
              tab === "costCentres" ? "bg-[#06054e] text-white border-[#06054e]" : "bg-white text-[#06054e] border-slate-200"
            }`}
          >
            Cost centres
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-5 bg-red-50 border border-red-200 text-red-900 rounded-xl p-4 text-sm font-semibold">
          {error}
        </div>
      )}

      {tab === "accounts" ? (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-4">
            <div className="text-sm font-black text-slate-900 mb-3">Add account</div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <input
                className="input input-bordered w-full"
                placeholder="Code (e.g. REG)"
                value={newAccount.code}
                onChange={(e) => setNewAccount((s) => ({ ...s, code: e.target.value }))}
              />
              <input
                className="input input-bordered w-full md:col-span-2"
                placeholder="Name (e.g. Player registrations)"
                value={newAccount.name}
                onChange={(e) => setNewAccount((s) => ({ ...s, name: e.target.value }))}
              />
              <select
                className="select select-bordered w-full"
                value={newAccount.type}
                onChange={(e) => setNewAccount((s) => ({ ...s, type: e.target.value as Account["type"] }))}
              >
                {TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div className="mt-3">
              <button onClick={createAccount} className="btn bg-[#06054e] text-[#FFD700] hover:bg-[#0b0a66] border-none">
                Create account
              </button>
            </div>
          </div>

          {TYPES.map((t) => {
            const rows = groupedAccounts.get(t) ?? [];
            return (
              <div key={t} className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                  <div className="font-black text-slate-900">{t.toUpperCase()}</div>
                  <div className="text-xs text-slate-500">{rows.length} accounts</div>
                </div>
                {rows.length === 0 ? (
                  <div className="p-4 text-sm text-slate-600">No accounts yet.</div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {rows.map((a) => (
                      <div key={a.accountId} className="p-4 flex items-center gap-3">
                        <input
                          className="input input-bordered w-28"
                          value={a.code}
                          onChange={(e) => {
                            const next = e.target.value;
                            const prev = a.code;
                            setAccounts((xs) => xs.map((x) => (x.accountId === a.accountId ? { ...x, code: next } : x)));
                            void inlineEdit(
                              () => patchAccount(a.accountId, { code: next }),
                              () =>
                                setAccounts((xs) =>
                                  xs.map((x) => (x.accountId === a.accountId ? { ...x, code: prev } : x)),
                                ),
                            );
                          }}
                        />
                        <input
                          className="input input-bordered flex-1"
                          value={a.name}
                          onChange={(e) => {
                            const next = e.target.value;
                            const prev = a.name;
                            setAccounts((xs) => xs.map((x) => (x.accountId === a.accountId ? { ...x, name: next } : x)));
                            void inlineEdit(
                              () => patchAccount(a.accountId, { name: next }),
                              () =>
                                setAccounts((xs) =>
                                  xs.map((x) => (x.accountId === a.accountId ? { ...x, name: prev } : x)),
                                ),
                            );
                          }}
                        />
                        <select
                          className="select select-bordered w-36"
                          value={a.type}
                          onChange={(e) => {
                            const next = e.target.value as Account["type"];
                            const prev = a.type;
                            setAccounts((xs) => xs.map((x) => (x.accountId === a.accountId ? { ...x, type: next } : x)));
                            void inlineEdit(
                              () => patchAccount(a.accountId, { type: next }),
                              () =>
                                setAccounts((xs) =>
                                  xs.map((x) => (x.accountId === a.accountId ? { ...x, type: prev } : x)),
                                ),
                            );
                          }}
                        >
                          {TYPES.map((x) => (
                            <option key={x} value={x}>
                              {x}
                            </option>
                          ))}
                        </select>
                        <button
                          className="btn btn-sm btn-outline"
                          onClick={() => void deactivateAccount(a.accountId)}
                          disabled={!a.active}
                        >
                          {a.active ? "Deactivate" : "Inactive"}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-4">
            <div className="text-sm font-black text-slate-900 mb-3">Add cost centre</div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <input
                className="input input-bordered w-full"
                placeholder="Code (e.g. U12)"
                value={newCc.code}
                onChange={(e) => setNewCc((s) => ({ ...s, code: e.target.value }))}
              />
              <input
                className="input input-bordered w-full md:col-span-2"
                placeholder="Name (e.g. Under 12s programme)"
                value={newCc.name}
                onChange={(e) => setNewCc((s) => ({ ...s, name: e.target.value }))}
              />
            </div>
            <div className="mt-3">
              <button onClick={createCostCentre} className="btn bg-[#06054e] text-[#FFD700] hover:bg-[#0b0a66] border-none">
                Create cost centre
              </button>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
              <div className="font-black text-slate-900">Cost centres</div>
              <div className="text-xs text-slate-500">{costCentres.length} centres</div>
            </div>
            {costCentres.length === 0 ? (
              <div className="p-4 text-sm text-slate-600">No cost centres yet.</div>
            ) : (
              <div className="divide-y divide-slate-100">
                {costCentres.map((cc) => (
                  <div key={cc.costCentreId} className="p-4 flex items-center gap-3">
                    <input
                      className="input input-bordered w-28"
                      value={cc.code}
                      onChange={(e) => {
                        const next = e.target.value;
                        const prev = cc.code;
                        setCostCentres((xs) =>
                          xs.map((x) => (x.costCentreId === cc.costCentreId ? { ...x, code: next } : x)),
                        );
                        void inlineEdit(
                          () => patchCostCentre(cc.costCentreId, { code: next }),
                          () =>
                            setCostCentres((xs) =>
                              xs.map((x) => (x.costCentreId === cc.costCentreId ? { ...x, code: prev } : x)),
                            ),
                        );
                      }}
                    />
                    <input
                      className="input input-bordered flex-1"
                      value={cc.name}
                      onChange={(e) => {
                        const next = e.target.value;
                        const prev = cc.name;
                        setCostCentres((xs) =>
                          xs.map((x) => (x.costCentreId === cc.costCentreId ? { ...x, name: next } : x)),
                        );
                        void inlineEdit(
                          () => patchCostCentre(cc.costCentreId, { name: next }),
                          () =>
                            setCostCentres((xs) =>
                              xs.map((x) => (x.costCentreId === cc.costCentreId ? { ...x, name: prev } : x)),
                            ),
                        );
                      }}
                    />
                    <button
                      className="btn btn-sm btn-outline"
                      onClick={() => void deactivateCostCentre(cc.costCentreId)}
                      disabled={!cc.active}
                    >
                      {cc.active ? "Deactivate" : "Inactive"}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

