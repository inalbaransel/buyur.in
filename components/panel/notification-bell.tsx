"use client";

import { useEffect, useRef, useState } from "react";
import { pb } from "@/lib/pocketbase";
import { useAuth } from "@/lib/use-auth";
import { BellIcon } from "@/components/icons";
import type { Notification } from "@/lib/types";

// notifications.listRule zaten "bu kullanıcıya görünen" kümeyi (all + audience
// eşleşen plan + doğrudan hedeflenen) sunucu tarafında filtreliyor (bkz.
// scripts/setup-pocketbase.mjs) — burada ekstra bir filter parametresi gerekmiyor.
export function NotificationBell() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    async function load() {
      const [notifs, reads] = await Promise.all([
        pb.collection("buyur_notifications").getFullList<Notification>({ sort: "-created", requestKey: null }),
        pb.collection("buyur_notification_reads").getFullList<{ notification: string }>({
          filter: pb.filter("user = {:id}", { id: user!.id }),
          fields: "notification",
          requestKey: null,
        }),
      ]);
      if (cancelled) return;
      setNotifications(notifs);
      setReadIds(new Set(reads.map((r) => r.notification)));
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [user]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function markRead(notificationId: string) {
    if (!user || readIds.has(notificationId)) return;
    setReadIds((prev) => new Set(prev).add(notificationId));
    try {
      await pb.collection("buyur_notification_reads").create({ notification: notificationId, user: user.id });
    } catch {
      // Muhtemelen unique index çakışması (başka bir sekmeden zaten okunmuş) — sessizce yut.
    }
  }

  if (!user) return null;

  const unreadCount = notifications.filter((n) => !readIds.has(n.id)).length;

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Bildirimler"
        className="relative inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-line text-ink-soft transition-colors hover:border-paprika hover:text-paprika"
      >
        <BellIcon size={16} />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-paprika px-1 font-mono text-[9px] text-paper">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-80 max-w-[90vw] rounded-2xl border border-line bg-paper p-2 shadow-xl">
          {notifications.length === 0 ? (
            <p className="p-4 text-center text-sm text-ink-soft">Henüz bildirim yok.</p>
          ) : (
            <div className="max-h-96 space-y-1 overflow-y-auto">
              {notifications.map((n) => {
                const isUnread = !readIds.has(n.id);
                return (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => markRead(n.id)}
                    className={`w-full rounded-xl p-3 text-left transition-colors hover:bg-crema/60 ${
                      isUnread ? "bg-paprika/5" : ""
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {isUnread && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-paprika" aria-hidden />}
                      <p className="text-sm font-medium text-ink">{n.title}</p>
                    </div>
                    <p className="mt-1 text-xs text-ink-soft">{n.body}</p>
                    <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-ink-soft/70">
                      {new Date(n.created).toLocaleDateString("tr-TR")}
                    </p>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
