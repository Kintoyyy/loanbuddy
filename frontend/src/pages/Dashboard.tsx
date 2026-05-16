import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Banknote, CalendarClock, ListChecks, TrendingUp, User, Users } from "lucide-react";
import AppSidebar from "../components/AppSidebar";
import { getDebtors, getEntries, getLoans, getProfile, getProfilePhotoBlob, ProfileResponse } from "../api";
import type { Debtor, Entry, Loan } from "../api";

interface DashboardProps {
  onGoProfile: () => void;
  onGoLoans: () => void;
  onGoDebtors: () => void;
  onGoEntries: () => void;
  onLogout: () => void;
  onGoLanding: () => void;
}

function Dashboard({ onGoProfile, onGoLoans, onGoDebtors, onGoEntries, onLogout, onGoLanding }: DashboardProps) {
  const [profile, setProfile] = useState<ProfileResponse | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [debtors, setDebtors] = useState<Debtor[]>([]);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
  const [selectedLoanId, setSelectedLoanId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const displayName = profile?.first_name || profile?.username || "";
  const initials = profile?.first_name?.charAt(0).toUpperCase() || "U";

  useEffect(() => {
    let active = true;

    const loadDashboardProfile = async () => {
      try {
        const profileResponse = await getProfile();
        if (!active) return;
        setProfile(profileResponse);

        if (!profileResponse.photo_filename || !profileResponse.photo_mime_type) {
          setPhotoUrl((cur) => { if (cur) URL.revokeObjectURL(cur); return null; });
          return;
        }

        const photoBlob = await getProfilePhotoBlob();
        if (!active || !photoBlob) {
          setPhotoUrl((cur) => { if (cur) URL.revokeObjectURL(cur); return null; });
          return;
        }

        const nextPhotoUrl = URL.createObjectURL(photoBlob);
        setPhotoUrl((cur) => { if (cur) URL.revokeObjectURL(cur); return nextPhotoUrl; });
      } catch { /* ignore */ }
    };

    Promise.all([loadDashboardProfile(), getDebtors(), getEntries(), getLoans()])
      .then(([, debtorResult, entryResult, loanResult]) => {
        if (!active) return;
        setDebtors(debtorResult);
        setEntries(entryResult);
        setLoans(loanResult);
      })
      .catch(() => {})
      .finally(() => { if (active) setLoading(false); });

    return () => {
      active = false;
      setPhotoUrl((cur) => { if (cur) URL.revokeObjectURL(cur); return null; });
    };
  }, []);

  const activeDebtors = useMemo(() => debtors.filter((d) => !d.is_archived), [debtors]);
  const activeEntries = useMemo(() => entries.filter((e) => !e.is_archived), [entries]);
  const activeLoans = useMemo(() => loans, [loans]);

  const metrics = useMemo(() => {
    const openEntries = activeEntries.filter((e) => e.entry_status === "Open").length;
    const partialEntries = activeEntries.filter((e) => e.entry_status === "Partially Collected").length;
    const closedEntries = activeEntries.filter((e) => e.entry_status === "Closed").length;
    const totalLent = activeEntries.reduce((s, e) => s + e.original_amount, 0);
    const totalCollected = activeEntries.reduce((s, e) => s + (e.total_collected ?? 0), 0);
    const totalOutstanding = activeEntries.reduce((s, e) => s + (e.still_owed ?? e.original_amount), 0);
    const recoveryRate = totalLent > 0 ? Math.round((totalCollected / totalLent) * 100) : 0;
    return { openEntries, partialEntries, closedEntries, totalLent, totalCollected, totalOutstanding, recoveryRate };
  }, [activeEntries]);

  const loanMetrics = useMemo(() => {
    const activeLoansCount = activeLoans.filter((l) => l.status === "active").length;
    const paidLoansCount = activeLoans.filter((l) => l.status === "paid").length;
    const overdueLoansCount = activeLoans.filter(
      (l) => l.status === "active" && l.due_date != null && new Date(l.due_date) < new Date()
    ).length;
    const totalLentLoans = activeLoans.reduce((s, l) => s + Number(l.amount), 0);
    const totalPaidLoans = activeLoans.reduce((s, l) => s + Number(l.paid_amount ?? 0), 0);
    const totalOutstandingLoans = activeLoans.reduce((s, l) => s + Number(l.remaining_balance ?? l.amount), 0);
    return { activeLoansCount, paidLoansCount, overdueLoansCount, totalLentLoans, totalPaidLoans, totalOutstandingLoans };
  }, [activeLoans]);

  const monthlySeries = useMemo(() => {
    const now = new Date();
    const months = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      return { key: `${d.getFullYear()}-${d.getMonth()}`, label: d.toLocaleDateString(undefined, { month: "short" }), lent: 0, collected: 0 };
    });
    const seriesMap = new Map(months.map((m) => [m.key, m]));
    activeEntries.forEach((entry) => {
      const ld = new Date(entry.lending_date);
      const lb = seriesMap.get(`${ld.getFullYear()}-${ld.getMonth()}`);
      if (lb) lb.lent += entry.original_amount;
      if ((entry.total_collected ?? 0) > 0) {
        const cd = new Date(entry.updated_at);
        const cb = seriesMap.get(`${cd.getFullYear()}-${cd.getMonth()}`);
        if (cb) cb.collected += entry.total_collected ?? 0;
      }
    });
    const maxValue = Math.max(1, ...months.map((m) => Math.max(m.lent, m.collected)));
    return { months, maxValue };
  }, [activeEntries]);

  const topDebtors = useMemo(
    () => [...activeDebtors].sort((a, b) => (b.total_owed ?? 0) - (a.total_owed ?? 0)).slice(0, 5),
    [activeDebtors]
  );

  const latestEntries = useMemo(
    () => [...activeEntries].sort((a, b) => b.updated_at.localeCompare(a.updated_at)).slice(0, 5),
    [activeEntries]
  );

  const latestLoans = useMemo(
    () => [...activeLoans].sort((a, b) => b.updated_at.localeCompare(a.updated_at)).slice(0, 5),
    [activeLoans]
  );

  useEffect(() => {
    if (!selectedEntryId && latestEntries.length > 0) setSelectedEntryId(latestEntries[0].entry_id);
  }, [latestEntries, selectedEntryId]);

  useEffect(() => {
    if (!selectedLoanId && latestLoans.length > 0) setSelectedLoanId(latestLoans[0].loan_id);
  }, [latestLoans, selectedLoanId]);

  const selectedEntry = latestEntries.find((e) => e.entry_id === selectedEntryId) ?? latestEntries[0] ?? null;
  const selectedLoan = latestLoans.find((l) => l.loan_id === selectedLoanId) ?? latestLoans[0] ?? null;

  const formatDate = (value: string | null) => {
    if (!value) return "—";
    return new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  };

  const summaryCards = [
    { title: "Outstanding", value: metrics.totalOutstanding, description: "Still owed", icon: Banknote, accent: "text-rose-600", bg: "bg-rose-50", border: "border-rose-100" },
    { title: "Collected", value: metrics.totalCollected, description: "Recovered amount", icon: TrendingUp, accent: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-100" },
    { title: "Active Debtors", value: activeDebtors.length, description: "People / entities", icon: Users, accent: "text-sky-600", bg: "bg-sky-50", border: "border-sky-100" },
    { title: "Open Entries", value: metrics.openEntries, description: "Needs follow-up", icon: ListChecks, accent: "text-violet-600", bg: "bg-violet-50", border: "border-violet-100" },
  ];

  const progressAngle = Math.round((metrics.recoveryRate / 100) * 360);

  return (
    <div className="min-h-screen bg-slate-50">
      <AppSidebar
        active="dashboard"
        onGoHome={() => {}}
        onGoLoans={onGoLoans}
        onGoDebtors={onGoDebtors}
        onGoEntries={onGoEntries}
        onGoProfile={onGoProfile}
        onGoLanding={onGoLanding}
        onLogout={onLogout}
      />

      <main className="pb-24 md:ml-64 md:pb-8">
        {/* Top bar */}
        <div className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur md:px-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h1 className="text-base font-semibold text-slate-900 md:text-xl">
                Welcome back{displayName ? `, ${displayName}` : ""}
              </h1>
              <p className="text-xs text-slate-500 md:text-sm">Track collections, risks, and progress in one place.</p>
            </div>
            <button
              onClick={onGoProfile}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 md:text-sm"
            >
              <span className="flex h-7 w-7 items-center justify-center overflow-hidden rounded-full bg-slate-900 text-xs font-semibold text-white">
                {photoUrl ? (
                  <img src={photoUrl} alt="Profile" className="h-full w-full object-cover" onError={() => setPhotoUrl(null)} />
                ) : (
                  <span>{initials}</span>
                )}
              </span>
              Profile
            </button>
          </div>
        </div>

        <div className="space-y-4 px-4 py-4 md:space-y-6 md:px-6 md:py-6">
          {/* Hero banner */}
          <section className="overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-sky-700 p-4 text-white shadow-lg md:p-6">
            <p className="text-xs uppercase tracking-[0.18em] text-sky-200">Portfolio Overview</p>
            <div className="mt-2 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-3xl font-bold md:text-4xl">{metrics.totalOutstanding.toLocaleString()}</p>
                <p className="mt-1 text-sm text-sky-100">Outstanding balance across {activeEntries.length} active entries</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={onGoEntries}
                  className="inline-flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-sm font-semibold text-slate-900"
                >
                  Add Collection <ArrowRight className="h-4 w-4" />
                </button>
                <button onClick={onGoLoans} className="rounded-xl border border-white/30 px-3 py-2 text-sm font-semibold text-white">
                  View Loans
                </button>
              </div>
            </div>
          </section>

          {/* Summary cards */}
          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {summaryCards.map((card) => (
              <div key={card.title} className={`rounded-2xl border bg-white p-4 shadow-sm ${card.border}`}>
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-sm font-medium text-slate-500">{card.title}</p>
                  <span className={`inline-flex h-8 w-8 items-center justify-center rounded-lg ${card.bg}`}>
                    <card.icon className={`h-4 w-4 ${card.accent}`} />
                  </span>
                </div>
                <p className="text-2xl font-bold text-slate-900">{card.value.toLocaleString()}</p>
                <p className="mt-1 text-xs text-slate-500">{card.description}</p>
              </div>
            ))}
          </section>

          {/* Cashflow chart + Recovery progress + Top Debtors */}
          <section className="grid gap-4 xl:grid-cols-5">
            {/* 6-Month Cashflow */}
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm xl:col-span-3">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-base font-semibold text-slate-900">6-Month Cashflow</h2>
                  <p className="text-xs text-slate-500">Lent vs collected by month</p>
                </div>
                <span className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">Auto</span>
              </div>
              <div className="grid grid-cols-6 gap-3">
                {monthlySeries.months.map((item) => (
                  <div key={item.key} className="flex flex-col items-center gap-2">
                    <div className="flex h-32 items-end gap-1">
                      <div
                        className="w-3 rounded-t bg-slate-300"
                        style={{ height: `${Math.max(6, (item.lent / monthlySeries.maxValue) * 100)}%` }}
                        title={`Lent ${item.lent.toLocaleString()}`}
                      />
                      <div
                        className="w-3 rounded-t bg-emerald-500"
                        style={{ height: `${Math.max(6, (item.collected / monthlySeries.maxValue) * 100)}%` }}
                        title={`Collected ${item.collected.toLocaleString()}`}
                      />
                    </div>
                    <p className="text-xs font-medium text-slate-500">{item.label}</p>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex gap-4 text-xs text-slate-500">
                <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-slate-300" /> Lent</span>
                <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-500" /> Collected</span>
              </div>
            </div>

            {/* Right column: Recovery + Top Debtors */}
            <div className="space-y-4 xl:col-span-2">
              {/* Recovery Progress */}
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <h2 className="text-base font-semibold text-slate-900">Recovery Progress</h2>
                <div className="mt-4 flex items-center gap-4">
                  <div
                    className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full"
                    style={{ background: `conic-gradient(rgb(16 185 129) ${progressAngle}deg, rgb(226 232 240) ${progressAngle}deg 360deg)` }}
                  >
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white text-sm font-semibold text-slate-900">
                      {metrics.recoveryRate}%
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Collection rate</p>
                    <p className="text-xs text-slate-500">{metrics.totalCollected.toLocaleString()} of {metrics.totalLent.toLocaleString()} collected</p>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="rounded-lg bg-slate-100 px-2 py-2 text-slate-600">
                    Open<br /><span className="text-sm font-semibold text-slate-900">{metrics.openEntries}</span>
                  </div>
                  <div className="rounded-lg bg-amber-100 px-2 py-2 text-amber-700">
                    Partial<br /><span className="text-sm font-semibold text-amber-900">{metrics.partialEntries}</span>
                  </div>
                  <div className="rounded-lg bg-emerald-100 px-2 py-2 text-emerald-700">
                    Closed<br /><span className="text-sm font-semibold text-emerald-900">{metrics.closedEntries}</span>
                  </div>
                </div>
              </div>

              {/* Top Debtors */}
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="text-base font-semibold text-slate-900">Top Debtors</h2>
                  <button onClick={onGoDebtors} className="text-xs font-medium text-sky-600 hover:underline">
                    View all
                  </button>
                </div>
                {topDebtors.length === 0 ? (
                  <p className="py-4 text-center text-sm text-slate-400">No debtor data yet.</p>
                ) : (
                  <div className="space-y-2">
                    {topDebtors.map((debtor, i) => {
                      const maxOwed = topDebtors[0]?.total_owed ?? 1;
                      const pct = maxOwed > 0 ? Math.round(((debtor.total_owed ?? 0) / maxOwed) * 100) : 0;
                      const parts = debtor.debtor_name.split(" ");
                      const avatarInitials = (parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "");
                      const rankColors = ["bg-amber-400", "bg-slate-400", "bg-orange-600", "bg-slate-300", "bg-slate-300"];
                      const avatarColors = [
                        "bg-rose-100 text-rose-700",
                        "bg-sky-100 text-sky-700",
                        "bg-violet-100 text-violet-700",
                        "bg-emerald-100 text-emerald-700",
                        "bg-amber-100 text-amber-700",
                      ];
                      return (
                        <div key={debtor.debtor_id} className="flex items-center gap-2.5 rounded-xl bg-slate-50 px-3 py-2.5">
                          <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white ${rankColors[i] ?? "bg-slate-300"}`}>
                            {i + 1}
                          </span>
                          <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold uppercase ${avatarColors[i % avatarColors.length]}`}>
                            {avatarInitials.toUpperCase() || "?"}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-baseline justify-between gap-1">
                              <p className="truncate text-sm font-medium text-slate-900">{debtor.debtor_name}</p>
                              <p className="shrink-0 text-sm font-semibold text-rose-600">{(debtor.total_owed ?? 0).toLocaleString()}</p>
                            </div>
                            <div className="mt-1 flex items-center gap-2">
                              <div className="h-1 flex-1 overflow-hidden rounded-full bg-slate-200">
                                <div className="h-full rounded-full bg-rose-400 transition-all" style={{ width: `${pct}%` }} />
                              </div>
                              <p className="shrink-0 text-[10px] text-slate-400">{debtor.open_entries_count ?? 0} open</p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* Loan Snapshot + Recent Entries */}
          <section className="grid gap-4 xl:grid-cols-2">
            {/* Loan Snapshot */}
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-semibold text-slate-900">Loan Snapshot</h2>
                  <p className="text-xs text-slate-500">Loans tracked separately via payment records.</p>
                </div>
                <span className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">
                  {loanMetrics.activeLoansCount} active
                </span>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl bg-slate-50 px-3 py-3">
                  <p className="text-xs text-slate-500">Lent</p>
                  <p className="mt-1 text-lg font-semibold text-slate-900">{loanMetrics.totalLentLoans.toLocaleString()}</p>
                </div>
                <div className="rounded-xl bg-emerald-50 px-3 py-3">
                  <p className="text-xs text-emerald-700">Collected</p>
                  <p className="mt-1 text-lg font-semibold text-emerald-800">{loanMetrics.totalPaidLoans.toLocaleString()}</p>
                </div>
                <div className="rounded-xl bg-rose-50 px-3 py-3">
                  <p className="text-xs text-rose-700">Outstanding</p>
                  <p className="mt-1 text-lg font-semibold text-rose-800">{loanMetrics.totalOutstandingLoans.toLocaleString()}</p>
                </div>
              </div>

              <div className="mt-4 space-y-2">
                {latestLoans.length === 0 ? (
                  <p className="text-sm text-slate-500">No loans yet.</p>
                ) : (
                  latestLoans.map((loan) => {
                    const isSelected = selectedLoan?.loan_id === loan.loan_id;
                    const remaining = Number(loan.remaining_balance ?? loan.amount);
                    const paidPct = Number(loan.amount) > 0 ? Math.round((Number(loan.paid_amount ?? 0) / Number(loan.amount)) * 100) : 0;

                    return (
                      <button
                        key={loan.loan_id}
                        onClick={() => setSelectedLoanId(loan.loan_id)}
                        className={`w-full rounded-xl border px-3 py-3 text-left transition ${isSelected ? "border-slate-900 bg-slate-50" : "border-slate-200 bg-white hover:bg-slate-50"}`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-slate-900">{loan.borrower_name}</p>
                            <p className="text-xs text-slate-500">
                              {formatDate(loan.date_lent)} · {loan.status === "paid" ? "Paid" : "Active"}
                              {loan.due_date && new Date(loan.due_date) < new Date() && loan.status !== "paid" && (
                                <span className="ml-1 font-medium text-red-500">· Overdue</span>
                              )}
                            </p>
                          </div>
                          <div className="shrink-0 text-right">
                            <p className="text-sm font-semibold text-slate-900">{remaining.toLocaleString()}</p>
                            <p className="text-xs text-slate-500">remaining</p>
                          </div>
                        </div>
                        <div className="mt-2 h-1 overflow-hidden rounded-full bg-slate-200">
                          <div className="h-full rounded-full bg-emerald-400" style={{ width: `${paidPct}%` }} />
                        </div>
                      </button>
                    );
                  })
                )}
              </div>

              {selectedLoan && (
                <div className="mt-4 rounded-2xl bg-slate-50 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Loan details</p>
                      <h3 className="mt-1 text-base font-semibold text-slate-900">{selectedLoan.borrower_name}</h3>
                      <p className="text-sm text-slate-500">{selectedLoan.description || "No description provided"}</p>
                    </div>
                    <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${selectedLoan.status === "paid" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                      {selectedLoan.status === "paid" ? "Paid" : "Active"}
                    </span>
                  </div>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div>
                      <p className="text-xs text-slate-500">Amount lent</p>
                      <p className="text-sm font-semibold text-slate-900">{Number(selectedLoan.amount).toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Paid / Remaining</p>
                      <p className="text-sm font-semibold text-slate-900">
                        {Number(selectedLoan.paid_amount ?? 0).toLocaleString()} / {Number(selectedLoan.remaining_balance ?? selectedLoan.amount).toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Date lent</p>
                      <p className="text-sm font-semibold text-slate-900">{formatDate(selectedLoan.date_lent)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Due date</p>
                      <p className="text-sm font-semibold text-slate-900">{formatDate(selectedLoan.due_date)}</p>
                    </div>
                  </div>
                  <div className="mt-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Payments</p>
                    <p className="mt-1 text-sm text-slate-700">{selectedLoan.loan_payments.length} payment record(s)</p>
                  </div>
                </div>
              )}
            </div>

            {/* Recent Entries */}
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-semibold text-slate-900">Recent Entries</h2>
                  <p className="text-xs text-slate-500">Debtor balances tracked with collection history.</p>
                </div>
                <span className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">
                  {latestEntries.length} shown
                </span>
              </div>

              <div className="space-y-2">
                {latestEntries.length === 0 ? (
                  <p className="text-sm text-slate-500">No entries yet.</p>
                ) : (
                  latestEntries.map((entry) => {
                    const isSelected = selectedEntry?.entry_id === entry.entry_id;
                    const stillOwed = Number(entry.still_owed ?? entry.original_amount);
                    const collectedPct = entry.original_amount > 0
                      ? Math.round(((entry.total_collected ?? 0) / entry.original_amount) * 100)
                      : 0;
                    const statusColor =
                      entry.entry_status === "Closed"
                        ? "bg-emerald-100 text-emerald-700"
                        : entry.entry_status === "Partially Collected"
                        ? "bg-amber-100 text-amber-700"
                        : "bg-slate-100 text-slate-600";

                    return (
                      <button
                        key={entry.entry_id}
                        onClick={() => setSelectedEntryId(entry.entry_id)}
                        className={`w-full rounded-xl border px-3 py-3 text-left transition ${isSelected ? "border-slate-900 bg-slate-50" : "border-slate-200 bg-white hover:bg-slate-50"}`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-slate-900">{entry.debtor_name}</p>
                            <p className="text-xs text-slate-500">{formatDate(entry.lending_date)}</p>
                          </div>
                          <div className="flex shrink-0 flex-col items-end gap-1">
                            <p className="text-sm font-semibold text-slate-900">{stillOwed.toLocaleString()}</p>
                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${statusColor}`}>
                              {entry.entry_status}
                            </span>
                          </div>
                        </div>
                        <div className="mt-2 h-1 overflow-hidden rounded-full bg-slate-200">
                          <div className="h-full rounded-full bg-sky-400" style={{ width: `${collectedPct}%` }} />
                        </div>
                      </button>
                    );
                  })
                )}
              </div>

              {selectedEntry && (
                <div className="mt-4 rounded-2xl bg-slate-50 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Entry details</p>
                      <h3 className="mt-1 text-base font-semibold text-slate-900">{selectedEntry.debtor_name}</h3>
                      <p className="text-sm text-slate-500">{selectedEntry.notes || "No notes attached"}</p>
                    </div>
                    <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${
                      selectedEntry.entry_status === "Closed" ? "bg-emerald-100 text-emerald-700"
                      : selectedEntry.entry_status === "Partially Collected" ? "bg-amber-100 text-amber-700"
                      : "bg-sky-100 text-sky-700"
                    }`}>
                      {selectedEntry.entry_status}
                    </span>
                  </div>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div>
                      <p className="text-xs text-slate-500">Original amount</p>
                      <p className="text-sm font-semibold text-slate-900">{Number(selectedEntry.original_amount).toLocaleString()} {selectedEntry.currency}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Collected / Owed</p>
                      <p className="text-sm font-semibold text-slate-900">
                        {Number(selectedEntry.total_collected ?? 0).toLocaleString()} / {Number(selectedEntry.still_owed ?? selectedEntry.original_amount).toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Lending date</p>
                      <p className="text-sm font-semibold text-slate-900">{formatDate(selectedEntry.lending_date)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Expected payback</p>
                      <p className="text-sm font-semibold text-slate-900">{formatDate(selectedEntry.expected_payback_date)}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* Recent Activity + Quick Actions */}
          <section className="grid gap-4 xl:grid-cols-5">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm xl:col-span-3">
              <h2 className="text-base font-semibold text-slate-900">Recent Activity</h2>
              <p className="mt-1 text-xs text-slate-500">Latest entries and loans across your portfolio.</p>
              <div className="mt-3 space-y-2">
                {loading ? (
                  <p className="text-sm text-slate-500">Loading activity...</p>
                ) : latestEntries.length === 0 && latestLoans.length === 0 ? (
                  <p className="text-sm text-slate-500">No activity yet.</p>
                ) : (
                  <>
                    {latestEntries.slice(0, 3).map((entry) => (
                      <div key={entry.entry_id} className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium text-slate-900">{entry.debtor_name}</p>
                            <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-medium text-sky-700">Entry</span>
                          </div>
                          <p className="text-xs text-slate-500">{formatDate(entry.lending_date)}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-slate-900">{Number(entry.still_owed ?? entry.original_amount).toLocaleString()}</p>
                          <p className="text-xs text-slate-500">owed</p>
                        </div>
                      </div>
                    ))}
                    {latestLoans.slice(0, 3).map((loan) => (
                      <div key={loan.loan_id} className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium text-slate-900">{loan.borrower_name}</p>
                            <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-medium text-violet-700">Loan</span>
                          </div>
                          <p className="text-xs text-slate-500">{formatDate(loan.date_lent)}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-slate-900">{Number(loan.remaining_balance ?? loan.amount).toLocaleString()}</p>
                          <p className="text-xs text-slate-500">remaining</p>
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm xl:col-span-2">
              <h2 className="text-base font-semibold text-slate-900">Quick Actions</h2>
              <div className="mt-3 space-y-2">
                <button onClick={onGoDebtors} className="inline-flex w-full items-center justify-between rounded-xl bg-slate-900 px-3 py-3 text-sm font-medium text-white hover:bg-slate-800">
                  Manage Debtors <ArrowRight className="h-4 w-4" />
                </button>
                <button onClick={onGoEntries} className="inline-flex w-full items-center justify-between rounded-xl border border-slate-200 px-3 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50">
                  Manage Entries <ArrowRight className="h-4 w-4" />
                </button>
                <button onClick={onGoLoans} className="inline-flex w-full items-center justify-between rounded-xl border border-slate-200 px-3 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50">
                  Review Loans <ArrowRight className="h-4 w-4" />
                </button>
                <button onClick={onGoLanding} className="inline-flex w-full items-center justify-between rounded-xl border border-slate-200 px-3 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50">
                  Back to Landing <ArrowRight className="h-4 w-4" />
                </button>
              </div>
              {profile && (
                <div className="mt-4 rounded-xl bg-slate-50 p-3 text-xs text-slate-600">
                  <p className="font-medium text-slate-800">{profile.email}</p>
                  <p className="mt-1 inline-flex items-center gap-1"><CalendarClock className="h-3.5 w-3.5" /> Member since {new Date(profile.created_at).toLocaleDateString()}</p>
                  <p className="mt-1 inline-flex items-center gap-1"><User className="h-3.5 w-3.5" /> {profile.username || "Username not set"}</p>
                </div>
              )}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

export default Dashboard;
