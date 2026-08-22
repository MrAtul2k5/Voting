import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import {
  FaBolt,
  FaChartBar,
  FaChartLine,
  FaCheckCircle,
  FaClock,
  FaCrown,
  FaFilter,
  FaLayerGroup,
  FaListUl,
  FaPlus,
  FaSearch,
  FaSignOutAlt,
  FaSyncAlt,
  FaTrophy,
  FaUserCircle,
  FaUsers,
  FaVoteYea,
} from "react-icons/fa";
import CreatePoll from "./CreatePoll";
import heroImage from "../assets/hero.png";

const PAGE_IDS = ["overview", "polls", "create", "results", "account"];

const navItems = [
  { id: "overview", label: "Overview", icon: FaChartLine },
  { id: "polls", label: "Live Polls", icon: FaListUl },
  { id: "create", label: "Create Poll", icon: FaPlus },
  { id: "results", label: "Results", icon: FaTrophy },
  { id: "account", label: "Account", icon: FaUserCircle },
];

const pageCopy = {
  overview: {
    eyebrow: "Command center",
    title: "Voting operations dashboard",
    description: "Track active decisions, participation, and outcomes in one place.",
  },
  polls: {
    eyebrow: "Ballot room",
    title: "Live polls",
    description: "Vote, monitor countdowns, and compare active or closed polls.",
  },
  create: {
    eyebrow: "Launch desk",
    title: "Create a poll",
    description: "Publish a new decision flow with timed voting windows.",
  },
  results: {
    eyebrow: "Results board",
    title: "Outcome analytics",
    description: "Review winners, vote splits, and completed decision history.",
  },
  account: {
    eyebrow: "Workspace",
    title: "Account console",
    description: "Review your session, local vote ledger, and workspace controls.",
  },
};

const filterOptions = [
  { id: "all", label: "All" },
  { id: "active", label: "Active" },
  { id: "expired", label: "Closed" },
];

const getInitialPage = () => {
  const hash = window.location.hash.replace("#", "");
  return PAGE_IDS.includes(hash) ? hash : "overview";
};

const readStoredVotes = () => {
  try {
    return JSON.parse(localStorage.getItem("votes")) || {};
  } catch {
    return {};
  }
};

const formatDateTime = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "No date";
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

