"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { createClient } from "@/lib/supabase/client";
import { useTheme } from "@/components/theme/theme-store";
import type { Database } from "@/types/database";
import type { NotificationView } from "../notification-service";
import { publishNotificationRealtime } from "../notification-realtime";

type NotificationRow = Database["public"]["Tables"]["notifications"]["Row"];

function mapNotification(row: NotificationRow): NotificationView {
  return {
    id: row.id,
    category: row.category as NotificationView["category"],
    title: row.title,
    body: row.body,
    href: row.href,
    entityType: row.entity_type,
    entityId: row.entity_id,
    readAt: row.read_at,
    createdAt: row.created_at,
  };
}

function NotificationToast({ notification }: { notification: NotificationView }) {
  return (
    <div className="min-w-0 pr-2">
      <p className="text-xs font-semibold text-(--text-primary)">
        {notification.title}
      </p>
      <p className="mt-1 line-clamp-2 text-[10px] leading-4 text-(--text-secondary)">
        {notification.body}
      </p>
      {notification.href && (
        <p className="mt-2 text-[9px] font-semibold uppercase tracking-[.08em] text-victoria">
          Open update
        </p>
      )}
    </div>
  );
}

export function RealtimeNotificationListener({
  userId,
  organizationId,
}: {
  userId: string;
  organizationId: string;
}) {
  const router = useRouter();
  const theme = useTheme();

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`notifications:${organizationId}:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `recipient_user_id=eq.${userId}`,
        },
        (payload) => {
          const row = payload.new as NotificationRow;
          if (row.organization_id !== organizationId) return;

          const notification = mapNotification(row);
          publishNotificationRealtime({ type: "INSERT", notification });
          toast(<NotificationToast notification={notification} />, {
            toastId: notification.id,
            onClick: () => {
              if (notification.href) router.push(notification.href);
            },
          });
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [organizationId, router, userId]);

  return (
    <ToastContainer
      aria-label="Realtime notifications"
      position="top-right"
      autoClose={6500}
      hideProgressBar={false}
      newestOnTop
      closeOnClick
      pauseOnFocusLoss
      pauseOnHover
      draggable
      theme={theme}
      limit={4}
    />
  );
}
