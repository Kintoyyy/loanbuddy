import { useEffect, useState } from "react";
import { clearAuth, isAuthenticated, subscribeToAuthChanges } from "./auth";
import Dashboard from "./pages/Dashboard";
import Landing from "./pages/Landing";
import Loans from "./pages/Loans";
import Login from "./pages/Login";
import Profile from "./pages/Profile";
import Register from "./pages/Register";

type AppPage = "landing" | "login" | "register" | "dashboard" | "profile" | "loans";

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(isAuthenticated());
  const [page, setPage] = useState<AppPage>(isLoggedIn ? "dashboard" : "landing");

  useEffect(() => {
    return subscribeToAuthChanges(() => {
      setIsLoggedIn(isAuthenticated());
    });
  }, []);

  useEffect(() => {
    if (!isLoggedIn && (page === "dashboard" || page === "profile" || page === "loans")) {
      setPage("login");
    }
  }, [isLoggedIn, page]);

  const handleLogout = () => {
    clearAuth();
    setPage("landing");
  };

  if (page === "landing") {
    return (
      <Landing
        isLoggedIn={isLoggedIn}
        onLogin={() => setPage("login")}
        onRegister={() => setPage("register")}
        onDashboard={() => setPage(isLoggedIn ? "dashboard" : "login")}
        onProfile={() => setPage(isLoggedIn ? "profile" : "login")}
        onLogout={handleLogout}
      />
    );
  }

  if (page === "login") {
    return (
      <Login
        onSuccess={() => setPage("dashboard")}
        onGoRegister={() => setPage("register")}
        onGoLanding={() => setPage("landing")}
      />
    );
  }

  if (page === "register") {
    return <Register onGoLogin={() => setPage("login")} onGoLanding={() => setPage("landing")} />;
  }

  if (page === "profile") {
    return <Profile onBackHome={() => setPage("dashboard")} onLogout={handleLogout} />;
  }

  if (page === "loans") {
    return (
      <Loans
        onGoHome={() => setPage("dashboard")}
        onGoProfile={() => setPage("profile")}
        onLogout={handleLogout}
        onGoLanding={() => setPage("landing")}
      />
    );
  }

  return <Dashboard onGoProfile={() => setPage("profile")} onGoLoans={() => setPage("loans")} onLogout={handleLogout} onGoLanding={() => setPage("landing")} />;
}

export default App;
