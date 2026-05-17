import { useEffect, useState } from "react";
import { AlertTriangle, Save, Settings as SettingsIcon, Trash2 } from "lucide-react";
import AppSidebar from "../components/AppSidebar";
import { deleteAllEntries, deleteAllLoans } from "../api";
import { getAgreementSettings, saveAgreementSettings } from "../settingsStore";

interface Props {
  onGoHome: () => void;
  onGoLoans: () => void;
  onGoDebtors: () => void;
  onGoEntries: () => void;
  onGoProfile: () => void;
  onGoCalculator: () => void;
  onGoLanding: () => void;
  onLogout: () => void;
}

export default function Settings({
  onGoHome, onGoLoans, onGoDebtors, onGoEntries, onGoProfile, onGoCalculator, onGoLanding, onLogout,
}: Props) {
  const [lenderNameOverride, setLenderNameOverride] = useState("");
  const [additionalTerms, setAdditionalTerms] = useState("");
  const [saved, setSaved] = useState(false);

  const [clearingLoans, setClearingLoans] = useState(false);
  const [clearingEntries, setClearingEntries] = useState(false);
  const [dataError, setDataError] = useState<string | null>(null);

  useEffect(() => {
    const s = getAgreementSettings();
    setLenderNameOverride(s.lenderNameOverride);
    setAdditionalTerms(s.additionalTerms);
  }, []);

  function handleSaveAgreement() {
    saveAgreementSettings({ lenderNameOverride, additionalTerms });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function handleClearLoans() {
    if (!window.confirm("Delete ALL loans and their payment history? This cannot be undone.")) return;
    setClearingLoans(true);
    setDataError(null);
    try {
      await deleteAllLoans();
    } catch (e) {
      setDataError(e instanceof Error ? e.message : "Failed to delete loans.");
    } finally {
      setClearingLoans(false);
    }
  }

  async function handleClearEntries() {
    if (!window.confirm("Delete ALL entries (lending records) and their collection history? This cannot be undone.")) return;
    setClearingEntries(true);
    setDataError(null);
    try {
      await deleteAllEntries();
    } catch (e) {
      setDataError(e instanceof Error ? e.message : "Failed to delete entries.");
    } finally {
      setClearingEntries(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <AppSidebar
        active="settings"
        onGoHome={onGoHome}
        onGoLoans={onGoLoans}
        onGoDebtors={onGoDebtors}
        onGoEntries={onGoEntries}
        onGoProfile={onGoProfile}
        onGoSettings={() => {}}
        onGoCalculator={onGoCalculator}
        onGoLanding={onGoLanding}
        onLogout={onLogout}
      />

      <main className="pb-20 pt-0 md:ml-64 md:pb-8">
        <div className="border-b border-slate-200 bg-white px-6 py-5">
          <div className="mx-auto flex max-w-3xl items-center gap-3">
            <SettingsIcon className="h-6 w-6 text-slate-600" />
            <div>
              <h1 className="text-xl font-bold text-slate-900">Settings</h1>
              <p className="text-sm text-slate-500">Customize agreements and manage your data</p>
            </div>
          </div>
        </div>

        <div className="mx-auto max-w-3xl space-y-8 p-6">

          {/* Agreement Settings */}
          <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <h2 className="mb-1 text-base font-semibold text-slate-900">Agreement Customization</h2>
            <p className="mb-5 text-sm text-slate-500">
              These settings apply to all newly generated loan agreements.
            </p>

            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Lender Name Override
                </label>
                <input
                  type="text"
                  value={lenderNameOverride}
                  onChange={(e) => setLenderNameOverride(e.target.value)}
                  placeholder="Leave blank to use your profile name"
                  className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500"
                />
                <p className="mt-1 text-xs text-slate-400">
                  Overrides the lender name on the agreement document (e.g. a business name).
                </p>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Additional Terms
                </label>
                <textarea
                  value={additionalTerms}
                  onChange={(e) => setAdditionalTerms(e.target.value)}
                  placeholder="Any extra clauses or conditions to append to the agreement…"
                  rows={5}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500"
                />
                <p className="mt-1 text-xs text-slate-400">
                  Added as a separate section at the end of generated agreements.
                </p>
              </div>
            </div>

            <div className="mt-5 flex items-center gap-3">
              <button
                onClick={handleSaveAgreement}
                className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800"
              >
                <Save className="h-4 w-4" />
                Save Settings
              </button>
              {saved && (
                <span className="text-sm text-emerald-600">Saved!</span>
              )}
            </div>
          </section>

          {/* Data Management */}
          <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <h2 className="mb-1 text-base font-semibold text-slate-900">Data Management</h2>
            <p className="mb-5 text-sm text-slate-500">
              Permanently delete data from your account. These actions cannot be undone.
            </p>

            {dataError && (
              <div className="mb-4 flex items-start gap-2 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                {dataError}
              </div>
            )}

            <div className="space-y-4">
              <div className="flex items-start justify-between gap-4 rounded-xl border border-slate-200 p-4">
                <div>
                  <p className="font-medium text-slate-800">Clear All Loans</p>
                  <p className="mt-0.5 text-sm text-slate-500">
                    Deletes all loan records and their full payment history.
                  </p>
                </div>
                <button
                  onClick={handleClearLoans}
                  disabled={clearingLoans}
                  className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-red-300 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-100 disabled:opacity-50"
                >
                  <Trash2 className="h-4 w-4" />
                  {clearingLoans ? "Deleting…" : "Delete All Loans"}
                </button>
              </div>

              <div className="flex items-start justify-between gap-4 rounded-xl border border-slate-200 p-4">
                <div>
                  <p className="font-medium text-slate-800">Clear All Entries</p>
                  <p className="mt-0.5 text-sm text-slate-500">
                    Deletes all lending entry records and their collection history.
                  </p>
                </div>
                <button
                  onClick={handleClearEntries}
                  disabled={clearingEntries}
                  className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-red-300 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-100 disabled:opacity-50"
                >
                  <Trash2 className="h-4 w-4" />
                  {clearingEntries ? "Deleting…" : "Delete All Entries"}
                </button>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
