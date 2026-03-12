import { FormEvent, useState } from "react";
import { LogIn, Mail, Lock, ArrowLeft, UserPlus } from "lucide-react";
import { loginUser } from "../api";
import { saveAuthSession } from "../auth";

interface LoginProps {
  onSuccess: () => void;
  onGoRegister: () => void;
  onGoLanding: () => void;
}

function Login({ onSuccess, onGoRegister, onGoLanding }: LoginProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await loginUser({ email, password });
      saveAuthSession(response);
      onSuccess();
    } catch (requestError) {
      if (requestError instanceof Error) {
        setError(requestError.message);
      } else {
        setError("Login failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50/50 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-slate-900 mb-4">
            <LogIn className="h-6 w-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Welcome back</h1>
          <p className="text-slate-600 mt-2">
            Sign in to your account to continue
          </p>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="space-y-1 p-6 pb-3">
            <h2 className="text-xl font-semibold">Sign in</h2>
            <p className="text-sm text-slate-600">
              Enter your email and password below
            </p>
          </div>
          <form onSubmit={handleLogin}>
            <div className="space-y-4 p-6 pt-3">
              {error && (
                <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium text-slate-700">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <input
                    id="email"
                    type="email"
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 pl-10 text-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="password" className="text-sm font-medium text-slate-700">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <input
                    id="password"
                    type="password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 pl-10 text-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                    required
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-col space-y-4 p-6 pt-0">
              <button
                type="submit"
                className="inline-flex w-full items-center justify-center rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Signing in...
                  </>
                ) : (
                  <>
                    <LogIn className="mr-2 h-4 w-4" />
                    Sign in
                  </>
                )}
              </button>

              <div className="relative w-full">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-slate-200" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white px-2 text-slate-500">
                    Or continue with
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 w-full">
                <button
                  type="button"
                  onClick={onGoRegister}
                  className="inline-flex items-center justify-center rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  <UserPlus className="mr-2 h-4 w-4" />
                  Register
                </button>
                <button
                  type="button"
                  onClick={onGoLanding}
                  className="inline-flex items-center justify-center rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </button>
              </div>
            </div>
          </form>
        </div>

        <p className="text-center text-sm text-slate-600 mt-6">
          Don't have an account?{" "}
          <button
            onClick={onGoRegister}
            className="text-slate-900 underline-offset-4 hover:underline font-medium"
          >
            Create one now
          </button>
        </p>
      </div>
    </div>
  );
}

export default Login;
