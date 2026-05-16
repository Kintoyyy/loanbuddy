import { FormEvent, useEffect, useState } from "react";
import { Home, User, LogOut, ListChecks, Plus } from "lucide-react";
import { createEntry, Debtor, Entry, EntryRequest, getDebtors, getEntries } from "../api";

interface EntriesProps {
  onGoHome: () => void;
  onGoProfile: () => void;
  onGoDebtors: () => void;
  onLogout: () => void;
}

const INITIAL_FORM = {
  debtor_id: "",
  original_amount: "",
  currency: "PHP",
  lending_date: new Date().toISOString().split("T")[0],
  expected_payback_date: "",
  notes: "",
};

function Entries({ onGoHome, onGoProfile, onGoDebtors, onLogout }: EntriesProps) {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [debtors, setDebtors] = useState<Debtor[]>([]);
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

  return (
    <div className="min-h-screen bg-gray-50/50">
      <aside className="fixed left-0 top-0 z-40 h-screen w-64 border-r bg-white">
        <div className="flex h-16 items-center border-b px-6">
          <span className="text-xl font-bold">Money Tracker</span>
        </div>
        <nav className="space-y-1 p-4">
          <button onClick={onGoHome} className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100">
            <Home className="h-4 w-4" />
            Dashboard
          </button>
          <button onClick={onGoDebtors} className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100">
            <User className="h-4 w-4" />
            Debtors
          </button>
          <button className="flex w-full items-center gap-3 rounded-lg bg-gray-100 px-3 py-2 text-sm font-medium text-gray-900">
            <ListChecks className="h-4 w-4" />
            Entries
          </button>
          <button onClick={onGoProfile} className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100">
            <User className="h-4 w-4" />
            Profile
          </button>
          <button onClick={onLogout} className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50">
            <LogOut className="h-4 w-4" />
            Logout
          </button>
        </nav>
      </aside>

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
            <ul className="divide-y">
              {entries.map((entry) => (
                <li key={entry.entry_id} className="flex items-center justify-between p-4">
                  <div>
                    <p className="font-medium">{entry.debtor_name}</p>
                    <p className="text-xs text-slate-500">{entry.entry_status}</p>
                  </div>
                  <div className="text-right text-sm">
                    <p className="font-medium">{(entry.still_owed ?? entry.original_amount).toLocaleString()}</p>
                    <p className="text-xs text-slate-500">{entry.currency}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>
    </div>
  );
}

export default Entries;
