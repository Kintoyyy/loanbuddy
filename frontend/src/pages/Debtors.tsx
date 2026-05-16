import { FormEvent, useEffect, useState } from "react";
import { Home, User, LogOut, Users, Plus } from "lucide-react";
import { createDebtor, Debtor, DebtorRequest, getDebtors } from "../api";

interface DebtorsProps {
  onGoHome: () => void;
  onGoProfile: () => void;
  onGoEntries: () => void;
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

function Debtors({ onGoHome, onGoProfile, onGoEntries, onLogout }: DebtorsProps) {
  const [debtors, setDebtors] = useState<Debtor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState<DebtorFormState>(INITIAL_FORM);

  useEffect(() => {
    let active = true;

    getDebtors()
      .then((result) => {
        if (active) {
          setDebtors(result);
        }
      })
      .catch((err) => {
        if (active) {
          setError(err instanceof Error ? err.message : "Failed to load debtors");
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  const handleCreate = async (event: FormEvent) => {
    event.preventDefault();
    if (!form.debtor_name.trim()) {
      setError("Debtor name is required");
      return;
    }

    const payload: DebtorRequest = {
      debtor_name: form.debtor_name.trim(),
      debtor_type: form.debtor_type,
      phone_number: form.phone_number.trim() || undefined,
      email: form.email.trim() || undefined,
    };

    setSubmitting(true);
    setError(null);

    try {
      const created = await createDebtor(payload);
      setDebtors((prev) => [created, ...prev]);
      setForm(INITIAL_FORM);
      setShowForm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create debtor");
    } finally {
      setSubmitting(false);
    }
  };

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
          <button className="flex w-full items-center gap-3 rounded-lg bg-gray-100 px-3 py-2 text-sm font-medium text-gray-900">
            <Users className="h-4 w-4" />
            Debtors
          </button>
          <button onClick={onGoEntries} className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100">
            <User className="h-4 w-4" />
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
            <h1 className="text-2xl font-bold">Debtors</h1>
            <p className="text-sm text-slate-600">Manage people or entities that owe you.</p>
          </div>
          <button
            onClick={() => setShowForm((value) => !value)}
            className="inline-flex items-center rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Debtor
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        )}

        {showForm && (
          <form onSubmit={handleCreate} className="mb-6 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Name</label>
                <input
                  value={form.debtor_name}
                  onChange={(event) => setForm((prev) => ({ ...prev, debtor_name: event.target.value }))}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  placeholder="e.g. Alex"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Type</label>
                <select
                  value={form.debtor_type}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      debtor_type: event.target.value as "Person" | "Entity" | "Organization",
                    }))
                  }
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                >
                  <option value="Person">Person</option>
                  <option value="Entity">Entity</option>
                  <option value="Organization">Organization</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Phone</label>
                <input
                  value={form.phone_number}
                  onChange={(event) => setForm((prev) => ({ ...prev, phone_number: event.target.value }))}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  placeholder="Optional"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Email</label>
                <input
                  value={form.email}
                  onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
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
                {submitting ? "Saving..." : "Save Debtor"}
              </button>
            </div>
          </form>
        )}

        <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
          {loading ? (
            <div className="p-6 text-sm text-slate-500">Loading debtors...</div>
          ) : debtors.length === 0 ? (
            <div className="p-6 text-sm text-slate-500">No debtors yet.</div>
          ) : (
            <ul className="divide-y">
              {debtors.map((debtor) => (
                <li key={debtor.debtor_id} className="flex items-center justify-between p-4">
                  <div>
                    <p className="font-medium">{debtor.debtor_name}</p>
                    <p className="text-xs text-slate-500">{debtor.debtor_type}</p>
                  </div>
                  <div className="text-right text-sm">
                    <p className="font-medium">{(debtor.total_owed ?? 0).toLocaleString()}</p>
                    <p className="text-xs text-slate-500">{debtor.open_entries_count ?? 0} open entries</p>
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

export default Debtors;
