import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Banknote, CalendarClock, ListChecks, TrendingUp, User, Users } from "lucide-react";
import AppSidebar from "../components/AppSidebar";
import { Debtor, Entry, getDebtors, getEntries, getProfile, getProfilePhotoBlob, ProfileResponse } from "../api";

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
          setPhotoUrl((currentUrl) => {
            if (currentUrl) {
              URL.revokeObjectURL(currentUrl);
            }
            return null;
          });
          return;
        }

        const photoBlob = await getProfilePhotoBlob();
        if (!active || !photoBlob) {
          setPhotoUrl((currentUrl) => {
            if (currentUrl) {
              URL.revokeObjectURL(currentUrl);
            }
            return null;
          });
          return;
        }

        const nextPhotoUrl = URL.createObjectURL(photoBlob);
        setPhotoUrl((currentUrl) => {
          if (currentUrl) {
            URL.revokeObjectURL(currentUrl);
          }
          return nextPhotoUrl;
        });
      } catch {
      }
    };

    Promise.all([loadDashboardProfile(), getDebtors(), getEntries()])
      .then(([, debtorResult, entryResult]) => {
        if (!active) return;
        setDebtors(debtorResult);
        setEntries(entryResult);
      })
      .catch(() => {})
      .finally(() => {
        if (!active) return;
        setLoading(false);
      });

    return () => {
      active = false;
      setPhotoUrl((currentUrl) => {
        if (currentUrl) {
          URL.revokeObjectURL(currentUrl);
        }
        return null;
      });
    };
  }, []);

  const activeDebtors = useMemo(() => debtors.filter((item) => !item.is_archived), [debtors]);
  const activeEntries = useMemo(() => entries.filter((item) => !item.is_archived), [entries]);

  const metrics = useMemo(() => {
    const openEntries = activeEntries.filter((item) => item.entry_status === "Open").length;
    const partialEntries = activeEntries.filter((item) => item.entry_status === "Partially Collected").length;
    const closedEntries = activeEntries.filter((item) => item.entry_status === "Closed").length;

    const totalLent = activeEntries.reduce((sum, item) => sum + item.original_amount, 0);
    const totalCollected = activeEntries.reduce((sum, item) => sum + (item.total_collected ?? 0), 0);
    const totalOutstanding = activeEntries.reduce((sum, item) => sum + (item.still_owed ?? item.original_amount), 0);
    const recoveryRate = totalLent > 0 ? Math.round((totalCollected / totalLent) * 100) : 0;

    return {
      openEntries,
      partialEntries,
      closedEntries,
      totalLent,
      totalCollected,
      totalOutstanding,
      recoveryRate,
    };
  }, [activeEntries]);

  const monthlySeries = useMemo(() => {
    const now = new Date();
    const months = Array.from({ length: 6 }, (_, index) => {
      const date = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1);
      return {
        key: `${date.getFullYear()}-${date.getMonth()}`,
        label: date.toLocaleDateString(undefined, { month: "short" }),
        lent: 0,
        collected: 0,
      };
    });

    const seriesMap = new Map(months.map((item) => [item.key, item]));

    activeEntries.forEach((entry) => {
      const lendingDate = new Date(entry.lending_date);
      const lendingKey = `${lendingDate.getFullYear()}-${lendingDate.getMonth()}`;
      const lendingBucket = seriesMap.get(lendingKey);
      if (lendingBucket) {
        lendingBucket.lent += entry.original_amount;
      }

      if ((entry.total_collected ?? 0) > 0) {
        const collectionDate = new Date(entry.updated_at);
        const collectionKey = `${collectionDate.getFullYear()}-${collectionDate.getMonth()}`;
        const collectionBucket = seriesMap.get(collectionKey);
        if (collectionBucket) {
          collectionBucket.collected += entry.total_collected ?? 0;
        }
      }
    });

    const maxValue = Math.max(1, ...months.map((item) => Math.max(item.lent, item.collected)));

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

  const summaryCards = [
    {
      title: "Outstanding",
      value: metrics.totalOutstanding,
      description: "Still owed",
      icon: Banknote,
      accent: "text-rose-600",
      bg: "bg-rose-50",
    },
    {
      title: "Collected",
      value: metrics.totalCollected,
      description: "Recovered amount",
      icon: TrendingUp,
      accent: "text-emerald-600",
      bg: "bg-emerald-50",
    },
    {
      title: "Active Debtors",
      value: activeDebtors.length,
      description: "People/entities",
      icon: Users,
      accent: "text-sky-600",
      bg: "bg-sky-50",
    },
    {
      title: "Open Entries",
      value: metrics.openEntries,
      description: "Needs follow-up",
      icon: ListChecks,
      accent: "text-violet-600",
      bg: "bg-violet-50",
    },
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
                  Add Collection
                  <ArrowRight className="h-4 w-4" />
                </button>
                <button
                  onClick={onGoLoans}
                  className="rounded-xl border border-white/30 px-3 py-2 text-sm font-semibold text-white"
                >
                  View Loans
                </button>
              </div>
            </div>
          </section>

          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {summaryCards.map((card) => (
              <div key={card.title} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
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

          <section className="grid gap-4 xl:grid-cols-5">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm xl:col-span-3">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-base font-semibold text-slate-900">6-Month Cashflow Trend</h2>
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

            <div className="space-y-4 xl:col-span-2">
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <h2 className="text-base font-semibold text-slate-900">Recovery Progress</h2>
                <div className="mt-4 flex items-center gap-4">
                  <div
                    className="flex h-20 w-20 items-center justify-center rounded-full"
                    style={{
                      background: `conic-gradient(rgb(16 185 129) ${progressAngle}deg, rgb(226 232 240) ${progressAngle}deg 360deg)`,
                    }}
                  >
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white text-sm font-semibold text-slate-900">
                      {metrics.recoveryRate}%
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Collection rate</p>
                    <p className="text-xs text-slate-500">{metrics.totalCollected.toLocaleString()} collected from {metrics.totalLent.toLocaleString()} lent</p>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="rounded-lg bg-slate-100 px-2 py-2 text-slate-600">Open<br /><span className="text-sm font-semibold text-slate-900">{metrics.openEntries}</span></div>
                  <div className="rounded-lg bg-amber-100 px-2 py-2 text-amber-700">Partial<br /><span className="text-sm font-semibold text-amber-900">{metrics.partialEntries}</span></div>
                  <div className="rounded-lg bg-emerald-100 px-2 py-2 text-emerald-700">Closed<br /><span className="text-sm font-semibold text-emerald-900">{metrics.closedEntries}</span></div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <h2 className="text-base font-semibold text-slate-900">Top Debtors</h2>
                <div className="mt-3 space-y-2">
                  {topDebtors.length === 0 ? (
                    <p className="text-sm text-slate-500">No debtor data yet.</p>
                  ) : (
                    topDebtors.map((debtor) => (
                      <div key={debtor.debtor_id} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
                        <div>
                          <p className="text-sm font-medium text-slate-900">{debtor.debtor_name}</p>
                          <p className="text-xs text-slate-500">{debtor.open_entries_count ?? 0} open entries</p>
                        </div>
                        <p className="text-sm font-semibold text-slate-900">{(debtor.total_owed ?? 0).toLocaleString()}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </section>

          <section className="grid gap-4 xl:grid-cols-5">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm xl:col-span-3">
              <h2 className="text-base font-semibold text-slate-900">Recent Entry Activity</h2>
              <div className="mt-3 space-y-2">
                {loading ? (
                  <p className="text-sm text-slate-500">Loading activity...</p>
                ) : latestEntries.length === 0 ? (
                  <p className="text-sm text-slate-500">No entries yet. Add your first entry to start tracking.</p>
                ) : (
                  latestEntries.map((entry) => (
                    <div key={entry.entry_id} className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-3">
                      <div>
                        <p className="text-sm font-medium text-slate-900">{entry.debtor_name}</p>
                        <p className="text-xs text-slate-500">{entry.lending_date} · {entry.entry_status}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-slate-900">{(entry.still_owed ?? entry.original_amount).toLocaleString()}</p>
                        <p className="text-xs text-slate-500">owed</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm xl:col-span-2">
              <h2 className="text-base font-semibold text-slate-900">Quick Actions</h2>
              <div className="mt-3 space-y-2">
                <button onClick={onGoDebtors} className="inline-flex w-full items-center justify-between rounded-xl bg-slate-900 px-3 py-3 text-sm font-medium text-white">
                  Manage Debtors <ArrowRight className="h-4 w-4" />
                </button>
                <button onClick={onGoEntries} className="inline-flex w-full items-center justify-between rounded-xl border border-slate-200 px-3 py-3 text-sm font-medium text-slate-700">
                  Manage Entries <ArrowRight className="h-4 w-4" />
                </button>
                <button onClick={onGoLoans} className="inline-flex w-full items-center justify-between rounded-xl border border-slate-200 px-3 py-3 text-sm font-medium text-slate-700">
                  Review Loans <ArrowRight className="h-4 w-4" />
                </button>
                <button onClick={onGoLanding} className="inline-flex w-full items-center justify-between rounded-xl border border-slate-200 px-3 py-3 text-sm font-medium text-slate-700">
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
