import { Sparkles, LogIn, UserPlus, LayoutDashboard, User, TrendingUp, Users, FileText, AlertCircle, CheckCircle, BarChart3, PieChart, Calendar } from "lucide-react";

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
    <div className="min-h-screen bg-slate-50">
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

      <main>
        {/* Hero Section */}
        <section className="container mx-auto px-4 py-16 max-w-6xl">
          <div className="flex flex-col-reverse lg:flex-row items-center gap-12">
            <div className="w-full lg:w-1/2 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 rounded-full border bg-white px-4 py-1.5 text-sm mb-6">
                <Sparkles className="h-4 w-4 text-yellow-500" />
                <span>Smart loan tracking for friends</span>
              </div>

              <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl mb-6">
                Never lose track of money you've lent.
              </h1>
              <p className="text-lg text-slate-600 mb-8 max-w-xl mx-auto lg:mx-0">
                LoanBuddy helps you track loans to friends with crystal clarity. Record payments, set due dates, calculate interest, and manage repayments all in one place.
              </p>

              <div className="flex flex-col sm:flex-row items-center sm:items-start justify-center lg:justify-start gap-4">
                <button
                  onClick={onRegister}
                  className="inline-flex items-center justify-center rounded-lg bg-slate-900 px-6 py-3 text-base font-semibold text-white shadow hover:bg-slate-800 transition"
                >
                  <UserPlus className="mr-2 h-5 w-5" />
                  Start Free
                </button>

                <button
                  onClick={onLogin}
                  className="inline-flex items-center justify-center rounded-lg border-2 border-slate-900 bg-white px-6 py-3 text-base font-semibold text-slate-900 hover:bg-slate-50 transition"
                >
                  <LogIn className="mr-2 h-5 w-5" />
                  Sign In
                </button>
              </div>
            </div>

            {/* Stats Preview */}
            <div className="w-full lg:w-1/2 flex justify-center">
              <div className="w-full max-w-sm space-y-4">
                <div className="rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 text-white p-6 shadow-xl">
                  <div className="text-sm font-semibold opacity-80 mb-2">PORTFOLIO OVERVIEW</div>
                  <div className="text-4xl font-bold mb-2">₱1,000</div>
                  <div className="text-sm opacity-75">Outstanding balance across 1 active entries</div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="text-xs font-semibold text-slate-500 mb-2">Outstanding</div>
                    <div className="text-2xl font-bold text-red-600">₱1,000</div>
                    <div className="text-xs text-slate-500 mt-1">Still owed</div>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="text-xs font-semibold text-slate-500 mb-2">Collected</div>
                    <div className="text-2xl font-bold text-green-600">₱500</div>
                    <div className="text-xs text-slate-500 mt-1">Recovered amount</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Feature Grid */}
        <section className="bg-white border-y py-16">
          <div className="container mx-auto px-4 max-w-6xl">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-4">Powerful Features</h2>
              <p className="text-lg text-slate-600">Everything you need to manage loans effectively</p>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {/* Feature 1 */}
              <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md transition">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 mb-4">
                  <FileText className="h-5 w-5 text-blue-600" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Quick Loan Creation</h3>
                <p className="text-sm text-slate-600">
                  Add loans instantly with borrower name, amount, and due date. Optional: set interest rates and payment schedules.
                </p>
              </div>

              {/* Feature 2 */}
              <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md transition">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-50 mb-4">
                  <TrendingUp className="h-5 w-5 text-green-600" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Track Payments</h3>
                <p className="text-sm text-slate-600">
                  Record every payment, calculate interest, and monitor repayment progress with visual indicators.
                </p>
              </div>

              {/* Feature 3 */}
              <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md transition">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-50 mb-4">
                  <Users className="h-5 w-5 text-purple-600" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Debtor Management</h3>
                <p className="text-sm text-slate-600">
                  Keep tabs on all your debtors and see their total outstanding balance at a glance.
                </p>
              </div>

              {/* Feature 4 */}
              <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md transition">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50 mb-4">
                  <BarChart3 className="h-5 w-5 text-amber-600" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Analytics Dashboard</h3>
                <p className="text-sm text-slate-600">
                  View 6-month cashflow, recovery progress, and collection rates with intuitive charts.
                </p>
              </div>

              {/* Feature 5 */}
              <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md transition">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-50 mb-4">
                  <AlertCircle className="h-5 w-5 text-red-600" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Smart Penalties</h3>
                <p className="text-sm text-slate-600">
                  Set up overdue penalties and monthly interest rates to encourage timely repayment.
                </p>
              </div>

              {/* Feature 6 */}
              <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md transition">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-50 mb-4">
                  <CheckCircle className="h-5 w-5 text-cyan-600" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Digital Agreements</h3>
                <p className="text-sm text-slate-600">
                  Create and collect borrower signatures on loan agreements directly in the app.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Entry Management Section */}
        <section className="py-16">
          <div className="container mx-auto px-4 max-w-6xl">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-4">Entry Tracking</h2>
              <p className="text-lg text-slate-600">Log detailed payment entries for complete transparency</p>
            </div>

            <div className="grid md:grid-cols-2 gap-8 items-center">
              <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="text-xl font-semibold mb-4">Individual Entries</h3>
                <ul className="space-y-3">
                  <li className="flex gap-3 items-start">
                    <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span className="text-slate-700">Log each loan as a separate entry</span>
                  </li>
                  <li className="flex gap-3 items-start">
                    <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span className="text-slate-700">Track collection status per entry</span>
                  </li>
                  <li className="flex gap-3 items-start">
                    <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span className="text-slate-700">View collection rate and breakdown</span>
                  </li>
                  <li className="flex gap-3 items-start">
                    <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span className="text-slate-700">See overdue status and warnings</span>
                  </li>
                </ul>
              </div>

              <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
                <div className="space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-yellow-100 flex items-center justify-center text-lg font-bold">S</div>
                      <div>
                        <div className="font-medium">Sasay</div>
                        <div className="text-xs text-slate-500">Partially Collected</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold">₱1,500</div>
                      <div className="text-xs text-red-600">₱1,000 owed</div>
                    </div>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2">
                    <div className="bg-cyan-500 h-2 rounded-full" style={{ width: '33%' }}></div>
                  </div>
                  <div className="text-xs text-slate-500">33% collected</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Loan Details Section */}
        <section className="bg-white border-y py-16">
          <div className="container mx-auto px-4 max-w-6xl">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-4">Comprehensive Loan Details</h2>
              <p className="text-lg text-slate-600">All information in one organized view</p>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
                <div className="text-xs font-semibold text-slate-500 mb-2">PRINCIPAL</div>
                <div className="text-3xl font-bold text-slate-900 mb-1">₱200.00</div>
                <div className="text-sm text-slate-600">Total due: ₱204.00</div>
              </div>

              <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
                <div className="text-xs font-semibold text-green-600 mb-2">PAID</div>
                <div className="text-3xl font-bold text-green-600 mb-1">₱100.00</div>
                <div className="text-sm text-slate-600">Payment received</div>
              </div>

              <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
                <div className="text-xs font-semibold text-red-600 mb-2">REMAINING</div>
                <div className="text-3xl font-bold text-red-600 mb-1">₱104.00</div>
                <div className="text-sm text-slate-600">Amount outstanding</div>
              </div>
            </div>

            <div className="mt-8 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="font-semibold mb-4">Loan Details</h3>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <div className="text-xs font-semibold text-slate-500 mb-1">Date Lent</div>
                  <div className="text-sm text-slate-900">May 16, 2026</div>
                </div>
                <div>
                  <div className="text-xs font-semibold text-slate-500 mb-1">Due Date</div>
                  <div className="text-sm text-slate-900">May 24, 2026</div>
                </div>
                <div>
                  <div className="text-xs font-semibold text-slate-500 mb-1">Payment Schedule</div>
                  <div className="text-sm text-slate-900">Weekly</div>
                </div>
                <div>
                  <div className="text-xs font-semibold text-slate-500 mb-1">Status</div>
                  <div className="inline-block px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800">Active</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16">
          <div className="container mx-auto px-4 max-w-4xl text-center">
            <h2 className="text-4xl font-bold mb-4">Ready to take control?</h2>
            <p className="text-xl text-slate-600 mb-8">
              Start tracking your loans today with LoanBuddy. Free to use, simple to manage.
            </p>
            <button
              onClick={onRegister}
              className="inline-flex items-center justify-center rounded-lg bg-slate-900 px-8 py-4 text-lg font-semibold text-white shadow hover:bg-slate-800 transition"
            >
              <UserPlus className="mr-2 h-6 w-6" />
              Create Your Account
            </button>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t bg-white">
        <div className="container mx-auto px-4 py-8 text-center text-sm text-slate-600">
          <p>LoanBuddy © 2026. Track loans, build trust. Built with React, TypeScript, and Tailwind CSS</p>
        </div>
      </footer>
    </div>
  );
}

export default Landing;