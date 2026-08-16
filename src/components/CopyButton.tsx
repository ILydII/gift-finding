"use client";

import { useState } from "react";

// FR-16: clipboard API with a visible copied state; the read-only input is the
// selectable fallback for browsers without clipboard permissions.
export function CopyLinkField({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: the input below is selectable.
    }
  }

  return (
    <div className="flex gap-2">
      <input
        readOnly
        value={url}
        onFocus={(e) => e.currentTarget.select()}
        aria-label="Invite link"
        className="min-w-0 flex-1 rounded-lg border border-black/15 bg-black/[0.02] px-3 py-2.5 font-mono text-sm dark:border-white/20 dark:bg-white/[0.03]"
      />
      <button
        type="button"
        onClick={copy}
        className="whitespace-nowrap rounded-lg bg-foreground px-4 py-2.5 font-medium text-background transition hover:opacity-90"
      >
        {copied ? "Copied ✓" : "Copy link"}
      </button>
    </div>
  );
}
