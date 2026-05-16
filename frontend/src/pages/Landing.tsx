import { Sparkles, LogIn, UserPlus, LayoutDashboard, User } from "lucide-react";

interface LandingProps {
  isLoggedIn: boolean;
  onLogin: () => void;
  onRegister: () => void;
  onDashboard: () => void;
  onProfile: () => void;
  onLogout: () => void;
}

function Landing({ isLoggedIn, onLogin, onRegister, onDashboard, onProfile, onLogout }: LandingProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-sky-50">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <span className="text-lg font-bold">LoanBuddy</span>
          </div>
          <nav className="flex items-center gap-2">
            {!isLoggedIn ? (
              <>
                <button
                  onClick={onLogin}
                  className="rounded-md px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
                >
                  Sign in
                </button>
                <button
                  onClick={onRegister}
                  className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800"
                >
                  Get Started
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={onDashboard}
                  className="rounded-md px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
                >
                  Dashboard
                </button>
                <button
                  onClick={onLogout}
                  className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Logout
                </button>
              </>
            )}
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <main className="container mx-auto px-4 py-12">
        <div className="flex flex-col-reverse lg:flex-row items-center gap-12 max-w-6xl mx-auto">
          <div className="w-full lg:w-1/2 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 rounded-full border bg-white px-4 py-1.5 text-sm mb-4">
              <Sparkles className="h-4 w-4 text-yellow-500" />
              <span>Made for tracking money friends owe you</span>
            </div>

            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl mb-4">
              Keep track of loans to friends — effortlessly.
            </h1>
            <p className="text-lg text-slate-600 mb-6 max-w-xl mx-auto lg:mx-0">
              LoanBuddy helps you record who owes you, when payments are due, and send gentle reminders. Built
              primarily as a mobile app so you can manage loans on the go.
            </p>

            <div className="flex flex-col sm:flex-row items-center sm:items-start justify-center lg:justify-start gap-3">
              <a
                href="#"
                className="inline-flex items-center justify-center rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white shadow hover:bg-slate-800"
                onClick={(e) => { e.preventDefault(); onRegister(); }}
              >
                <UserPlus className="mr-2 h-5 w-5" />
                Get the App
              </a>

              <div className="flex gap-2">
                <a href="#" className="inline-flex items-center gap-2 rounded-md bg-white px-3 py-2 text-sm border shadow-sm">
                  <svg className="h-4 w-4 text-slate-700" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                    <path d="M12 2a10 10 0 100 20 10 10 0 000-20z" />
                  </svg>
                  App Store
                </a>
                <a href="#" className="inline-flex items-center gap-2 rounded-md bg-white px-3 py-2 text-sm border shadow-sm">
                  <svg className="h-4 w-4 text-slate-700" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                    <path d="M12 2a10 10 0 100 20 10 10 0 000-20z" />
                  </svg>
                  Google Play
                </a>
              </div>
            </div>

            <div className="mt-8 hidden sm:block max-w-md">
              <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                <h4 className="text-sm font-medium text-slate-700">Quick snapshot</h4>
                <ul className="mt-3 space-y-2 text-sm text-slate-600">
                  <li>• Alice owes you $25 — due Jun 1</li>
                  <li>• Bob repaid $40 of $100</li>
                  <li>• Reminders sent automatically</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Mobile mockup */}
          <div className="w-full lg:w-1/2 flex justify-center">
            <div className="relative">
              <div className="w-64 h-128 sm:w-72 sm:h-[520px] rounded-3xl bg-gradient-to-b from-white to-slate-50 border border-slate-200 shadow-2xl p-4">
                <div className="h-full overflow-hidden rounded-2xl bg-gradient-to-b from-slate-50 to-white">
                  <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                    <span className="text-sm font-semibold">LoanBuddy</span>
                    <span className="text-xs text-slate-400">Today</span>
                  </div>
                  <div className="p-3 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-medium">Alice</div>
                        <div className="text-xs text-slate-500">Lunch — 2 days ago</div>
                      </div>
                      <div className="text-sm font-semibold">$25</div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-medium">Bob</div>
                        <div className="text-xs text-slate-500">Concert ticket</div>
                      </div>
                      <div className="text-sm font-semibold">$60</div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-medium">Charlie</div>
                        <div className="text-xs text-slate-500">Partial payment</div>
                      </div>
                      <div className="text-sm font-semibold text-green-600">$40</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Feature Cards */}
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 max-w-6xl mx-auto">
          <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 mb-2">
                <LogIn className="h-5 w-5 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold">Simple tracking</h3>
              <p className="mt-2 text-sm text-slate-600">
                Quickly add loans, amounts, and due dates — no complicated setup.
              </p>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-50 mb-2">
                <User className="h-5 w-5 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold">Shared history</h3>
              <p className="mt-2 text-sm text-slate-600">
                See repayment history per friend and keep transparent records.
              </p>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-50 mb-2">
                <LayoutDashboard className="h-5 w-5 text-purple-600" />
              </div>
              <h3 className="text-lg font-semibold">Reminders & totals</h3>
              <p className="mt-2 text-sm text-slate-600">
                Automated reminders and an overview of total outstanding amounts.
              </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t bg-white mt-16">
        <div className="container mx-auto px-4 py-8 text-center text-sm text-slate-600">
          <p>Built with React, TypeScript, and Tailwind CSS</p>
        </div>
      </footer>
    </div>
  );
}

export default Landing;