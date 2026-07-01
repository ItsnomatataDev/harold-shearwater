"use client";

import { useEffect, useState } from "react";
import { NotificationBell } from "./NotificationBell";
import { loadNotificationSummary } from "../notification-actions";
import type { NotificationView } from "../notification-service";

export function NotificationBellLoader({
  organizationId,
  notificationCentrePath,
}: {
  organizationId: string;
  notificationCentrePath: string;
}) {
  const [summary, setSummary] = useState<{
    unreadCount: number;
    recent: NotificationView[];
  } | null>(null);

  useEffect(() => {
    let active = true;

    void loadNotificationSummary(organizationId).then((data) => {
      if (active) setSummary(data);
    });

    return () => {
      active = false;
    };
  }, [organizationId]);

  return (
    <NotificationBell
      organizationId={organizationId}
      notificationCentrePath={notificationCentrePath}
      initialUnreadCount={summary?.unreadCount ?? 0}
      initialNotifications={summary?.recent ?? []}
    />
  );
}