const formatTimeLeft = (expiryTime, now) => {
  const expiresAt = new Date(expiryTime).getTime();
  if (Number.isNaN(expiresAt)) return "No timer";

  const diff = expiresAt - now;
  if (diff <= 0) return "Closed";

  const days = Math.floor(diff / 86_400_000);
  const hours = Math.floor((diff / 3_600_000) % 24);
  const minutes = Math.floor((diff / 60_000) % 60);
  const seconds = Math.floor((diff / 1_000) % 60);

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m ${seconds}s`;
};

const getWinnerText = (poll) => {
  if (!poll.totalVotes) return "No votes cast";

  const max = Math.max(...poll.options.map((option) => Number(option.votes || 0)));
  const winners = poll.options.filter((option) => Number(option.votes || 0) === max);
  return winners.length > 1 ? "Draw" : winners[0].text;
};

export default function PollList({ user, onLogout }) {
  const [polls, setPolls] = useState([]);
  const [loadingPolls, setLoadingPolls] = useState(true);
  const [now, setNow] = useState(0);
  const [activePage, setActivePage] = useState(getInitialPage);
  const [pollFilter, setPollFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [storedVotes, setStoredVotes] = useState(readStoredVotes);
  const API_URL = import.meta.env.VITE_API_URL?.replace(/\/$/, "") || "";

  const fetchPolls = useCallback(async () => {
    try {
      setLoadingPolls(true);
      const res = await axios.get(`${API_URL}/api/polls`);
      setPolls(Array.isArray(res.data) ? res.data : []);
    } catch {
      toast.error("Failed to load polls");
    } finally {
      setLoadingPolls(false);
    }
  }, [API_URL]);

  useEffect(() => {
    const onHashChange = () => setActivePage(getInitialPage());
    window.addEventListener("hashchange", onHashChange);
    window.addEventListener("popstate", onHashChange);
    return () => {
      window.removeEventListener("hashchange", onHashChange);
      window.removeEventListener("popstate", onHashChange);
    };
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      fetchPolls();
    }, 0);

    return () => window.clearTimeout(timeout);
  }, [fetchPolls]);

  useEffect(() => {
    const tick = () => setNow(Date.now());
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, []);

  const navigate = (pageId) => {
    if (!PAGE_IDS.includes(pageId)) return;
    setActivePage(pageId);
    window.history.pushState(null, "", `#${pageId}`);
  };

  const enrichedPolls = useMemo(
    () =>
      polls.map((poll) => {
        const options = Array.isArray(poll.options) ? poll.options : [];
        const totalVotes = options.reduce(
          (acc, option) => acc + Number(option.votes || 0),
          0
        );
        const expiresAt = new Date(poll.expiryTime).getTime();
        const expired = Number.isNaN(expiresAt) ? false : expiresAt <= now;

        return {
          ...poll,
          options,
          totalVotes,
          expired,
          userVote: storedVotes[poll._id],
        };
      }),
    [polls, storedVotes, now]
  );

  const stats = useMemo(() => {
    const active = enrichedPolls.filter((poll) => !poll.expired).length;
    const closed = enrichedPolls.length - active;
    const totalVotes = enrichedPolls.reduce((acc, poll) => acc + poll.totalVotes, 0);
    const votedPolls = enrichedPolls.filter((poll) => poll.userVote !== undefined).length;

    return {
      active,
      closed,
      totalPolls: enrichedPolls.length,
      totalVotes,
      votedPolls,
    };
  }, [enrichedPolls]);

  const featuredPoll = useMemo(() => {
    return [...enrichedPolls]
      .filter((poll) => !poll.expired)
      .sort((a, b) => b.totalVotes - a.totalVotes)[0];
  }, [enrichedPolls]);

  const closingSoonPolls = useMemo(() => {
    return [...enrichedPolls]
      .filter((poll) => !poll.expired)
      .sort((a, b) => new Date(a.expiryTime) - new Date(b.expiryTime))
      .slice(0, 4);
  }, [enrichedPolls]);

  const searchedPolls = useMemo(() => {
    const search = query.trim().toLowerCase();
    return enrichedPolls.filter((poll) => {
      const matchesFilter =
        pollFilter === "all" ||
        (pollFilter === "active" && !poll.expired) ||
        (pollFilter === "expired" && poll.expired);

      const searchable = [
        poll.question,
        ...poll.options.map((option) => option.text),
      ]
        .join(" ")
        .toLowerCase();

      return matchesFilter && (!search || searchable.includes(search));
    });
  }, [enrichedPolls, pollFilter, query]);

  const resultPolls = useMemo(
    () => enrichedPolls.filter((poll) => poll.expired || poll.totalVotes > 0),
    [enrichedPolls]
  );

  const voteHistory = useMemo(
    () => enrichedPolls.filter((poll) => poll.userVote !== undefined),
    [enrichedPolls]
  );

  const vote = async (pollId, index, expired) => {
    if (expired) return toast.error("Poll closed");
    if (storedVotes[pollId] !== undefined) return toast.error("Already voted");

    try {
      await axios.post(`${API_URL}/api/polls/${pollId}/vote`, {
        optionIndex: index,
        userId: user.id,
      });

      const updatedVotes = { ...storedVotes, [pollId]: index };
      setStoredVotes(updatedVotes);
      localStorage.setItem("votes", JSON.stringify(updatedVotes));
      toast.success("Vote submitted");
      fetchPolls();
    } catch (err) {
      toast.error(err.response?.data?.message || "Voting failed");
    }
  };

  const clearLocalVotes = () => {
    localStorage.removeItem("votes");
    setStoredVotes({});
    toast.success("Local vote history cleared");
  };

  const copy = pageCopy[activePage] || pageCopy.overview;

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#05070c] text-slate-100">
      <div className="app-grid-bg" />

      <div className="relative z-10 grid min-h-screen lg:grid-cols-[280px_1fr]">
        <aside className="border-b border-slate-800/80 bg-slate-950/76 backdrop-blur-xl lg:border-b-0 lg:border-r">
          <div className="sticky top-0 flex h-full flex-col gap-6 p-4 lg:min-h-screen lg:p-5">
            <div className="flex items-center gap-3 px-1">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-lg border border-cyan-300/25 bg-cyan-300/10 text-cyan-200">
                <FaVoteYea />
              </div>
              <div className="min-w-0">
                <p className="truncate text-xs font-semibold uppercase tracking-[0.3em] text-cyan-200/80">
                  VoteOps
                </p>
                <h1 className="truncate text-lg font-black text-white">
                  Decision Console
                </h1>
              </div>
            </div>

            <nav className="grid grid-cols-2 gap-2 lg:grid-cols-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activePage === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => navigate(item.id)}
                    className={`flex h-12 min-w-0 items-center gap-3 rounded-lg border px-3 text-left text-sm font-bold transition ${
                      isActive
                        ? "border-cyan-300/35 bg-cyan-300/10 text-cyan-100 shadow-lg shadow-cyan-950/20"
                        : "border-transparent text-slate-400 hover:border-slate-800 hover:bg-slate-900/80 hover:text-slate-100"
                    }`}
                  >
                    <Icon className="shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </button>
                );
              })}
            </nav>

            <div className="mt-auto rounded-lg border border-slate-800 bg-[#080b13] p-4">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-slate-800 text-slate-200">
                  <FaUserCircle />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-white">{user?.email}</p>
                  <p className="truncate text-xs text-slate-500">Signed in</p>
                </div>
              </div>

              <button
                type="button"
                onClick={onLogout}
                className="mt-4 inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-slate-800 bg-slate-900 text-sm font-bold text-slate-300 transition hover:border-rose-300/40 hover:text-rose-200"
              >
                <FaSignOutAlt />
                Logout
              </button>
            </div>
          </div>
        </aside>

        <div className="min-w-0">
          <header className="sticky top-0 z-30 border-b border-slate-800/80 bg-[#05070c]/88 backdrop-blur-xl">
            <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-200/75">
                  {copy.eyebrow}
                </p>
                <h2 className="mt-1 text-2xl font-black text-white sm:text-3xl">
                  {copy.title}
                </h2>
                <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-400">
                  {copy.description}
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={fetchPolls}
                  className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-800 bg-slate-900 px-4 text-sm font-bold text-slate-300 transition hover:border-cyan-300/40 hover:text-cyan-100"
                >
                  <FaSyncAlt className={loadingPolls ? "animate-spin" : ""} />
                  Refresh
                </button>
                <button
                  type="button"
                  onClick={() => navigate("create")}
                  className="inline-flex h-10 items-center gap-2 rounded-lg bg-cyan-300 px-4 text-sm font-black text-slate-950 transition hover:bg-cyan-200"
                >
                  <FaPlus />
                  Create
                </button>
              </div>
            </div>
          </header>

          <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
            {activePage === "overview" && (
              <OverviewPage
                stats={stats}
                polls={enrichedPolls}
                featuredPoll={featuredPoll}
                closingSoonPolls={closingSoonPolls}
                vote={vote}
                navigate={navigate}
                now={now}
                loading={loadingPolls}
              />
            )}

            {activePage === "polls" && (
              <PollsPage
                polls={searchedPolls}
                filter={pollFilter}
                setFilter={setPollFilter}
                query={query}
                setQuery={setQuery}
                vote={vote}
                now={now}
                loading={loadingPolls}
                navigate={navigate}
              />
            )}

            {activePage === "create" && (
              <CreatePoll
                refreshPolls={fetchPolls}
                onClose={() => navigate("polls")}
              />
            )}

            {activePage === "results" && (
              <ResultsPage polls={resultPolls} loading={loadingPolls} />
            )}

            {activePage === "account" && (
              <AccountPage
                user={user}
                stats={stats}
                voteHistory={voteHistory}
                clearLocalVotes={clearLocalVotes}
                refreshPolls={fetchPolls}
              />
            )}
          </main>
        </div>
      </div>
    </div>
  );
}

