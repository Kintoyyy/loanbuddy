import { FormEvent, useEffect, useState } from "react";
import { Archive, Building2, Mail, Pencil, Phone, Plus, Users, X } from "lucide-react";
import { archiveDebtor, createDebtor, Debtor, DebtorRequest, getDebtors, updateDebtor } from "../api";
import AppSidebar from "../components/AppSidebar";

interface DebtorsProps {
  onGoHome: () => void;
  onGoLoans: () => void;
  onGoProfile: () => void;
  onGoEntries: () => void;
  onGoSettings: () => void;
  onGoLanding: () => void;
  onLogout: () => void;
}

interface DebtorFormState {
  debtor_name: string;
  debtor_type: "Person" | "Entity" | "Organization";
  phone_number: string;
  email: string;
}

const INITIAL_FORM: DebtorFormState = {
  debtor_name: "",
  debtor_type: "Person",
  phone_number: "",
  email: "",
};

const TYPE_COLORS: Record<string, string> = {
  Person: "bg-sky-100 text-sky-700",
  Entity: "bg-violet-100 text-violet-700",
  Organization: "bg-amber-100 text-amber-700",
};

const AVATAR_COLORS = [
  "bg-rose-100 text-rose-700",
  "bg-sky-100 text-sky-700",
  "bg-violet-100 text-violet-700",
  "bg-emerald-100 text-emerald-700",
  "bg-amber-100 text-amber-700",
  "bg-pink-100 text-pink-700",
  "bg-teal-100 text-teal-700",
];

function getAvatarColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function Debtors({ onGoHome, onGoLoans, onGoProfile, onGoEntries, onGoSettings, onGoLanding, onLogout }: DebtorsProps) {
  const [debtors, setDebtors] = useState<Debtor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingDebtor, setEditingDebtor] = useState<Debtor | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState<DebtorFormState>(INITIAL_FORM);
  const [showArchived, setShowArchived] = useState(false);

  useEffect(() => {
    let active = true;
    getDebtors()
      .then((result) => { if (active) setDebtors(result); })
      .catch((err) => { if (active) setError(err instanceof Error ? err.message : "Failed to load debtors"); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const openAdd = () => {
    setEditingDebtor(null);
    setForm(INITIAL_FORM);
    setError(null);
    setShowForm(true);
  };

  const openEdit = (debtor: Debtor) => {
    setEditingDebtor(debtor);
    setForm({
      debtor_name: debtor.debtor_name,
      debtor_type: debtor.debtor_type,
      phone_number: debtor.phone_number ?? "",
      email: debtor.email ?? "",
    });
    setError(null);
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingDebtor(null);
    setForm(INITIAL_FORM);
    setError(null);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!form.debtor_name.trim()) { setError("Debtor name is required"); return; }

    const payload: DebtorRequest = {
      debtor_name: form.debtor_name.trim(),
      debtor_type: form.debtor_type,
      phone_number: form.phone_number.trim() || undefined,
      email: form.email.trim() || undefined,
    };

    setSubmitting(true);
    setError(null);

    try {
      if (editingDebtor) {
        const updated = await updateDebtor(editingDebtor.debtor_id, payload);
        setDebtors((prev) => prev.map((d) => {
          if (d.debtor_id !== updated.debtor_id) return d;
          // Preserve server-computed fields the PUT endpoint doesn't return
          return { ...d, ...updated, total_owed: updated.total_owed ?? d.total_owed, open_entries_count: updated.open_entries_count ?? d.open_entries_count };
        }));
      } else {
        const created = await createDebtor(payload);
        setDebtors((prev) => [created, ...prev]);
      }
      closeForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save debtor");
    } finally {
      setSubmitting(false);
    }
  };

  const handleArchive = async (debtor: Debtor) => {
    if (!window.confirm(`Archive "${debtor.debtor_name}"? They will no longer appear in your active list.`)) return;
    try {
      await archiveDebtor(debtor.debtor_id);
      setDebtors((prev) => prev.map((d) =>
        d.debtor_id === debtor.debtor_id ? { ...d, is_archived: true } : d
      ));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to archive debtor");
    }
  };

  const activeDebtors = debtors.filter((d) => !d.is_archived);
  const archivedDebtors = debtors.filter((d) => d.is_archived);
  const visibleDebtors = showArchived ? archivedDebtors : activeDebtors;

  const totalOwed = activeDebtors.reduce((s, d) => s + (d.total_owed ?? 0), 0);
  const openEntries = activeDebtors.reduce((s, d) => s + (d.open_entries_count ?? 0), 0);

  return (
    <div className="min-h-screen bg-slate-50">
      <AppSidebar
        active="debtors"
        onGoHome={onGoHome}
        onGoLoans={onGoLoans}
        onGoDebtors={() => {}}
        onGoEntries={onGoEntries}
        onGoProfile={onGoProfile}
        onGoSettings={onGoSettings}
        onGoLanding={onGoLanding}
        onLogout={onLogout}
      />

      <main className="md:ml-64">
        {/* Header */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white/95 px-6 backdrop-blur">
          <div>
            <h1 className="text-lg font-semibold text-slate-900">Debtors</h1>
            <p className="text-sm text-slate-500">People and entities that owe you.</p>
          </div>
          <button
            onClick={openAdd}
            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            <Plus className="h-4 w-4" /> Add Debtor
          </button>
        </header>

        <div className="space-y-6 p-6">
          {error && (
            <div className="flex items-center justify-between rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              <span>{error}</span>
              <button onClick={() => setError(null)} className="ml-4 text-red-500 hover:text-red-700"><X className="h-4 w-4" /></button>
            </div>
          )}

          {/* Stats */}
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-slate-500">Active Debtors</p>
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-50">
                  <Users className="h-4 w-4 text-sky-600" />
                </span>
              </div>
              <p className="mt-2 text-2xl font-bold text-slate-900">{activeDebtors.length}</p>
              <p className="mt-1 text-xs text-slate-400">{archivedDebtors.length} archived</p>
            </div>
            <div className="rounded-2xl border border-rose-100 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-slate-500">Total Owed</p>
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-50">
                  <Building2 className="h-4 w-4 text-rose-500" />
                </span>
              </div>
              <p className="mt-2 text-2xl font-bold text-rose-600">{totalOwed.toLocaleString()}</p>
              <p className="mt-1 text-xs text-slate-400">across all active debtors</p>
            </div>
            <div className="rounded-2xl border border-amber-100 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-slate-500">Open Entries</p>
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50">
                  <Archive className="h-4 w-4 text-amber-600" />
                </span>
              </div>
              <p className="mt-2 text-2xl font-bold text-amber-700">{openEntries}</p>
              <p className="mt-1 text-xs text-slate-400">entries needing follow-up</p>
            </div>
          </div>

          {/* Add / Edit form */}
          {showForm && (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-base font-semibold text-slate-900">{editingDebtor ? "Edit Debtor" : "New Debtor"}</h2>
                <button onClick={closeForm} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Name *</label>
                  <input
                    value={form.debtor_name}
                    onChange={(e) => setForm((p) => ({ ...p, debtor_name: e.target.value }))}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
                    placeholder="e.g. Alex Reyes"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Type</label>
                  <select
                    value={form.debtor_type}
                    onChange={(e) => setForm((p) => ({ ...p, debtor_type: e.target.value as DebtorFormState["debtor_type"] }))}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
                  >
                    <option value="Person">Person</option>
                    <option value="Entity">Entity</option>
                    <option value="Organization">Organization</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Phone <span className="text-slate-400">(optional)</span></label>
                  <input
                    value={form.phone_number}
                    onChange={(e) => setForm((p) => ({ ...p, phone_number: e.target.value }))}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
                    placeholder="+63 900 000 0000"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Email <span className="text-slate-400">(optional)</span></label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
                    placeholder="email@example.com"
                  />
                </div>
                <div className="md:col-span-2 flex justify-end gap-3">
                  <button type="button" onClick={closeForm} className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                    Cancel
                  </button>
                  <button type="submit" disabled={submitting} className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 hover:bg-slate-800">
                    {submitting ? "Saving…" : editingDebtor ? "Update Debtor" : "Save Debtor"}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Filter toggle */}
          <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-sm w-fit">
            <button
              onClick={() => setShowArchived(false)}
              className={`rounded-lg px-4 py-1.5 text-sm font-medium transition ${!showArchived ? "bg-slate-900 text-white shadow-sm" : "text-slate-500 hover:text-slate-900"}`}
            >
              Active <span className={`ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${!showArchived ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"}`}>{activeDebtors.length}</span>
            </button>
            <button
              onClick={() => setShowArchived(true)}
              className={`rounded-lg px-4 py-1.5 text-sm font-medium transition ${showArchived ? "bg-slate-900 text-white shadow-sm" : "text-slate-500 hover:text-slate-900"}`}
            >
              Archived <span className={`ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${showArchived ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"}`}>{archivedDebtors.length}</span>
            </button>
          </div>

          {/* Debtor list */}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            {loading ? (
              <div className="px-6 py-12 text-center text-sm text-slate-400">Loading debtors…</div>
            ) : visibleDebtors.length === 0 ? (
              <div className="px-6 py-16 text-center">
                <Users className="mx-auto mb-3 h-10 w-10 text-slate-200" />
                <p className="text-sm font-medium text-slate-500">
                  {showArchived ? "No archived debtors." : "No active debtors yet."}
                </p>
                {!showArchived && <p className="mt-1 text-xs text-slate-400">Click "Add Debtor" to get started.</p>}
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {visibleDebtors.map((debtor) => {
                  const parts = debtor.debtor_name.split(" ");
                  const avatarInitials = ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "?";
                  const avatarColor = getAvatarColor(debtor.debtor_name);
                  const maxOwed = Math.max(1, ...activeDebtors.map((d) => d.total_owed ?? 0));
                  const owedPct = maxOwed > 0 ? Math.round(((debtor.total_owed ?? 0) / maxOwed) * 100) : 0;

                  return (
                    <div key={debtor.debtor_id} className="flex items-start gap-4 px-5 py-4 hover:bg-slate-50/60 transition">
                      {/* Avatar */}
                      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${avatarColor}`}>
                        {avatarInitials}
                      </div>

                      {/* Info */}
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-semibold text-slate-900">{debtor.debtor_name}</p>
                          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${TYPE_COLORS[debtor.debtor_type] ?? "bg-slate-100 text-slate-600"}`}>
                            {debtor.debtor_type}
                          </span>
                          {debtor.is_archived && (
                            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">Archived</span>
                          )}
                        </div>

                        {/* Contact info */}
                        <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-slate-500">
                          {debtor.phone_number && (
                            <span className="inline-flex items-center gap-1">
                              <Phone className="h-3 w-3" />{debtor.phone_number}
                            </span>
                          )}
                          {debtor.email && (
                            <span className="inline-flex items-center gap-1">
                              <Mail className="h-3 w-3" />{debtor.email}
                            </span>
                          )}
                          {!debtor.phone_number && !debtor.email && (
                            <span className="text-slate-300">No contact info</span>
                          )}
                        </div>

                        {/* Owed + open entries */}
                        <div className="mt-2 flex items-center gap-3">
                          <div className="h-1.5 w-24 overflow-hidden rounded-full bg-slate-200">
                            <div className="h-full rounded-full bg-rose-400" style={{ width: `${owedPct}%` }} />
                          </div>
                          <span className="text-xs text-slate-500">
                            <span className="font-semibold text-slate-800">{(debtor.total_owed ?? 0).toLocaleString()}</span> owed
                            {(debtor.open_entries_count ?? 0) > 0 && (
                              <span className="ml-2 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">
                                {debtor.open_entries_count} open
                              </span>
                            )}
                          </span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex shrink-0 items-center gap-1">
                        {!debtor.is_archived && (
                          <button
                            onClick={() => openEdit(debtor)}
                            title="Edit"
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                        )}
                        {!debtor.is_archived && (
                          <button
                            onClick={() => handleArchive(debtor)}
                            title="Archive"
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-amber-600 transition"
                          >
                            <Archive className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export default Debtors;
