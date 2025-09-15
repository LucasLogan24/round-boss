"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { Button } from "@/components/ui/button";
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type CustomerRow = {
  id: string;
  owner_id: string;
  name: string;
  address_line1: string | null;
  city: string | null;
  postcode: string | null;
  price: number | null;
  is_active: boolean | null;
};

export default function CustomersTable({ rows }: { rows: CustomerRow[] }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const colCount = 5; // Name, Address, Price, Status, Notes action

  return (
    <>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead className="hidden md:table-cell">Address</TableHead>
          <TableHead className="hidden md:table-cell">Price</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Notes</TableHead>
        </TableRow>
      </TableHeader>

      <TableBody>
        {rows.length === 0 ? (
          <TableRow>
            <TableCell
              colSpan={colCount}
              className="text-center text-sm text-muted-foreground"
            >
              No customers yet.
            </TableCell>
          </TableRow>
        ) : (
          rows.map((c) => (
            <React.Fragment key={c.id}>
              <TableRow>
                <TableCell className="font-medium">{c.name}</TableCell>
                <TableCell className="hidden md:table-cell">
                  {[c.address_line1, c.city, c.postcode].filter(Boolean).join(", ") ||
                    "—"}
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  £{Number(c.price || 0).toFixed(0)}
                </TableCell>
                <TableCell>{c.is_active ? "Active" : "Inactive"}</TableCell>
                <TableCell className="text-right">
                  <Button
                    variant={expandedId === c.id ? "secondary" : "outline"}
                    size="sm"
                    onClick={() =>
                      setExpandedId((prev) => (prev === c.id ? null : c.id))
                    }
                  >
                    {expandedId === c.id ? "Close Notes" : "Open Notes"}
                  </Button>
                </TableCell>
              </TableRow>

              {expandedId === c.id && (
                <TableRow>
                  <TableCell colSpan={colCount}>
                    <div
                      id={`notes-${c.id}`}
                      className="rounded-2xl border p-3 bg-muted/30"
                    >
                      <CustomerNotes customerId={c.id} />
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </React.Fragment>
          ))
        )}
      </TableBody>
    </>
  );
}

/* ===== Inline Notes Editor (owner-only via RLS) ===== */

function CustomerNotes({ customerId }: { customerId: string }) {
  const supabase = useMemo(
    () =>
      createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      ),
    []
  );

  const [userId, setUserId] = useState<string | null>(null);
  const [noteId, setNoteId] = useState<string | null>(null);
  const [content, setContent] = useState("");
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [status, setStatus] =
    useState<"idle" | "loading" | "saving" | "saved" | "error">("loading");
  const [isDirty, setIsDirty] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const saveTimer = useRef<number | null>(null);

  // Load user id once (client-side session)
  useEffect(() => {
    let mounted = true;
    supabase.auth.getUser().then(({ data }) => {
      if (mounted) setUserId(data.user?.id ?? null);
    });
    return () => {
      mounted = false;
    };
  }, [supabase]);

  // Load existing note (if any)
  useEffect(() => {
    let alive = true;

    (async () => {
      setStatus("loading");
      setErrorMsg(null);
      const { data, error } = await supabase
        .from("customer_notes")
        .select("id, content, updated_at")
        .eq("customer_id", customerId)
        .single();

      if (!alive) return;

      // PGRST116 = "No rows found"
      if (error && error.code !== "PGRST116") {
        console.error(error);
        setErrorMsg(error.message || "Error loading note");
        setStatus("error");
        return;
      }

      if (data) {
        setNoteId(data.id);
        setContent(data.content ?? "");
        setUpdatedAt(data.updated_at ?? null);
      } else {
        setNoteId(null);
        setContent("");
        setUpdatedAt(null);
      }

      setIsDirty(false);
      setStatus("idle");
    })();

    return () => {
      alive = false;
      if (saveTimer.current) window.clearTimeout(saveTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerId]);

  // Core save logic (used by autosave + button)
  const saveNow = async (nextContent: string) => {
    try {
      setStatus("saving");
      setErrorMsg(null);

      if (noteId) {
        const { data, error } = await supabase
          .from("customer_notes")
          .update({ content: nextContent })
          .eq("id", noteId)
          .select("id, updated_at")
          .single();
        if (error) {
          throw error;
        }
        setUpdatedAt(data.updated_at ?? new Date().toISOString());
      } else {
        // ✅ include owner_id explicitly to satisfy RLS "WITH CHECK"
        const { data, error } = await supabase
          .from("customer_notes")
          .insert({
            customer_id: customerId,
            content: nextContent,
            owner_id: userId ?? undefined, // fallback to default if present
          })
          .select("id, updated_at")
          .single();
        if (error) {
          throw error;
        }
        setNoteId(data.id);
        setUpdatedAt(data.updated_at ?? new Date().toISOString());
      }

      setIsDirty(false);
      setStatus("saved");
      window.setTimeout(() => setStatus("idle"), 800);
    } catch (e: any) {
      console.error(e);
      setErrorMsg(e?.message || "Could not save.");
      setStatus("error");
    }
  };

  // Autosave (debounced)
  const scheduleSave = (next: string) => {
    setContent(next);
    setIsDirty(true);
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => saveNow(next), 500);
  };

  // Ctrl/Cmd+S to save immediately
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        if (saveTimer.current) window.clearTimeout(saveTimer.current);
        if (isDirty) saveNow(content);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [content, isDirty]);

  const lastUpdatedText =
    updatedAt ? `Last updated ${relativeTimeFromNow(updatedAt)}` : "Not saved yet";

  return (
    <div className="grid gap-2">
      <label className="text-sm font-medium">Private Notes (owner only)</label>
      <textarea
        className="w-full min-h-32 rounded-2xl border p-3"
        placeholder="Write anything the owner should remember about this customer…"
        value={content}
        onChange={(e) => scheduleSave(e.target.value)}
      />
      <div className="flex items-center justify-between text-xs opacity-70">
        <span>{lastUpdatedText}</span>
        <div className="flex items-center gap-3">
          <span>
            {status === "loading" && "Loading…"}
            {status === "saving" && "Saving…"}
            {status === "saved" && "Saved."}
            {status === "error" && (errorMsg || "Could not save.")}
            {status === "idle" && " "}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (saveTimer.current) window.clearTimeout(saveTimer.current);
              if (isDirty) saveNow(content);
            }}
            disabled={!isDirty || status === "saving"}
          >
            {status === "saving" ? "Saving…" : "Save"}
          </Button>
        </div>
      </div>
    </div>
  );
}

/** "2 minutes ago" style helper */
function relativeTimeFromNow(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const sec = Math.round(Math.abs(diffMs) / 1000);
  const min = Math.round(sec / 60);
  const hr = Math.round(min / 60);
  const day = Math.round(hr / 24);

  if (sec < 45) return "just now";
  if (min < 60) return `${min} minute${min === 1 ? "" : "s"} ago`;
  if (hr < 24) return `${hr} hour${hr === 1 ? "" : "s"} ago`;
  return `${day} day${day === 1 ? "" : "s"} ago`;
}
