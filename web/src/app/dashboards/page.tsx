"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useWallet } from "@/hooks/useWallet";

interface SavedDashboard {
  id: string;
  wallet_addr: string | null;
  title: string;
  created_at: string;
}

interface DashboardFull extends SavedDashboard {
  html_content?: string;
}

export default function DashboardsPage() {
  const { address } = useWallet();
  const [dashboards, setDashboards] = useState<SavedDashboard[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<DashboardFull | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const wallet = address || null;
        const url = `/api/dashboards${wallet ? `?wallet=${wallet}` : ""}`;
        const res = await fetch(url);
        const data = await res.json();
        setDashboards(data.dashboards || []);
      } catch {
        setDashboards([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [address]);

  const handleDelete = async (id: string) => {
    setDeleting(id);
    try {
      await fetch(`/api/dashboards?id=${id}`, { method: "DELETE" });
      setDashboards((prev) => prev.filter((d) => d.id !== id));
      if (selected?.id === id) setSelected(null);
    } catch {
      // Fail silently
    } finally {
      setDeleting(null);
    }
  };

  const handleView = async (dashboard: SavedDashboard) => {
    // Fetch full html content
    try {
      const res = await fetch(`/api/dashboards/${dashboard.id}`);
      const data = await res.json();
      setSelected({ ...dashboard, html_content: data.html_content });
    } catch {
      setSelected(dashboard);
    }
  };

  const formatDate = (iso: string) => {
    return new Date(iso).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Full screen viewer
  if (selected?.html_content) {
    return (
      <div className="flex h-screen flex-col bg-zinc-950">
        <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
          <button
            onClick={() => setSelected(null)}
            className="text-sm text-zinc-400 hover:text-white transition-colors"
          >
            ← Back to Library
          </button>
          <h2 className="text-sm font-semibold text-white">{selected.title}</h2>
          <a
            href={`data:text/html;charset=utf-8,${encodeURIComponent(selected.html_content)}`}
            download={`${selected.title}.html`}
            className="text-xs text-zinc-400 hover:text-white transition-colors"
          >
            Download
          </a>
        </div>
        <iframe
          srcDoc={selected.html_content}
          className="flex-1 w-full"
          sandbox="allow-scripts"
          title={selected.title}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Header */}
      <div className="border-b border-zinc-800 px-4 py-4">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-sm font-bold">
              L
            </div>
            <span className="text-sm font-semibold">Yield Sentry</span>
          </div>
          <Link
            href="/chat"
            className="text-xs text-zinc-400 hover:text-white transition-colors"
          >
            ← Back to Chat
          </Link>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-xl font-bold">My Dashboard Library</h1>
          <Link
            href="/chat"
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 transition-colors"
          >
            + Build New
          </Link>
        </div>

        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <span className="text-zinc-400 text-sm">Loading dashboards...</span>
          </div>
        ) : dashboards.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center text-center">
            <div className="mb-3 text-4xl">📊</div>
            <p className="text-sm text-zinc-400">No saved dashboards yet.</p>
            <p className="mt-1 text-xs text-zinc-500">
              Ask Yield Sentry to &ldquo;show me yield opportunities&rdquo; in chat and save the result.
            </p>
            <Link
              href="/chat"
              className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 transition-colors"
            >
              Open Chat
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {dashboards.map((dashboard) => (
              <div
                key={dashboard.id}
                className="rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden"
              >
                {/* Mini preview placeholder */}
                <div className="flex h-36 items-center justify-center bg-zinc-800 text-zinc-600">
                  <span className="text-3xl">📊</span>
                </div>
                {/* Card info */}
                <div className="p-3">
                  <p className="mb-1 text-sm font-medium text-white truncate">{dashboard.title}</p>
                  <p className="mb-3 text-xs text-zinc-500">{formatDate(dashboard.created_at)}</p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleView(dashboard)}
                      className="flex-1 rounded-lg bg-blue-600 py-1.5 text-xs font-medium text-white hover:bg-blue-500 transition-colors"
                    >
                      View
                    </button>
                    <button
                      onClick={() => handleDelete(dashboard.id)}
                      disabled={deleting === dashboard.id}
                      className="flex-1 rounded-lg border border-zinc-700 py-1.5 text-xs font-medium text-zinc-400 hover:border-red-500 hover:text-red-400 transition-colors disabled:opacity-50"
                    >
                      {deleting === dashboard.id ? "..." : "Delete"}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
