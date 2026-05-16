import { FormEvent, useEffect, useState } from "react";
import {
  Archive,
  ChevronDown,
  ChevronUp,
  Eye,
  FileText,
  Paperclip,
  Pencil,
  Plus,
  Receipt,
  TrendingUp,
  X,
} from "lucide-react";
import {
  addEntryPenalty,
  archiveCollection,
  archiveEntry,
  createCollection,
  createEntry,
  getCollectionProof,
  getDebtors,
  getEntries,
  getEntryCollections,
  getProfile,
  updateEntry,
  uploadCollectionProof,
  uploadEntryProof,
  type Debtor,
  type Entry,
  type EntryCollection,
  type EntryPenalty,
  type EntryRequest,
} from "../api";
import AppSidebar from "../components/AppSidebar";
import AgreementModal from "../components/AgreementModal";
import EntryDetailModal from "../components/EntryDetailModal";
import ProofViewerModal from "../components/ProofViewerModal";

interface EntriesProps {
  onGoHome: () => void;
  onGoLoans: () => void;
  onGoProfile: () => void;
  onGoDebtors: () => void;
  onGoSettings: () => void;
  onGoLanding: () => void;
  onLogout: () => void;
}

type PaymentMethod = "Cash" | "Bank Transfer" | "GCash" | "PayMaya" | "Check" | "Online Transfer" | "Card" | "Other";

interface CollectionFormState {
  amount_collected: string;
  collection_date: string;
  payment_method: PaymentMethod;
  notes: string;
}

interface EntryFormState {
  debtor_id: string;
  original_amount: string;
  currency: string;
  lending_date: string;
  expected_payback_date: string;
  notes: string;
  penalty_rate: string;
}

const TODAY = new Date().toISOString().split("T")[0];

const INITIAL_FORM: EntryFormState = {
  debtor_id: "",
  original_amount: "",
  currency: "PHP",
  lending_date: TODAY,
  expected_payback_date: "",
  notes: "",
  penalty_rate: "",
};

const INITIAL_COLLECTION_FORM: CollectionFormState = {
  amount_collected: "",
  collection_date: TODAY,
  payment_method: "Cash",
  notes: "",
};

const STATUS_COLORS: Record<string, string> = {
  Open: "bg-slate-100 text-slate-600",
  "Partially Collected": "bg-amber-100 text-amber-700",
  Closed: "bg-emerald-100 text-emerald-700",
};

const STATUS_DOT: Record<string, string> = {
  Open: "bg-slate-400",
  "Partially Collected": "bg-amber-400",
  Closed: "bg-emerald-500",
};

