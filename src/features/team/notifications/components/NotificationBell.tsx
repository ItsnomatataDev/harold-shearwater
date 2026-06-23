"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Icon, type IconName } from "@/components/Icon";
import type { NotificationView } from "../notification-service";
import {
  notificationRealtimeEvent,
  type NotificationRealtimeDetail,
} from "../notification-realtime";
import {
  markAllNotificationsRead,
  setNotificationRead,
} from "../notification-actions";

const categoryIcons: Record<NotificationView["category"], IconName> = {
  meeting: "users",
  schedule: "calendar",
  announcement: "megaphone",
  knowledge: "file",
  access: "shield",
  attendance: "clock",
  system: "bell",
};

const categoryTones: Record<NotificationView["category"], string> = {
  meeting: "bg-gold/10 text-gold",
  schedule: "bg-savannah/10 text-savannah",
  announcement: "bg-victoria/10 text-victoria",
  knowledge: "bg-earth/10 text-earth",
  access: "bg-sunset/10 text-sunset",
  attendance: "bg-victoria/10 text-victoria",
  system: "bg-[#333] text-[#aaa]",
};

function timestamp(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Harare",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function NotificationBell({
  initialUnreadCount,
  initialNotifications,
}: {
  initialUnreadCount: number;
  initialNotifications: NotificationView[];
}) {
  const router = useRouter();
  const knownIds = useRef(new Set(initialNotifications.map((item) => item.id)));
  const [open, setOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount);
  const [notifications, setNotifications] = useState(initialNotifications);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    function receiveRealtimeNotification(event: Event) {
      const detail = (event as CustomEvent<NotificationRealtimeDetail>).detail;
      const notification = detail.notification;
      if (knownIds.current.has(notification.id)) return;

      knownIds.current.add(notification.id);
      setNotifications((current) => [notification, ...current].slice(0, 6));
      if (!notification.readAt) setUnreadCount((count) => count + 1);
    }

    window.addEventListener(notificationRealtimeEvent, receiveRealtimeNotification);
    return () =>
      window.removeEventListener(notificationRealtimeEvent, receiveRealtimeNotification);
  }, []);

  function openNotification(notification: NotificationView) {
    setOpen(false);
    if (!notification.readAt) {
      setNotifications((current) =>
        current.map((item) =>
          item.id === notification.id
            ? { ...item, readAt: new Date().toISOString() }
            : item,
        ),
      );
      setUnreadCount((count) => Math.max(0, count - 1));
      startTransition(async () => {
        try {
          await setNotificationRead(notification.id, true);
        } catch {
          setNotifications((current) =>
            current.map((item) =>
              item.id === notification.id ? { ...item, readAt: null } : item,
            ),
          );
          setUnreadCount((count) => count + 1);
        } finally {
          router.refresh();
        }
      });
    }
    if (notification.href) router.push(notification.href);
  }

  function markAll() {
    const previousNotifications = notifications;
    const previousUnreadCount = unreadCount;
    const readAt = new Date().toISOString();
    setNotifications((current) =>
      current.map((item) => ({ ...item, readAt: item.readAt ?? readAt })),
    );
    setUnreadCount(0);
    startTransition(async () => {
      try {
        await markAllNotificationsRead();
      } catch {
        setNotifications(previousNotifications);
        setUnreadCount(previousUnreadCount);
      } finally {
        router.refresh();
      }
    });
  }

  return (
    <div className="relative">
      <button
        aria-label="Notifications"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className="relative rounded-xl p-2.5 text-[#8e8e88] transition hover:bg-[#242422] hover:text-white"
      >
        <Icon name="bell" className="h-4.5 w-4.5" />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-sunset px-1 text-[9px] font-bold text-white ring-2 ring-[#111]">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <button
            aria-label="Close notifications"
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-40 cursor-default bg-transparent"
          />
          <section className="fixed inset-x-3 top-20 z-50 overflow-hidden rounded-2xl border border-[#41413d] bg-[#191918] shadow-2xl sm:absolute sm:inset-x-auto sm:right-0 sm:top-12 sm:w-100">
            <div className="flex items-center justify-between border-b border-[#343431] px-5 py-4">
              <div>
                <h2 className="text-sm font-semibold text-white">Notifications</h2>
                <p className="mt-1 text-[10px] text-[#777]">
                  {unreadCount ? `${unreadCount} unread` : "You are all caught up"}
                </p>
              </div>
              {unreadCount > 0 && (
                <button
                  disabled={pending}
                  onClick={markAll}
                  className="text-[10px] font-semibold text-victoria"
                >
                  Mark all read
                </button>
              )}
            </div>

            <div className="max-h-105 overflow-y-auto">
              {notifications.map((notification) => (
                <button
                  key={notification.id}
                  onClick={() => openNotification(notification)}
                  className={`flex w-full gap-3 border-b border-[#30302d] p-4 text-left transition hover:bg-[#242422] ${
                    notification.readAt ? "opacity-70" : "bg-white/2"
                  }`}
                >
                  <span
                    className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${categoryTones[notification.category]}`}
                  >
                    <Icon
                      name={categoryIcons[notification.category]}
                      className="h-4 w-4"
                    />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-start justify-between gap-3">
                      <strong className="text-xs font-semibold text-[#e2e2dc]">
                        {notification.title}
                      </strong>
                      {!notification.readAt && (
                        <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-sunset" />
                      )}
                    </span>
                    <span className="mt-1.5 line-clamp-2 block text-[10px] leading-4 text-[#85857f]">
                      {notification.body}
                    </span>
                    <span className="mt-2 block text-[9px] text-[#60605b]">
                      {timestamp(notification.createdAt)}
                    </span>
                  </span>
                </button>
              ))}
              {!notifications.length && (
                <div className="px-6 py-12 text-center">
                  <Icon name="bell" className="mx-auto h-6 w-6 text-[#555]" />
                  <p className="mt-3 text-xs font-semibold text-[#aaa]">
                    No notifications yet
                  </p>
                  <p className="mt-1 text-[10px] text-[#666]">
                    Operational updates will appear here instantly.
                  </p>
                </div>
              )}
            </div>

            <button
              onClick={() => {
                setOpen(false);
                router.push("/team/notifications");
              }}
              className="w-full border-t border-[#343431] px-5 py-3 text-center text-[10px] font-semibold text-victoria hover:bg-[#242422]"
            >
              Open notification centre
            </button>
          </section>
        </>
      )}
    </div>
  );
}
