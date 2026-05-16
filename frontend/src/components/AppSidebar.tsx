import { Home, Banknote, Users, ListChecks, User, Settings, LogOut } from "lucide-react";

type SidebarKey = "dashboard" | "loans" | "debtors" | "entries" | "profile";

interface AppSidebarProps {
  active: SidebarKey;
  onGoHome: () => void;
  onGoLoans: () => void;
  onGoDebtors: () => void;
  onGoEntries: () => void;
  onGoProfile: () => void;
  onGoLanding: () => void;
  onLogout: () => void;
}

function navButtonClass(active: boolean): string {
  if (active) {
    return "flex w-full items-center gap-3 rounded-lg bg-gray-100 px-3 py-2 text-sm font-medium text-gray-900";
  }

  return "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100";
}

function AppSidebar({
  active,
  onGoHome,
  onGoLoans,
  onGoDebtors,
  onGoEntries,
  onGoProfile,
  onGoLanding,
  onLogout,
}: AppSidebarProps) {
  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 border-r bg-white">
      <div className="flex h-16 items-center border-b px-6">
        <span className="text-xl font-bold">Money Tracker</span>
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
        <button onClick={onGoProfile} className={navButtonClass(false)}>
          <Settings className="h-4 w-4" />
          Settings
        </button>
        <button
          onClick={onLogout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
        >
          <LogOut className="h-4 w-4" />
          Logout
        </button>
      </nav>
    </aside>
  );
}

export default AppSidebar;