function OverviewPage({
  stats,
  polls,
  featuredPoll,
  closingSoonPolls,
  vote,
  navigate,
  now,
  loading,
}) {
  if (loading) return <SkeletonGrid />;

  return (
    <div className="space-y-6">
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          icon={<FaLayerGroup />}
          label="Total polls"
          value={stats.totalPolls}
          detail={`${stats.active} active now`}
          tone="cyan"
        />
        <StatTile
          icon={<FaBolt />}
          label="Live decisions"
          value={stats.active}
          detail="Open for voting"
          tone="emerald"
        />
        <StatTile
          icon={<FaChartBar />}
          label="Votes captured"
          value={stats.totalVotes}
          detail={`${stats.votedPolls} by you`}
          tone="amber"
        />
        <StatTile
          icon={<FaTrophy />}
          label="Closed polls"
          value={stats.closed}
          detail="Ready for review"
          tone="rose"
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.18fr_0.82fr]">
        {featuredPoll ? (
          <PollCard poll={featuredPoll} vote={vote} now={now} featured />
        ) : (
          <EmptyState
            title="No active polls"
            description="Create a timed poll to start collecting decisions."
            actionLabel="Create Poll"
            onAction={() => navigate("create")}
          />
        )}

        <div className="relative min-h-[360px] overflow-hidden rounded-lg border border-slate-800 bg-slate-950">
          <img
            src={heroImage}
            alt="Voting analytics visual"
            className="absolute inset-0 h-full w-full object-cover opacity-25 mix-blend-screen"
          />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(5,7,12,0.34),rgba(5,7,12,0.96))]" />
          <div className="relative flex h-full flex-col justify-end p-5 sm:p-6">
            <div className="mb-4 inline-flex w-fit items-center gap-2 rounded-md border border-cyan-300/25 bg-cyan-300/10 px-3 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-100">
              <FaUsers />
              Workspace health
            </div>
            <p className="text-4xl font-black text-white">{stats.totalVotes}</p>
            <p className="mt-2 text-sm leading-6 text-slate-300">
              votes distributed across {polls.length} decision threads.
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <Panel title="Closing Soon" icon={<FaClock />}>
          {closingSoonPolls.length ? (
            <div className="space-y-3">
              {closingSoonPolls.map((poll) => (
                <CompactPollRow key={poll._id} poll={poll} now={now} />
              ))}
            </div>
          ) : (
            <SmallEmptyState title="No active countdowns" />
          )}
        </Panel>

        <Panel title="Recent Activity" icon={<FaChartLine />}>
          {polls.length ? (
            <div className="space-y-3">
              {polls.slice(0, 5).map((poll) => (
                <CompactPollRow key={poll._id} poll={poll} now={now} showWinner />
              ))}
            </div>
          ) : (
            <SmallEmptyState title="No polls yet" />
          )}
        </Panel>
      </section>
    </div>
  );
}

