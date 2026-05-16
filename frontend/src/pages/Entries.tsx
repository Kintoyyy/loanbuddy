import { FormEvent, useEffect, useState } from "react";
import { ChevronDown, ChevronUp, Plus, Receipt, Trash2 } from "lucide-react";
import {
  createCollection,
  createEntry,
  Debtor,
  deleteCollection,
  Entry,
  EntryCollection,
  EntryRequest,
  getDebtors,
  getEntries,
  getEntryCollections,
} from "../api";
import AppSidebar from "../components/AppSidebar";

interface EntriesProps {
  onGoHome: () => void;
  onGoLoans: () => void;
  onGoProfile: () => void;
  onGoDebtors: () => void;
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

const INITIAL_FORM = {
  debtor_id: "",
  original_amount: "",
  currency: "PHP",
  lending_date: new Date().toISOString().split("T")[0],
  expected_payback_date: "",
  notes: "",
};

function Entries({ onGoHome, onGoLoans, onGoProfile, onGoDebtors, onGoLanding, onLogout }: EntriesProps) {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [debtors, setDebtors] = useState<Debtor[]>([]);
  const [collectionsByEntry, setCollectionsByEntry] = useState<Record<string, EntryCollection[]>>({});
  const [expandedEntryId, setExpandedEntryId] = useState<string | null>(null);
  const [collectionSubmitting, setCollectionSubmitting] = useState(false);
  const [collectionForm, setCollectionForm] = useState<CollectionFormState>({
    amount_collected: "",
    collection_date: new Date().toISOString().split("T")[0],
    payment_method: "Cash",
    notes: "",
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState(INITIAL_FORM);

  useEffect(() => {
    let active = true;

    Promise.all([getEntries(), getDebtors()])
      .then(([entryResult, debtorResult]) => {
        if (!active) return;
        setEntries(entryResult);
        setDebtors(debtorResult.filter((item) => !item.is_archived));
      })
      .catch((err) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Failed to load entries");
      })
      .finally(() => {
        if (!active) return;
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const handleCreate = async (event: FormEvent) => {
    event.preventDefault();

    const amount = Number(form.original_amount);
    if (!form.debtor_id) {
      setError("Please select a debtor");
      return;
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      setError("Amount must be greater than zero");
      return;
    }

    const payload: EntryRequest = {
      debtor_id: form.debtor_id,
      original_amount: amount,
      currency: form.currency,
      lending_date: form.lending_date,
      expected_payback_date: form.expected_payback_date || undefined,
      notes: form.notes.trim() || undefined,
    };

    setSubmitting(true);
    setError(null);

    try {
      const created = await createEntry(payload);
      setEntries((prev) => [created, ...prev]);
      setForm(INITIAL_FORM);
      setShowForm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create entry");
    } finally {
      setSubmitting(false);
    }
  };

  const totalOutstanding = entries.reduce((sum, entry) => sum + (entry.still_owed ?? entry.original_amount), 0);

  const formatAmount = (amount: number) => amount.toLocaleString(undefined, { maximumFractionDigits: 2 });

  const toggleEntryDetails = async (entryId: string) => {
    if (expandedEntryId === entryId) {
      setExpandedEntryId(null);
      return;
    }

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
    const latestEntries = await getEntries();
    setEntries(latestEntries);
  };

  const handleAddCollection = async (entryId: string) => {
    const amount = Number(collectionForm.amount_collected);
    if (!Number.isFinite(amount) || amount <= 0) {
      setError("Collection amount must be greater than zero");
      return;
    }

    setCollectionSubmitting(true);
    setError(null);

    try {
      const created = await createCollection(entryId, {
        amount_collected: amount,
        collection_date: collectionForm.collection_date,
        payment_method: collectionForm.payment_method,
        notes: collectionForm.notes.trim() || undefined,
      });

      setCollectionsByEntry((prev) => ({
        ...prev,
        [entryId]: [...(prev[entryId] ?? []), created].sort((a, b) => a.collection_date.localeCompare(b.collection_date)),
      }));

      setCollectionForm({
        amount_collected: "",
        collection_date: new Date().toISOString().split("T")[0],
        payment_method: "Cash",
        notes: "",
      });

      await refreshEntries();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add collection");
    } finally {
      setCollectionSubmitting(false);
    }
  };

  const handleDeleteCollection = async (entryId: string, collectionId: string) => {
    if (!window.confirm("Delete this collection record?")) {
      return;
    }

    try {
      await deleteCollection(collectionId);
      setCollectionsByEntry((prev) => ({
        ...prev,
        [entryId]: (prev[entryId] ?? []).filter((item) => item.collection_id !== collectionId),
      }));
      await refreshEntries();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete collection");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50/50">
      <AppSidebar
        active="entries"
        onGoHome={onGoHome}
        onGoLoans={onGoLoans}
        onGoDebtors={onGoDebtors}
        onGoEntries={() => {}}
        onGoProfile={onGoProfile}
        onGoLanding={onGoLanding}
        onLogout={onLogout}
      />

      <main className="ml-64 p-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Entries</h1>
            <p className="text-sm text-slate-600">Track each loan record per debtor.</p>
          </div>
          <button
            onClick={() => setShowForm((value) => !value)}
            className="inline-flex items-center rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Entry
          </button>
        </div>

        <div className="mb-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-slate-500">Total outstanding</p>
          <p className="text-2xl font-bold">{totalOutstanding.toLocaleString()}</p>
        </div>

        {error && (
          <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        )}

        {showForm && (
          <form onSubmit={handleCreate} className="mb-6 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Debtor</label>
                <select
                  value={form.debtor_id}
                  onChange={(event) => setForm((prev) => ({ ...prev, debtor_id: event.target.value }))}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                >
                  <option value="">Select debtor</option>
                  {debtors.map((debtor) => (
                    <option key={debtor.debtor_id} value={debtor.debtor_id}>
                      {debtor.debtor_name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Amount</label>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={form.original_amount}
                  onChange={(event) => setForm((prev) => ({ ...prev, original_amount: event.target.value }))}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Lending date</label>
                <input
                  type="date"
                  value={form.lending_date}
                  onChange={(event) => setForm((prev) => ({ ...prev, lending_date: event.target.value }))}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Expected payback date</label>
                <input
                  type="date"
                  value={form.expected_payback_date}
                  onChange={(event) => setForm((prev) => ({ ...prev, expected_payback_date: event.target.value }))}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div className="md:col-span-2">
                <label className="mb-1 block text-sm font-medium text-slate-700">Notes</label>
                <input
                  value={form.notes}
                  onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  placeholder="Optional"
                />
              </div>
            </div>
            <div className="mt-4 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setForm(INITIAL_FORM);
                }}
                className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                {submitting ? "Saving..." : "Save Entry"}
              </button>
            </div>
          </form>
        )}

        <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
          {loading ? (
            <div className="p-6 text-sm text-slate-500">Loading entries...</div>
          ) : entries.length === 0 ? (
            <div className="p-6 text-sm text-slate-500">No entries yet.</div>
          ) : (
            <div className="divide-y">
              {entries.map((entry) => {
                const isExpanded = expandedEntryId === entry.entry_id;
                const collections = collectionsByEntry[entry.entry_id] ?? [];

                return (
                  <div key={entry.entry_id}>
                    <div className="flex items-center justify-between p-4">
                      <div>
                        <p className="font-medium">{entry.debtor_name}</p>
                        <p className="text-xs text-slate-500">{entry.entry_status}</p>
                      </div>
                      <div className="flex items-center gap-3 text-right text-sm">
                        <div>
                          <p className="font-medium">{formatAmount(entry.still_owed ?? entry.original_amount)}</p>
                          <p className="text-xs text-slate-500">{entry.currency}</p>
                        </div>
                        <button
                          onClick={() => toggleEntryDetails(entry.entry_id)}
                          className="rounded-md border border-slate-200 p-1.5 text-slate-500 hover:bg-slate-50"
                          title="View collections"
                        >
                          <Receipt className="h-4 w-4" />
                          {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                        </button>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="bg-slate-50 px-4 pb-4">
                        <div className="rounded-md border border-slate-200 bg-white p-3">
                          <p className="mb-2 text-sm font-semibold">Collections</p>
                          {collections.length === 0 ? (
                            <p className="mb-3 text-xs text-slate-500">No collections recorded yet.</p>
                          ) : (
                            <ul className="mb-3 divide-y rounded border">
                              {collections.map((collection) => (
                                <li key={collection.collection_id} className="flex items-center justify-between px-3 py-2 text-sm">
                                  <div>
                                    <p className="font-medium">{formatAmount(collection.amount_collected)}</p>
                                    <p className="text-xs text-slate-500">{collection.collection_date} • {collection.payment_method}</p>
                                  </div>
                                  <button
                                    onClick={() => handleDeleteCollection(entry.entry_id, collection.collection_id)}
                                    className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-red-600"
                                    title="Delete collection"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </li>
                              ))}
                            </ul>
                          )}

                          <div className="grid gap-2 md:grid-cols-4">
                            <input
                              type="number"
                              min="0.01"
                              step="0.01"
                              value={collectionForm.amount_collected}
                              onChange={(event) =>
                                setCollectionForm((prev) => ({ ...prev, amount_collected: event.target.value }))
                              }
                              placeholder="Amount"
                              className="rounded border border-slate-300 px-2 py-1 text-sm"
                            />
                            <input
                              type="date"
                              value={collectionForm.collection_date}
                              onChange={(event) =>
                                setCollectionForm((prev) => ({ ...prev, collection_date: event.target.value }))
                              }
                              className="rounded border border-slate-300 px-2 py-1 text-sm"
                            />
                            <select
                              value={collectionForm.payment_method}
                              onChange={(event) =>
                                setCollectionForm((prev) => ({
                                  ...prev,
                                  payment_method: event.target.value as PaymentMethod,
                                }))
                              }
                              className="rounded border border-slate-300 px-2 py-1 text-sm"
                            >
                              <option value="Cash">Cash</option>
                              <option value="Bank Transfer">Bank Transfer</option>
                              <option value="GCash">GCash</option>
                              <option value="PayMaya">PayMaya</option>
                              <option value="Check">Check</option>
                              <option value="Online Transfer">Online Transfer</option>
                              <option value="Card">Card</option>
                              <option value="Other">Other</option>
                            </select>
                            <button
                              onClick={() => handleAddCollection(entry.entry_id)}
                              disabled={collectionSubmitting}
                              className="rounded bg-slate-900 px-3 py-1 text-sm font-medium text-white disabled:opacity-50"
                            >
                              {collectionSubmitting ? "Saving..." : "Add"}
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default Entries;
