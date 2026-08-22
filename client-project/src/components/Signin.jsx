import { useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import {
  FaArrowRight,
  FaEnvelope,
  FaLock,
  FaShieldAlt,
  FaSignInAlt,
  FaVoteYea,
} from "react-icons/fa";
import heroImage from "../assets/hero.png";

const Signin = ({ onLogin, switchToSignup }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const API_URL = import.meta.env.VITE_API_URL?.replace(/\/$/, "") || "";

  const handleLogin = async (event) => {
    event?.preventDefault();
    if (!email || !password) return toast.error("Enter all fields", { id: "login" });

    setLoading(true);
    try {
      const res = await axios.post(`${API_URL}/api/auth/login`, {
        email,
        password,
      });

      onLogin(res.data.user);
      toast.success("Welcome back", { id: "login" });
    } catch (err) {
      toast.error(err.response?.data?.message || "Login failed", { id: "login" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-grid min-h-screen bg-[#05070c]">
      <section className="flex min-h-screen items-center px-5 py-8 sm:px-8 lg:px-14">
        <div className="mx-auto w-full max-w-md">
          <div className="mb-10 flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-lg border border-cyan-300/25 bg-cyan-300/10 text-cyan-200">
              <FaVoteYea />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.32em] text-cyan-200/80">
                VoteOps
              </p>
              <h1 className="text-xl font-bold text-white">Decision Console</h1>
            </div>
          </div>

          <div className="mb-8">
            <div className="mb-4 inline-flex items-center gap-2 rounded-md border border-slate-700/80 bg-slate-900/70 px-3 py-2 text-xs font-medium text-slate-300">
              <FaShieldAlt className="text-emerald-300" />
              Secure access
            </div>
            <h2 className="text-4xl font-black leading-tight text-white sm:text-5xl">
              Sign in to your voting workspace.
            </h2>
            <p className="mt-4 max-w-sm text-sm leading-6 text-slate-400">
              Manage live polls, view results, and keep team decisions moving from
              one dark command center.
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <label className="block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                Email
              </span>
              <span className="relative block">
                <FaEnvelope className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  value={email}
                  type="email"
                  autoComplete="email"
                  className="h-12 w-full rounded-lg border border-slate-800 bg-slate-950/80 pl-11 pr-4 text-sm text-white outline-none transition focus:border-cyan-300/70 focus:ring-2 focus:ring-cyan-300/10"
                  placeholder="you@example.com"
                  onChange={(e) => setEmail(e.target.value)}
                />
              </span>
            </label>

            <label className="block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                Password
              </span>
              <span className="relative block">
                <FaLock className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  value={password}
                  type="password"
                  autoComplete="current-password"
                  className="h-12 w-full rounded-lg border border-slate-800 bg-slate-950/80 pl-11 pr-4 text-sm text-white outline-none transition focus:border-cyan-300/70 focus:ring-2 focus:ring-cyan-300/10"
                  placeholder="Password"
                  onChange={(e) => setPassword(e.target.value)}
                />
              </span>
            </label>

            <button
              type="submit"
              disabled={loading}
              className="group inline-flex h-12 w-full items-center justify-center gap-3 rounded-lg bg-cyan-300 px-5 text-sm font-black text-slate-950 transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <FaSignInAlt />
              {loading ? "Checking..." : "Login"}
              <FaArrowRight className="transition group-hover:translate-x-0.5" />
            </button>
          </form>

          <p className="mt-6 text-sm text-slate-400">
            New here?{" "}
            <button
              type="button"
              className="font-semibold text-cyan-200 transition hover:text-white"
              onClick={switchToSignup}
            >
              Create account
            </button>
          </p>
        </div>
      </section>

      <section className="relative hidden min-h-screen overflow-hidden border-l border-slate-800/80 bg-slate-950 lg:block">
        <img
          src={heroImage}
          alt="Voting dashboard visual"
          className="absolute inset-0 h-full w-full object-cover opacity-35 mix-blend-screen"
        />
        <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(5,7,12,0.88),rgba(5,7,12,0.42),rgba(5,7,12,0.92))]" />
        <div className="relative z-10 flex h-full flex-col justify-end p-12">
          <div className="grid max-w-xl grid-cols-3 gap-3">
            {[
              ["Live", "Ballots"],
              ["Clean", "Results"],
              ["Fast", "Launch"],
            ].map(([value, label]) => (
              <div
                key={label}
                className="rounded-lg border border-white/10 bg-white/[0.04] p-4 backdrop-blur"
              >
                <p className="text-2xl font-black text-white">{value}</p>
                <p className="mt-1 text-xs uppercase tracking-[0.22em] text-slate-400">
                  {label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
};

export default Signin;