function PollsPage({
  polls,
  filter,
  setFilter,
  query,
  setQuery,
  vote,
  now,
  loading,
  navigate,
}) {
  return (
    <div className="space-y-5">
      <section className="flex flex-col gap-3 rounded-lg border border-slate-800 bg-slate-950/72 p-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative min-w-0 flex-1">
          <FaSearch className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search polls or options"
            className="h-11 w-full rounded-lg border border-slate-800 bg-[#070a12] pl-11 pr-4 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-300/70 focus:ring-2 focus:ring-cyan-300/10"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {filterOptions.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => setFilter(option.id)}
              className={`inline-flex h-10 items-center gap-2 rounded-lg border px-4 text-sm font-bold transition ${
                filter === option.id
                  ? "border-cyan-300/40 bg-cyan-300/10 text-cyan-100"
                  : "border-slate-800 bg-slate-900 text-slate-400 hover:text-white"
              }`}
            >
              <FaFilter />
              {option.label}
            </button>
          ))}
        </div>
      </section>

      {loading ? (
        <SkeletonGrid />
      ) : polls.length ? (
        <section className="grid gap-5 md:grid-cols-2 2xl:grid-cols-3">
          {polls.map((poll) => (
            <PollCard key={poll._id} poll={poll} vote={vote} now={now} />
          ))}
        </section>
      ) : (
        <EmptyState
          title="No polls found"
          description="Adjust filters or publish a new poll."
          actionLabel="Create Poll"
          onAction={() => navigate("create")}
        />
      )}
    </div>
  );
}

