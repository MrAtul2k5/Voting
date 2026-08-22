import { useState } from "react";
import { Toaster } from "react-hot-toast";
import Signin from "./components/Signin.jsx";
import Signup from "./components/Signup.jsx";
import PollList from "./components/PollList.jsx";

function App() {
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(sessionStorage.getItem("user")) || null;
    } catch {
      return null;
    }
  });
  const [view, setView] = useState("login");

  const handleLogin = (userData) => {
    sessionStorage.setItem("user", JSON.stringify(userData));
    setUser(userData);
  };

  const handleLogout = () => {
    sessionStorage.clear();
    setUser(null);
    setView("login");
  };

  return (
    <div className="min-h-screen bg-[#05070c] text-slate-100 antialiased selection:bg-cyan-300/25 selection:text-white">
      <Toaster
        position="top-center"
        toastOptions={{
          style: {
            background: "#0f172a",
            border: "1px solid rgba(148, 163, 184, 0.22)",
            color: "#e2e8f0",
          },
        }}
      />

      {!user ? (
        view === "login" ? (
          <Signin
            onLogin={handleLogin}
            switchToSignup={() => setView("signup")}
          />
        ) : (
          <Signup switchToLogin={() => setView("login")} />
        )
      ) : (
        <PollList user={user} onLogout={handleLogout} />
      )}
    </div>
  );
}

export default App;
