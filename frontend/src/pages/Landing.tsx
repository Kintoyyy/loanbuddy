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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
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
      <main className="container mx-auto px-4 py-16">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 rounded-full border bg-white px-4 py-1.5 text-sm mb-6">
            <Sparkles className="h-4 w-4 text-yellow-500" />
            <span>Welcome to the future of web apps</span>
          </div>
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl mb-6">
            Build amazing products
            <span className="text-slate-900 block">with our platform</span>
          </h1>
          <p className="text-lg text-slate-600 mb-8 max-w-2xl mx-auto">
            A modern full-stack application with authentication, user profiles, and a beautiful dashboard. 
            Built with React, TypeScript, and Tailwind CSS.
          </p>
          
          {!isLoggedIn ? (
            <div className="flex items-center justify-center gap-4">
              <button
                onClick={onRegister}
                className="inline-flex items-center rounded-md bg-slate-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-slate-800"
              >
                <UserPlus className="mr-2 h-5 w-5" />
                Get Started Free
              </button>
              <button
                onClick={onLogin}
                className="inline-flex items-center rounded-md border border-slate-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                <LogIn className="mr-2 h-5 w-5" />
                Sign In
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-4">
              <button
                onClick={onDashboard}
                className="inline-flex items-center rounded-md bg-slate-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-slate-800"
              >
                <LayoutDashboard className="mr-2 h-5 w-5" />
                Go to Dashboard
              </button>
              <button
                onClick={onProfile}
                className="inline-flex items-center rounded-md border border-slate-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                <User className="mr-2 h-5 w-5" />
                View Profile
              </button>
            </div>
          )}
        </div>

        {/* Feature Cards */}
        <div className="grid gap-6 md:grid-cols-3 max-w-5xl mx-auto">
          <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 mb-2">
                <LogIn className="h-5 w-5 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold">Authentication</h3>
              <p className="mt-2 text-sm text-slate-600">
                Secure login and registration with JWT tokens and session management.
              </p>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 mb-2">
                <User className="h-5 w-5 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold">User Profiles</h3>
              <p className="mt-2 text-sm text-slate-600">
                Complete profile management with photo uploads and personal details.
              </p>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100 mb-2">
                <LayoutDashboard className="h-5 w-5 text-purple-600" />
              </div>
              <h3 className="text-lg font-semibold">Dashboard</h3>
              <p className="mt-2 text-sm text-slate-600">
                Beautiful admin dashboard with stats, charts, and activity tracking.
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