function ResultsPage({ polls, loading }) {
  if (loading) return <SkeletonGrid count={4} />;

  if (!polls.length) {
    return (
      <EmptyState
        title="No results available"
        description="Results appear after votes are captured or polls close."
      />
    );
  }

  return (
    <section className="space-y-4">
      {polls.map((poll) => (
        <article
          key={poll._id}
          className="rounded-lg border border-slate-800 bg-slate-950/72 p-5"
        >
          <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <div className="mb-2 inline-flex items-center gap-2 rounded-md border border-amber-300/25 bg-amber-300/10 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.18em] text-amber-100">
                <FaCrown />
                {getWinnerText(poll)}
              </div>
              <h3 className="text-xl font-black text-white">{poll.question}</h3>
              <p className="mt-1 text-sm text-slate-500">
                Closed: {poll.expired ? "Yes" : "No"} • Total votes:{" "}
                {poll.totalVotes}
              </p>
            </div>
            <StatusPill expired={poll.expired} />
          </div>

          <div className="grid gap-3 lg:grid-cols-2">
            {poll.options.map((option, index) => {
              const percent = poll.totalVotes
                ? Math.round((Number(option.votes || 0) / poll.totalVotes) * 100)
                : 0;
              return (
                <div
                  key={`${poll._id}-${option.text}-${index}`}
                  className="rounded-lg border border-slate-800 bg-[#070a12] p-4"
                >
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <p className="min-w-0 truncate text-sm font-bold text-white">
                      {option.text}
                    </p>
                    <span className="text-sm font-black text-cyan-100">
                      {percent}%
                    </span>
                  </div>
                  <ProgressBar percent={percent} tone="amber" />
                  <p className="mt-2 text-xs text-slate-500">
                    {Number(option.votes || 0)} votes
                  </p>
                </div>
              );
            })}
          </div>
        </article>
      ))}
    </section>
  );
}

