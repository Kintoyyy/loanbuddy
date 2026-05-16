import { Banknote, Home, ListChecks, LogOut, Settings, Sparkles, User, Users } from "lucide-react";

type SidebarKey = "dashboard" | "loans" | "debtors" | "entries" | "profile" | "settings";

interface AppSidebarProps {
  active: SidebarKey;
  onGoHome: () => void;
  onGoLoans: () => void;
  onGoDebtors: () => void;
  onGoEntries: () => void;
  onGoProfile: () => void;
  onGoSettings: () => void;
  onGoLanding: () => void;
  onLogout: () => void;
}

function navButtonClass(active: boolean): string {
  if (active) {
    return "flex w-full items-center gap-3 rounded-xl bg-slate-900 px-3 py-2.5 text-sm font-medium text-white";
  }

  return "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100";
}

function mobileNavButtonClass(active: boolean): string {
  if (active) {
    return "flex flex-1 flex-col items-center gap-1 rounded-xl bg-slate-900 px-2 py-2 text-[11px] font-medium text-white";
  }

  return "flex flex-1 flex-col items-center gap-1 rounded-xl px-2 py-2 text-[11px] font-medium text-slate-500";
}

function AppSidebar({
  active,
  onGoHome,
  onGoLoans,
  onGoDebtors,
  onGoEntries,
  onGoProfile,
  onGoSettings,
  onGoLanding,
  onLogout,
}: AppSidebarProps) {
  void onGoLanding;

  return (
    <>
      <aside className="fixed left-0 top-0 z-40 hidden h-screen w-64 border-r border-slate-200 bg-white md:block">
        <div className="flex h-16 items-center border-b border-slate-200 px-6">
          <span className="inline-flex items-center gap-2 text-xl font-bold text-slate-900">
            <Sparkles className="h-5 w-5 text-sky-600" />
            LoanBuddy
          </span>
        </div>
        <nav className="space-y-1 p-4">
          <button onClick={onGoHome} className={navButtonClass(active === "dashboard")}>
            <Home className="h-4 w-4" />
            Dashboard
          </button>
          <button onClick={onGoLoans} className={navButtonClass(active === "loans")}>
            <Banknote className="h-4 w-4" />
            Loans
          </button>
          <button onClick={onGoDebtors} className={navButtonClass(active === "debtors")}>
            <Users className="h-4 w-4" />
            Debtors
          </button>
          <button onClick={onGoEntries} className={navButtonClass(active === "entries")}>
            <ListChecks className="h-4 w-4" />
            Entries
          </button>
          <button onClick={onGoProfile} className={navButtonClass(active === "profile")}>
            <User className="h-4 w-4" />
            Profile
          </button>
          <button onClick={onGoSettings} className={navButtonClass(active === "settings")}>
            <Settings className="h-4 w-4" />
            Settings
          </button>
        </nav>
        <div className="absolute bottom-0 w-full border-t border-slate-200 p-4">
          <button
            onClick={onLogout}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </button>
        </div>
      </aside>

      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200 bg-white/95 p-2 backdrop-blur md:hidden">
        <div className="mx-auto flex max-w-xl items-center gap-1">
          <button onClick={onGoHome} className={mobileNavButtonClass(active === "dashboard")}>
            <Home className="h-4 w-4" />
            Home
          </button>
          <button onClick={onGoLoans} className={mobileNavButtonClass(active === "loans")}>
            <Banknote className="h-4 w-4" />
            Loans
          </button>
          <button onClick={onGoDebtors} className={mobileNavButtonClass(active === "debtors")}>
            <Users className="h-4 w-4" />
            Debtors
          </button>
          <button onClick={onGoEntries} className={mobileNavButtonClass(active === "entries")}>
            <ListChecks className="h-4 w-4" />
            Entries
          </button>
          <button onClick={onGoProfile} className={mobileNavButtonClass(active === "profile")}>
            <User className="h-4 w-4" />
            Profile
          </button>
          <button onClick={onGoSettings} className={mobileNavButtonClass(active === "settings")}>
            <Settings className="h-4 w-4" />
            Settings
          </button>
        </div>
      </nav>
    </>
  );
}

export default AppSidebar;