function Entries({ onGoHome, onGoLoans, onGoProfile, onGoDebtors, onGoSettings, onGoLanding, onLogout }: EntriesProps) {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [debtors, setDebtors] = useState<Debtor[]>([]);
  const [collectionsByEntry, setCollectionsByEntry] = useState<Record<string, EntryCollection[]>>({});
  const [expandedEntryId, setExpandedEntryId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Create form
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState<EntryFormState>(INITIAL_FORM);
  const [formError, setFormError] = useState<string | null>(null);

  // Edit form
  const [editingEntry, setEditingEntry] = useState<Entry | null>(null);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editForm, setEditForm] = useState<EntryFormState>(INITIAL_FORM);
  const [editFormError, setEditFormError] = useState<string | null>(null);

  // Collection form
  const [collectionSubmitting, setCollectionSubmitting] = useState(false);
  const [collectionForm, setCollectionForm] = useState<CollectionFormState>(INITIAL_COLLECTION_FORM);
  const [collectionProofFile, setCollectionProofFile] = useState<File | null>(null);
  const [proofViewerBlob, setProofViewerBlob] = useState<Blob | null>(null);

  // Filter
  const [statusFilter, setStatusFilter] = useState<"all" | "Open" | "Partially Collected" | "Closed">("all");

  const [lenderName, setLenderName] = useState("Lender");
  const [agreementEntry, setAgreementEntry] = useState<Entry | null>(null);
  const [detailEntry, setDetailEntry] = useState<Entry | null>(null);

  useEffect(() => {
    getProfile().then((p) => setLenderName(`${p.first_name} ${p.last_name}`.trim() || p.email)).catch(() => {});
  }, []);

  useEffect(() => {
    let active = true;
    Promise.all([getEntries(), getDebtors()])
      .then(([entryResult, debtorResult]) => {
        if (!active) return;
        setEntries(entryResult);
        setDebtors(debtorResult.filter((d) => !d.is_archived));
      })
      .catch((err) => { if (!active) return; setError(err instanceof Error ? err.message : "Failed to load entries"); })
      .finally(() => { if (!active) return; setLoading(false); });
    return () => { active = false; };
  }, []);

  // ── Create ────────────────────────────────────────────────────────────────

  const handleCreate = async (event: FormEvent) => {
    event.preventDefault();
    const amount = Number(form.original_amount);
    if (!form.debtor_id) { setFormError("Please select a debtor"); return; }
    if (!Number.isFinite(amount) || amount <= 0) { setFormError("Amount must be greater than zero"); return; }

    const payload: EntryRequest = {
      debtor_id: form.debtor_id,
      original_amount: amount,
      currency: form.currency,
      lending_date: form.lending_date,
      expected_payback_date: form.expected_payback_date || undefined,
      notes: form.notes.trim() || undefined,
      penaltyRate: form.penalty_rate ? Number(form.penalty_rate) : undefined,
    };

    setSubmitting(true);
    setFormError(null);
    try {
      const created = await createEntry(payload);
      setEntries((prev) => [created, ...prev]);
      setForm(INITIAL_FORM);
      setShowForm(false);
      setAgreementEntry(created);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to create entry");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Edit ──────────────────────────────────────────────────────────────────

  const openEdit = (entry: Entry) => {
    setEditingEntry(entry);
    setEditForm({
      debtor_id: entry.debtor_id,
      original_amount: String(entry.original_amount),
      currency: entry.currency,
      lending_date: entry.lending_date,
      expected_payback_date: entry.expected_payback_date ?? "",
      notes: entry.notes ?? "",
      penalty_rate: entry.penalty_rate ? String(entry.penalty_rate) : "",
    });
    setEditFormError(null);
  };

  const closeEdit = () => {
    setEditingEntry(null);
    setEditForm(INITIAL_FORM);
    setEditFormError(null);
  };

  const handleUpdate = async (event: FormEvent) => {
    event.preventDefault();
    if (!editingEntry) return;
    const amount = Number(editForm.original_amount);
    if (!editForm.debtor_id) { setEditFormError("Please select a debtor"); return; }
    if (!Number.isFinite(amount) || amount <= 0) { setEditFormError("Amount must be greater than zero"); return; }

    const payload: EntryRequest = {
      debtor_id: editForm.debtor_id,
      original_amount: amount,
      currency: editForm.currency,
      lending_date: editForm.lending_date,
      expected_payback_date: editForm.expected_payback_date || undefined,
      notes: editForm.notes.trim() || undefined,
      penaltyRate: editForm.penalty_rate ? Number(editForm.penalty_rate) : undefined,
    };

    setEditSubmitting(true);
    setEditFormError(null);
    try {
      const updated = await updateEntry(editingEntry.entry_id, payload);
      setEntries((prev) => prev.map((e) => e.entry_id === updated.entry_id ? { ...e, ...updated } : e));
      closeEdit();
    } catch (err) {
      setEditFormError(err instanceof Error ? err.message : "Failed to update entry");
    } finally {
      setEditSubmitting(false);
    }
  };

  // ── Archive ───────────────────────────────────────────────────────────────

  const handleArchive = async (entry: Entry) => {
    if (!window.confirm(`Archive entry for "${entry.debtor_name}"? It will be removed from your active list.`)) return;
    try {
      await archiveEntry(entry.entry_id);
      setEntries((prev) => prev.filter((e) => e.entry_id !== entry.entry_id));
      if (expandedEntryId === entry.entry_id) setExpandedEntryId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to archive entry");
    }
  };

  // ── Collections ───────────────────────────────────────────────────────────

  const activeEntries = entries.filter((e) => !e.is_archived);
  const totalOutstanding = activeEntries.reduce((s, e) => s + (e.still_owed ?? e.original_amount), 0);
  const totalCollected = activeEntries.reduce((s, e) => s + (e.total_collected ?? 0), 0);
  const openCount = activeEntries.filter((e) => e.entry_status === "Open").length;
  const partialCount = activeEntries.filter((e) => e.entry_status === "Partially Collected").length;
  const closedCount = activeEntries.filter((e) => e.entry_status === "Closed").length;

  const visibleEntries = activeEntries.filter((e) => {
    if (statusFilter === "all") return true;
    return e.entry_status === statusFilter;
  });

  const fmtAmount = (n: number) => n.toLocaleString(undefined, { maximumFractionDigits: 2 });

  const fmtDate = (d: string | null | undefined) => {
    if (!d) return "—";
    return new Date(d).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  };

  const toggleEntryDetails = async (entryId: string) => {
    if (expandedEntryId === entryId) { setExpandedEntryId(null); return; }
    setExpandedEntryId(entryId);
    if (!collectionsByEntry[entryId]) {
      try {
        const collections = await getEntryCollections(entryId);
        setCollectionsByEntry((prev) => ({ ...prev, [entryId]: collections }));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load collections");
      }
    }
  };


  const refreshEntries = async () => {
    const latest = await getEntries();
    setEntries(latest);
  };

  const handleAddCollection = async (entryId: string) => {
    const amount = Number(collectionForm.amount_collected);
    if (!Number.isFinite(amount) || amount <= 0) { setError("Collection amount must be greater than zero"); return; }
    if (!collectionProofFile) { setError("Proof of payment (receipt / photo) is required"); return; }

    setCollectionSubmitting(true);
    setError(null);
    try {
      const created = await createCollection(entryId, {
        amount_collected: amount,
        collection_date: collectionForm.collection_date,
        payment_method: collectionForm.payment_method,
        notes: collectionForm.notes.trim() || undefined,
      });
      await uploadCollectionProof(entryId, created.collection_id, collectionProofFile);
      const updatedCollections = await getEntryCollections(entryId);
      setCollectionsByEntry((prev) => ({ ...prev, [entryId]: updatedCollections }));
      setCollectionForm({ ...INITIAL_COLLECTION_FORM, collection_date: new Date().toISOString().split("T")[0] });
      setCollectionProofFile(null);
      await refreshEntries();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add collection");
    } finally {
      setCollectionSubmitting(false);
    }
  };

  const handleArchiveCollection = async (entryId: string, collectionId: string) => {
    const reason = window.prompt("Reason for archiving this collection (optional):");
    if (reason === null) return;
    try {
      await archiveCollection(collectionId, reason || undefined);
      setCollectionsByEntry((prev) => ({
        ...prev,
        [entryId]: (prev[entryId] ?? []).map((c) =>
          c.collection_id === collectionId ? { ...c, is_archived: true, archive_reason: reason || null } : c
        ),
      }));
      await refreshEntries();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to archive collection");
    }
  };

  const handleViewCollectionProof = async (entryId: string, collectionId: string) => {
    try {
      const blob = await getCollectionProof(entryId, collectionId);
      if (!blob) { setError("No proof found for this collection"); return; }
      setProofViewerBlob(blob);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load proof");
    }
  };

  // ── Shared form fields ────────────────────────────────────────────────────

  const EntryFormFields = ({
    f,
    setF,
    err,
  }: {
    f: EntryFormState;
    setF: (updater: (prev: EntryFormState) => EntryFormState) => void;
    err: string | null;
  }) => (
    <>
      {err && (
        <p className="mb-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{err}</p>
      )}
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Debtor *</label>
          <select
            value={f.debtor_id}
            onChange={(e) => setF((p) => ({ ...p, debtor_id: e.target.value }))}
            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
          >
            <option value="">Select debtor…</option>
            {debtors.map((d) => (
              <option key={d.debtor_id} value={d.debtor_id}>{d.debtor_name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Amount *</label>
          <div className="flex gap-2">
            <select
              value={f.currency}
              onChange={(e) => setF((p) => ({ ...p, currency: e.target.value }))}
              className="w-20 rounded-xl border border-slate-300 px-2 py-2 text-sm focus:border-slate-500 focus:outline-none"
            >
              <option>PHP</option>
              <option>USD</option>
              <option>EUR</option>
            </select>
            <input
              type="number"
              min="0.01"
              step="0.01"
              value={f.original_amount}
              onChange={(e) => setF((p) => ({ ...p, original_amount: e.target.value }))}
              placeholder="0.00"
              className="flex-1 rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
            />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Lending Date *</label>
          <input
            type="date"
            value={f.lending_date}
            onChange={(e) => setF((p) => ({ ...p, lending_date: e.target.value }))}
            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Expected Payback <span className="text-slate-400">(optional)</span></label>
          <input
            type="date"
            value={f.expected_payback_date}
            onChange={(e) => setF((p) => ({ ...p, expected_payback_date: e.target.value }))}
            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Overdue Penalty Rate <span className="text-slate-400">(% per month, optional)</span></label>
          <input
            type="number"
            min="0"
            max="100"
            step="0.01"
            value={f.penalty_rate}
            onChange={(e) => setF((p) => ({ ...p, penalty_rate: e.target.value }))}
            placeholder="e.g. 2"
            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
          />
        </div>
        <div className="md:col-span-2">
          <label className="mb-1 block text-sm font-medium text-slate-700">Notes <span className="text-slate-400">(optional)</span></label>
          <input
            value={f.notes}
            onChange={(e) => setF((p) => ({ ...p, notes: e.target.value }))}
            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
            placeholder="Purpose of the loan, terms, etc."
          />
        </div>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-slate-50">
      <AppSidebar
        active="entries"
        onGoHome={onGoHome}
        onGoLoans={onGoLoans}
        onGoDebtors={onGoDebtors}
        onGoEntries={() => {}}
        onGoProfile={onGoProfile}
        onGoSettings={onGoSettings}
        onGoLanding={onGoLanding}
        onLogout={onLogout}
      />

      <main className="md:ml-64">
        {/* Header */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white/95 px-6 backdrop-blur">
          <div>
            <h1 className="text-lg font-semibold text-slate-900">Entries</h1>
            <p className="text-sm text-slate-500">Track loan records and collect repayments per debtor.</p>
          </div>
          <button
            onClick={() => { setShowForm((v) => !v); setFormError(null); }}
            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            <Plus className="h-4 w-4" /> Add Entry
          </button>
        </header>

        <div className="space-y-6 p-6">
          {error && (
            <div className="flex items-center justify-between rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              <span>{error}</span>
              <button onClick={() => setError(null)} className="ml-4 text-red-500 hover:text-red-700"><X className="h-4 w-4" /></button>
            </div>
          )}

          {/* Summary */}
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border border-rose-100 bg-white p-5 shadow-sm">
              <p className="text-sm font-medium text-slate-500">Outstanding</p>
              <p className="mt-2 text-2xl font-bold text-rose-600">{fmtAmount(totalOutstanding)}</p>
              <p className="mt-1 text-xs text-slate-400">still owed across all entries</p>
            </div>
            <div className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-slate-500">Collected</p>
                <TrendingUp className="h-4 w-4 text-emerald-500" />
              </div>
              <p className="mt-2 text-2xl font-bold text-emerald-600">{fmtAmount(totalCollected)}</p>
              <p className="mt-1 text-xs text-slate-400">total recovered</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm font-medium text-slate-500">Entry Breakdown</p>
              <div className="mt-2 flex gap-2">
                <div className="flex-1 rounded-lg bg-slate-50 px-2 py-1.5 text-center">
                  <p className="text-lg font-bold text-slate-900">{openCount}</p>
                  <p className="text-[10px] text-slate-500">Open</p>
                </div>
                <div className="flex-1 rounded-lg bg-amber-50 px-2 py-1.5 text-center">
                  <p className="text-lg font-bold text-amber-700">{partialCount}</p>
                  <p className="text-[10px] text-amber-600">Partial</p>
                </div>
                <div className="flex-1 rounded-lg bg-emerald-50 px-2 py-1.5 text-center">
                  <p className="text-lg font-bold text-emerald-700">{closedCount}</p>
                  <p className="text-[10px] text-emerald-600">Closed</p>
                </div>
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm font-medium text-slate-500">Total Entries</p>
              <p className="mt-2 text-2xl font-bold text-slate-900">{activeEntries.length}</p>
              <p className="mt-1 text-xs text-slate-400">active (non-archived)</p>
            </div>
          </div>

          {/* Create form */}
          {showForm && (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm max-w-2xl">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-base font-semibold text-slate-900">New Entry</h2>
                <button onClick={() => { setShowForm(false); setForm(INITIAL_FORM); setFormError(null); }} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <form onSubmit={handleCreate}>
                <EntryFormFields f={form} setF={setForm} err={formError} />
                <div className="mt-4 flex justify-end gap-3">
                  <button type="button" onClick={() => { setShowForm(false); setForm(INITIAL_FORM); setFormError(null); }} className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                    Cancel
                  </button>
                  <button type="submit" disabled={submitting} className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 hover:bg-slate-800">
                    {submitting ? "Saving…" : "Save Entry"}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Status filter */}
          <div className="flex flex-wrap items-center gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-sm w-fit">
            {(["all", "Open", "Partially Collected", "Closed"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${statusFilter === s ? "bg-slate-900 text-white shadow-sm" : "text-slate-500 hover:text-slate-900"}`}
              >
                {s === "all" ? "All" : s}
                {s !== "all" && (
                  <span className={`ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${statusFilter === s ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"}`}>
                    {activeEntries.filter((e) => e.entry_status === s).length}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Entries list */}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            {loading ? (
              <div className="px-6 py-12 text-center text-sm text-slate-400">Loading entries…</div>
            ) : visibleEntries.length === 0 ? (
              <div className="px-6 py-16 text-center">
                <FileText className="mx-auto mb-3 h-10 w-10 text-slate-200" />
                <p className="text-sm font-medium text-slate-500">
                  {statusFilter === "all" ? "No entries yet." : `No ${statusFilter} entries.`}
                </p>
                {statusFilter === "all" && <p className="mt-1 text-xs text-slate-400">Click "Add Entry" to get started.</p>}
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {visibleEntries.map((entry) => {
                  const isExpanded = expandedEntryId === entry.entry_id;
                  const isEditing = editingEntry?.entry_id === entry.entry_id;
                  const collections = collectionsByEntry[entry.entry_id] ?? [];
                  const stillOwed = entry.still_owed ?? entry.original_amount;
                  const collected = entry.total_collected ?? 0;
                  const collectedPct = entry.original_amount > 0
                    ? Math.round((collected / entry.original_amount) * 100)
                    : 0;
                  const isOverdue = entry.entry_status !== "Closed"
                    && entry.expected_payback_date != null
                    && new Date(entry.expected_payback_date) < new Date();

                  return (
                    <div key={entry.entry_id}>
                      {/* Row */}
                      <div className={`px-5 py-4 transition ${isExpanded || isEditing ? "bg-slate-50" : "hover:bg-slate-50/60"}`}>
                        <div className="flex items-start gap-4">
                          {/* Avatar with status dot */}
                          <div className="relative mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-semibold text-slate-600">
                            {entry.debtor_name.charAt(0).toUpperCase()}
                            <span className={`absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full border-2 border-white ${STATUS_DOT[entry.entry_status] ?? "bg-slate-400"}`} />
                          </div>

                          {/* Info */}
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="font-semibold text-slate-900">{entry.debtor_name}</p>
                              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[entry.entry_status] ?? "bg-slate-100 text-slate-600"}`}>
                                {entry.entry_status}
                              </span>
                              {isOverdue && (
                                <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-600">Overdue</span>
                              )}
                              <span className="text-xs text-slate-400">{entry.currency}</span>
                            </div>
                            <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-slate-500">
                              <span>Lent {fmtDate(entry.lending_date)}</span>
                              {entry.expected_payback_date && (
                                <span className={isOverdue ? "font-medium text-red-500" : ""}>
                                  Due {fmtDate(entry.expected_payback_date)}
                                </span>
                              )}
                              {entry.notes && <span className="italic text-slate-400">"{entry.notes}"</span>}
                            </div>
                            <div className="mt-2 flex items-center gap-2">
                              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-200">
                                <div
                                  className={`h-full rounded-full transition-all ${entry.entry_status === "Closed" ? "bg-emerald-500" : "bg-sky-400"}`}
                                  style={{ width: `${collectedPct}%` }}
                                />
                              </div>
                              <span className="shrink-0 text-xs text-slate-400">{collectedPct}% collected</span>
                            </div>
                          </div>

                          {/* Amount + actions */}
                          <div className="flex shrink-0 items-start gap-2">
                            <div className="text-right">
                              <p className="text-base font-bold text-slate-900">{fmtAmount(entry.original_amount)}</p>
                              <p className={`text-sm font-semibold ${stillOwed <= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                                {stillOwed <= 0 ? "Paid" : `${fmtAmount(stillOwed)} owed`}
                              </p>
                            </div>
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => setDetailEntry(entry)}
                                title="View full details"
                                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-indigo-600 transition"
                              >
                                <Eye className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => toggleEntryDetails(entry.entry_id)}
                                className={`rounded-lg p-1.5 transition ${isExpanded ? "bg-slate-200 text-slate-700" : "text-slate-400 hover:bg-slate-100 hover:text-slate-700"}`}
                                title="View collections"
                              >
                                <Receipt className="h-4 w-4" />
                                {isExpanded ? <ChevronUp className="h-3 w-3 inline ml-0.5" /> : <ChevronDown className="h-3 w-3 inline ml-0.5" />}
                              </button>
                              <button
                                onClick={() => isEditing ? closeEdit() : openEdit(entry)}
                                title={isEditing ? "Cancel edit" : "Edit"}
                                className={`rounded-lg p-1.5 transition ${isEditing ? "bg-slate-200 text-slate-700" : "text-slate-400 hover:bg-slate-100 hover:text-slate-700"}`}
                              >
                                <Pencil className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleArchive(entry)}
                                title="Archive"
                                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-amber-600 transition"
                              >
                                <Archive className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Inline edit form */}
                      {isEditing && (
                        <div className="border-t border-slate-100 bg-slate-50 px-5 py-4">
                          <form onSubmit={handleUpdate} className="max-w-2xl">
                            <p className="mb-3 text-sm font-semibold text-slate-700">Edit Entry</p>
                            <EntryFormFields f={editForm} setF={setEditForm} err={editFormError} />
                            <div className="mt-4 flex justify-end gap-3">
                              <button type="button" onClick={closeEdit} className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                                Cancel
                              </button>
                              <button type="submit" disabled={editSubmitting} className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 hover:bg-slate-800">
                                {editSubmitting ? "Saving…" : "Update Entry"}
                              </button>
                            </div>
                          </form>
                        </div>
                      )}

                      {/* Expanded collection panel */}
                      {isExpanded && (
                        <div className="border-t border-slate-100 bg-slate-50 px-6 py-5">
                          <div className="max-w-2xl space-y-4">
                          <div className="flex items-center justify-between">
                              <p className="text-sm font-semibold text-slate-700">Collection History</p>
                              <p className="text-xs text-slate-500">
                                {fmtAmount(collected)} collected · {fmtAmount(stillOwed)} remaining
                              </p>
                            </div>

                            {collections.length === 0 ? (
                              <p className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-400">
                                No collections recorded yet.
                              </p>
                            ) : (
                              <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                                <table className="w-full text-sm">
                                  <thead>
                                    <tr className="border-b border-slate-100 bg-slate-50 text-left text-xs font-medium uppercase tracking-wider text-slate-400">
                                      <th className="px-4 py-2.5">Date</th>
                                      <th className="px-4 py-2.5">Amount</th>
                                      <th className="px-4 py-2.5">Method</th>
                                      <th className="px-4 py-2.5">Notes</th>
                                      <th className="px-4 py-2.5 text-center">Proof</th>
                                      <th className="px-4 py-2.5"></th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100">
                                    {collections.map((c) => (
                                      <tr key={c.collection_id} className={c.is_archived ? "opacity-40" : ""}>
                                        <td className="px-4 py-2.5 text-slate-600">{fmtDate(c.collection_date)}</td>
                                        <td className={`px-4 py-2.5 font-semibold text-emerald-700 ${c.is_archived ? "line-through" : ""}`}>{fmtAmount(c.amount_collected)}</td>
                                        <td className="px-4 py-2.5">
                                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">{c.payment_method}</span>
                                        </td>
                                        <td className="px-4 py-2.5 text-slate-500">{c.notes || <span className="text-slate-300">—</span>}</td>
                                        <td className="px-4 py-2.5 text-center">
                                          {c.proof_filename ? (
                                            <button
                                              onClick={() => handleViewCollectionProof(entry.entry_id, c.collection_id)}
                                              className="rounded-lg p-1 text-sky-500 hover:bg-sky-50"
                                              title="View proof"
                                            >
                                              <Paperclip className="h-3.5 w-3.5" />
                                            </button>
                                          ) : (
                                            <span className="text-slate-300">—</span>
                                          )}
                                        </td>
                                        <td className="px-4 py-2.5 text-right">
                                          {c.is_archived ? (
                                            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-600">Archived</span>
                                          ) : (
                                            <button
                                              onClick={() => handleArchiveCollection(entry.entry_id, c.collection_id)}
                                              className="rounded-lg p-1 text-slate-300 hover:bg-slate-100 hover:text-amber-600"
                                              title="Archive"
                                            >
                                              <Archive className="h-3.5 w-3.5" />
                                            </button>
                                          )}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            )}

                            {/* Add collection */}
                            {entry.entry_status !== "Closed" && (
                              <div className="rounded-xl border border-slate-200 bg-white p-4">
                                <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
                                  Log a Collection <span className="normal-case font-normal text-slate-500">({fmtAmount(stillOwed)} {entry.currency} remaining)</span>
                                </p>
                                <div className="grid gap-3 sm:grid-cols-3">
                                  <div>
                                    <label className="mb-1 block text-xs font-medium text-slate-600">Amount *</label>
                                    <input
                                      type="number"
                                      min="0.01"
                                      step="0.01"
                                      value={collectionForm.amount_collected}
                                      onChange={(e) => setCollectionForm((p) => ({ ...p, amount_collected: e.target.value }))}
                                      placeholder="0.00"
                                      className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
                                    />
                                  </div>
                                  <div>
                                    <label className="mb-1 block text-xs font-medium text-slate-600">Date *</label>
                                    <input
                                      type="date"
                                      value={collectionForm.collection_date}
                                      onChange={(e) => setCollectionForm((p) => ({ ...p, collection_date: e.target.value }))}
                                      className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
                                    />
                                  </div>
                                  <div>
                                    <label className="mb-1 block text-xs font-medium text-slate-600">Method</label>
                                    <select
                                      value={collectionForm.payment_method}
                                      onChange={(e) => setCollectionForm((p) => ({ ...p, payment_method: e.target.value as PaymentMethod }))}
                                      className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
                                    >
                                      <option>Cash</option>
                                      <option>Bank Transfer</option>
                                      <option>GCash</option>
                                      <option>PayMaya</option>
                                      <option>Check</option>
                                      <option>Online Transfer</option>
                                      <option>Card</option>
                                      <option>Other</option>
                                    </select>
                                  </div>
                                </div>
                                <div className="mt-3">
                                  <input
                                    type="text"
                                    value={collectionForm.notes}
                                    onChange={(e) => setCollectionForm((p) => ({ ...p, notes: e.target.value }))}
                                    placeholder="Notes (optional)"
                                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
                                  />
                                </div>
                                <div className="mt-3 flex items-center gap-2">
                                  <label className="flex flex-1 cursor-pointer items-center gap-2 rounded-xl border border-dashed border-slate-300 px-3 py-2 text-sm text-slate-500 hover:bg-slate-50">
                                    <Paperclip className="h-4 w-4 shrink-0" />
                                    <span className="truncate">{collectionProofFile ? collectionProofFile.name : <span>Attach proof of payment <span className="text-red-500">*</span></span>}</span>
                                    <input
                                      type="file"
                                      accept="image/*,application/pdf"
                                      className="hidden"
                                      onChange={(e) => setCollectionProofFile(e.target.files?.[0] ?? null)}
                                    />
                                  </label>
                                  <button
                                    onClick={() => handleAddCollection(entry.entry_id)}
                                    disabled={collectionSubmitting || !collectionProofFile}
                                    className="rounded-xl bg-slate-900 px-5 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
                                  >
                                    {collectionSubmitting ? "…" : "Add"}
                                  </button>
                                </div>
                              </div>
                            )}

                            {entry.entry_status === "Closed" && (
                              <p className="flex items-center gap-2 text-sm font-medium text-emerald-600">
                                <TrendingUp className="h-4 w-4" /> Fully collected — entry is closed.
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </main>

      {agreementEntry && (
        <AgreementModal
          lenderName={lenderName}
          borrowerName={agreementEntry.debtor_name}
          amount={Number(agreementEntry.original_amount)}
          currency={agreementEntry.currency}
          dateLent={agreementEntry.lending_date}
          dueDate={agreementEntry.expected_payback_date}
          description={agreementEntry.notes}
          onClose={() => setAgreementEntry(null)}
          onSign={async (file) => {
            await uploadEntryProof(agreementEntry.entry_id, file);
            setAgreementEntry(null);
          }}
        />
      )}

      {detailEntry && (
        <EntryDetailModal
          entry={detailEntry}
          lenderName={lenderName}
          onClose={() => setDetailEntry(null)}
          onPenaltyAdded={(penalty: EntryPenalty) => {
            setEntries((prev) =>
              prev.map((e) =>
                e.entry_id === detailEntry.entry_id
                  ? {
                      ...e,
                      entry_penalties: [...(e.entry_penalties ?? []), penalty],
                      total_penalties: (e.total_penalties ?? 0) + penalty.amount,
                    }
                  : e
              )
            );
          }}
        />
      )}

      {proofViewerBlob && (
        <ProofViewerModal blob={proofViewerBlob} onClose={() => setProofViewerBlob(null)} />
      )}
    </div>
  );
}

export default Entries;