function AccountPage({ user, stats, voteHistory, clearLocalVotes, refreshPolls }) {
  return (
    <section className="grid gap-6 xl:grid-cols-[0.86fr_1.14fr]">
      <div className="rounded-lg border border-slate-800 bg-slate-950/72 p-5">
        <div className="mb-6 flex items-center gap-4">
          <div className="grid h-16 w-16 shrink-0 place-items-center rounded-lg bg-cyan-300 text-2xl text-slate-950">
            <FaUserCircle />
          </div>
          <div className="min-w-0">
            <p className="truncate text-lg font-black text-white">{user?.email}</p>
            <p className="truncate text-sm text-slate-500">Session account</p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <MiniMetric label="Polls" value={stats.totalPolls} />
          <MiniMetric label="Votes" value={stats.totalVotes} />
          <MiniMetric label="Active" value={stats.active} />
          <MiniMetric label="Your votes" value={stats.votedPolls} />
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={refreshPolls}
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-800 bg-slate-900 px-4 text-sm font-bold text-slate-300 transition hover:border-cyan-300/40 hover:text-cyan-100"
          >
            <FaSyncAlt />
            Refresh
          </button>
          <button
            type="button"
            onClick={clearLocalVotes}
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-rose-300/25 bg-rose-300/10 px-4 text-sm font-bold text-rose-100 transition hover:border-rose-300/50"
          >
            Clear Vote Cache
          </button>
        </div>
      </div>

      <Panel title="Local Vote Ledger" icon={<FaCheckCircle />}>
        {voteHistory.length ? (
          <div className="space-y-3">
            {voteHistory.map((poll) => {
              const selected = poll.options[poll.userVote];
              return (
                <div
                  key={poll._id}
                  className="rounded-lg border border-slate-800 bg-[#070a12] p-4"
                >
                  <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-white">
                        {poll.question}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        Selected: {selected?.text || "Unknown option"}
                      </p>
                    </div>
                    <StatusPill expired={poll.expired} />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <SmallEmptyState title="No local votes recorded" />
        )}
      </Panel>
    </section>
  );
}

function PollCard({ poll, vote, now, featured = false }) {
  const winner = poll.expired ? getWinnerText(poll) : null;

  return (
    <article
      className={`rounded-lg border border-slate-800 bg-slate-950/72 p-5 shadow-2xl shadow-black/20 ${
        featured ? "min-h-[360px]" : ""
      }`}
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <StatusPill expired={poll.expired} />
        <span className="inline-flex items-center gap-2 rounded-md border border-slate-800 bg-[#070a12] px-3 py-1.5 text-xs font-bold text-slate-300">
          <FaClock className="text-amber-200" />
          {formatTimeLeft(poll.expiryTime, now)}
        </span>
      </div>

      <h3 className={`${featured ? "text-2xl" : "text-xl"} font-black text-white`}>
        {poll.question}
      </h3>
      <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold text-slate-500">
        <span>{poll.totalVotes} votes</span>
        <span>Close: {formatDateTime(poll.expiryTime)}</span>
      </div>

      {winner && (
        <div className="mt-4 inline-flex max-w-full items-center gap-2 rounded-md border border-amber-300/25 bg-amber-300/10 px-3 py-2 text-sm font-bold text-amber-100">
          <FaCrown className="shrink-0" />
          <span className="truncate">Winner: {winner}</span>
        </div>
      )}

      <div className="mt-5 space-y-3">
        {poll.options.map((option, index) => {
          const percent = poll.totalVotes
            ? Math.round((Number(option.votes || 0) / poll.totalVotes) * 100)
            : 0;
          const selected = poll.userVote === index;
          const locked = poll.expired || poll.userVote !== undefined;

          return (
            <div key={`${poll._id}-${option.text}-${index}`}>
              <button
                type="button"
                onClick={() => vote(poll._id, index, poll.expired)}
                disabled={locked}
                className={`flex min-h-12 w-full items-center justify-between gap-3 rounded-lg border px-4 py-3 text-left text-sm font-bold transition ${
                  selected
                    ? "border-cyan-200 bg-cyan-300 text-slate-950"
                    : locked
                      ? "border-slate-800 bg-[#070a12] text-slate-400"
                      : "border-slate-800 bg-[#070a12] text-slate-200 hover:border-cyan-300/60 hover:text-cyan-100"
                }`}
              >
                <span className="min-w-0 truncate">{option.text}</span>
                <span className="inline-flex shrink-0 items-center gap-2 text-xs">
                  {selected && <FaCheckCircle />}
                  {Number(option.votes || 0)}
                </span>
              </button>
              <div className="mt-2">
                <ProgressBar percent={percent} tone={selected ? "cyan" : "default"} />
              </div>
            </div>
          );
        })}
      </div>
    </article>
  );
}

function StatTile({ icon, label, value, detail, tone }) {
  const tones = {
    cyan: "border-cyan-300/25 bg-cyan-300/10 text-cyan-100",
    emerald: "border-emerald-300/25 bg-emerald-300/10 text-emerald-100",
    amber: "border-amber-300/25 bg-amber-300/10 text-amber-100",
    rose: "border-rose-300/25 bg-rose-300/10 text-rose-100",
  };

  return (
    <article className="rounded-lg border border-slate-800 bg-slate-950/72 p-5">
      <div
        className={`mb-5 grid h-11 w-11 place-items-center rounded-lg border ${
          tones[tone] || tones.cyan
        }`}
      >
        {icon}
      </div>
      <p className="text-sm font-semibold text-slate-400">{label}</p>
      <p className="mt-2 text-3xl font-black text-white">{value}</p>
      <p className="mt-1 text-xs text-slate-500">{detail}</p>
    </article>
  );
}

function Panel({ title, icon, children }) {
  return (
    <section className="rounded-lg border border-slate-800 bg-slate-950/72 p-5">
      <div className="mb-4 flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-lg border border-slate-700 bg-slate-900 text-cyan-100">
          {icon}
        </div>
        <h3 className="text-lg font-black text-white">{title}</h3>
      </div>
      {children}
    </section>
  );
}

function CompactPollRow({ poll, now, showWinner = false }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-slate-800 bg-[#070a12] p-4">
      <div className="min-w-0">
        <p className="truncate text-sm font-bold text-white">{poll.question}</p>
        <p className="mt-1 text-xs text-slate-500">
          {showWinner ? `Leader: ${getWinnerText(poll)}` : formatDateTime(poll.expiryTime)}
        </p>
      </div>
      <div className="shrink-0 text-right">
        <p className="text-sm font-black text-cyan-100">{poll.totalVotes}</p>
        <p className="text-xs text-slate-500">
          {poll.expired ? "Closed" : formatTimeLeft(poll.expiryTime, now)}
        </p>
      </div>
    </div>
  );
}

function StatusPill({ expired }) {
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-xs font-black uppercase tracking-[0.16em] ${
        expired
          ? "border-rose-300/25 bg-rose-300/10 text-rose-100"
          : "border-emerald-300/25 bg-emerald-300/10 text-emerald-100"
      }`}
    >
      <span
        className={`h-2 w-2 rounded-full ${
          expired ? "bg-rose-300" : "bg-emerald-300"
        }`}
      />
      {expired ? "Closed" : "Live"}
    </span>
  );
}

function ProgressBar({ percent, tone = "default" }) {
  const fill =
    tone === "cyan"
      ? "bg-cyan-300"
      : tone === "amber"
        ? "bg-amber-300"
        : "bg-slate-500";

  return (
    <div className="h-2 overflow-hidden rounded-full bg-slate-800">
      <div
        className={`h-full rounded-full ${fill} transition-all duration-700`}
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}

function EmptyState({ title, description, actionLabel, onAction }) {
  return (
    <section className="rounded-lg border border-dashed border-slate-700 bg-slate-950/55 p-8 text-center">
      <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-lg border border-slate-700 bg-slate-900 text-slate-300">
        <FaVoteYea />
      </div>
      <h3 className="text-xl font-black text-white">{title}</h3>
      {description && (
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-400">
          {description}
        </p>
      )}
      {actionLabel && (
        <button
          type="button"
          onClick={onAction}
          className="mt-5 inline-flex h-10 items-center gap-2 rounded-lg bg-cyan-300 px-4 text-sm font-black text-slate-950 transition hover:bg-cyan-200"
        >
          <FaPlus />
          {actionLabel}
        </button>
      )}
    </section>
  );
}

function SmallEmptyState({ title }) {
  return (
    <div className="rounded-lg border border-dashed border-slate-800 bg-[#070a12] p-5 text-sm font-semibold text-slate-500">
      {title}
    </div>
  );
}

function MiniMetric({ label, value }) {
  return (
    <div className="rounded-lg border border-slate-800 bg-[#070a12] p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
        {label}
      </p>
      <p className="mt-2 text-2xl font-black text-white">{value}</p>
    </div>
  );
}

function SkeletonGrid({ count = 6 }) {
  return (
    <section className="grid gap-5 md:grid-cols-2 2xl:grid-cols-3">
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className="h-72 animate-pulse rounded-lg border border-slate-800 bg-slate-950/72"
        />
      ))}
    </section>
  );
}
