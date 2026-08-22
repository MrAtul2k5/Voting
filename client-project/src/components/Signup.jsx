import { useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import {
  FaArrowRight,
  FaEnvelope,
  FaLock,
  FaRocket,
  FaUserPlus,
  FaVoteYea,
} from "react-icons/fa";
import heroImage from "../assets/hero.png";

const Signup = ({ switchToLogin }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const API_URL = import.meta.env.VITE_API_URL?.replace(/\/$/, "") || "";

  const handleSignup = async (event) => {
    event?.preventDefault();
    if (!email || !password) return toast.error("Fill all fields", { id: "signup" });

    setLoading(true);
    try {
      await axios.post(`${API_URL}/api/auth/register`, { email, password });
      toast.success("Account created. You can log in now.", { id: "signup" });
      switchToLogin();
    } catch (err) {
      toast.error(err.response?.data?.message || "Registration failed", { id: "signup" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-grid min-h-screen bg-[#05070c]">
      <section className="relative hidden min-h-screen overflow-hidden border-r border-slate-800/80 bg-slate-950 lg:block">
        <img
          src={heroImage}
          alt="Voting dashboard visual"
          className="hero-art absolute inset-0 h-full w-full object-cover opacity-35 mix-blend-screen"
        />
        <div className="absolute inset-0 bg-[linear-gradient(240deg,rgba(5,7,12,0.88),rgba(5,7,12,0.48),rgba(5,7,12,0.94))]" />
        <div className="relative z-10 flex h-full flex-col justify-between p-12">
          <div className="flex items-center gap-3">
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

          <div className="max-w-lg">
            <div className="mb-4 inline-flex items-center gap-2 rounded-md border border-amber-300/25 bg-amber-300/10 px-3 py-2 text-xs font-semibold text-amber-100">
              <FaRocket />
              New workspace
            </div>
            <h2 className="text-5xl font-black leading-tight text-white">
              Build a sharper voting hub.
            </h2>
          </div>
        </div>
      </section>

      <section className="flex min-h-screen items-center px-5 py-8 sm:px-8 lg:px-14">
        <div className="mx-auto w-full max-w-md">
          <div className="mb-10 flex items-center gap-3 lg:hidden">
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
            <h2 className="text-4xl font-black leading-tight text-white sm:text-5xl">
              Create your account.
            </h2>
            <p className="mt-4 max-w-sm text-sm leading-6 text-slate-400">
              Start a private voting workspace with live polls, result boards,
              and a clean account area.
            </p>
          </div>

          <form onSubmit={handleSignup} className="space-y-4">
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
                  autoComplete="new-password"
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
              <FaUserPlus />
              {loading ? "Creating..." : "Create Account"}
              <FaArrowRight className="transition group-hover:translate-x-0.5" />
            </button>
          </form>

          <p className="mt-6 text-sm text-slate-400">
            Already have an account?{" "}
            <button
              type="button"
              className="font-semibold text-cyan-200 transition hover:text-white"
              onClick={switchToLogin}
            >
              Login
            </button>
          </p>
        </div>
      </section>
    </main>
  );
};

export default Signup;
