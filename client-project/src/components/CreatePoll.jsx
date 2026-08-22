import { useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import {
  FaCheck,
  FaPlus,
  FaRegClock,
  FaTimes,
  FaVoteYea,
} from "react-icons/fa";

const createMinDateTime = () => {
  const pad = (value) => String(value).padStart(2, "0");
  const date = new Date();
  date.setMinutes(date.getMinutes() + 1);
  date.setSeconds(0, 0);

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate()
  )}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

export default function CreatePoll({ refreshPolls, onClose }) {
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", ""]);
  const [expiryTime, setExpiryTime] = useState("");
  const [minDateTime] = useState(createMinDateTime);
  const [loading, setLoading] = useState(false);
  const API_URL = import.meta.env.VITE_API_URL?.replace(/\/$/, "") || "";

  const handleSubmit = async (event) => {
    event?.preventDefault();
    if (!question.trim() || options.some((o) => !o.trim()) || !expiryTime) {
      return toast.error("Fill all fields");
    }

    if (new Date() >= new Date(expiryTime)) {
      return toast.error("End time must be in the future");
    }

    try {
      setLoading(true);
      await axios.post(`${API_URL}/api/polls`, {
        question: question.trim(),
        options: options.map((option) => option.trim()),
        expiryTime,
      });

      toast.success("Poll created");
      setQuestion("");
      setOptions(["", ""]);
      setExpiryTime("");
      refreshPolls?.();
      onClose?.();
    } catch (err) {
      toast.error(err.response?.data?.message || "Error creating poll");
    } finally {
      setLoading(false);
    }
  };

  const addOption = () => {
    if (options.length >= 4) return toast.error("Max 4 options allowed");
    setOptions([...options, ""]);
  };

  const removeOption = (i) => {
    if (options.length <= 2) return;
    setOptions(options.filter((_, idx) => idx !== i));
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full rounded-lg border border-slate-800 bg-slate-950/72 p-5 shadow-2xl shadow-black/20 sm:p-6"
    >
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="mb-3 inline-flex items-center gap-2 rounded-md border border-emerald-300/25 bg-emerald-300/10 px-3 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-100">
            <FaVoteYea />
            New poll
          </div>
          <h2 className="text-2xl font-black text-white">Launch a decision</h2>
          <p className="mt-2 max-w-xl text-sm leading-6 text-slate-400">
            Create a clear question, add up to four choices, and set the close
            time.
          </p>
        </div>

        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close create poll"
            className="grid h-10 w-10 place-items-center rounded-lg border border-slate-800 bg-slate-900 text-slate-400 transition hover:border-rose-300/40 hover:text-rose-200"
          >
            <FaTimes />
          </button>
        )}
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.08fr_0.92fr]">
        <section className="space-y-5">
          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              Question
            </span>
            <textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="What should the team decide?"
              rows={5}
              className="w-full resize-none rounded-lg border border-slate-800 bg-[#070a12] p-4 text-sm leading-6 text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-300/70 focus:ring-2 focus:ring-cyan-300/10"
            />
          </label>

          <label className="block">
            <span className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              <FaRegClock className="text-amber-200" />
              Close time
            </span>
            <input
              type="datetime-local"
              min={minDateTime}
              value={expiryTime}
              onChange={(e) => setExpiryTime(e.target.value)}
              className="h-12 w-full rounded-lg border border-slate-800 bg-[#070a12] px-4 text-sm text-white outline-none transition [color-scheme:dark] focus:border-cyan-300/70 focus:ring-2 focus:ring-cyan-300/10"
            />
          </label>
        </section>

        <section className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              Options
            </span>
            <button
              type="button"
              onClick={addOption}
              className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-3 text-xs font-bold text-slate-200 transition hover:border-cyan-300/60 hover:text-cyan-100"
            >
              <FaPlus />
              Add
            </button>
          </div>

          {options.map((opt, i) => (
            <div key={i} className="flex gap-3">
              <label className="min-w-0 flex-1">
                <span className="sr-only">Option {i + 1}</span>
                <input
                  value={opt}
                  onChange={(e) => {
                    const newOpts = [...options];
                    newOpts[i] = e.target.value;
                    setOptions(newOpts);
                  }}
                  placeholder={`Option ${i + 1}`}
                  className="h-12 w-full rounded-lg border border-slate-800 bg-[#070a12] px-4 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-300/70 focus:ring-2 focus:ring-cyan-300/10"
                />
              </label>
              <button
                type="button"
                aria-label={`Remove option ${i + 1}`}
                onClick={() => removeOption(i)}
                disabled={options.length <= 2}
                className="grid h-12 w-12 shrink-0 place-items-center rounded-lg border border-slate-800 bg-slate-900 text-slate-500 transition hover:border-rose-300/40 hover:text-rose-200 disabled:cursor-not-allowed disabled:opacity-35"
              >
                <FaTimes />
              </button>
            </div>
          ))}

          <button
            type="submit"
            disabled={loading}
            className="inline-flex h-12 w-full items-center justify-center gap-3 rounded-lg bg-emerald-300 px-5 text-sm font-black text-slate-950 transition hover:bg-emerald-200 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <FaCheck />
            {loading ? "Launching..." : "Launch Poll"}
          </button>
        </section>
      </div>
    </form>
  );
}
