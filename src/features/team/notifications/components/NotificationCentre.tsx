"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Icon, type IconName } from "@/components/Icon";
import type {
  NotificationCategory,
  NotificationPreferences,
  NotificationView,
} from "../notification-service";
import {
  deleteNotification,
  markAllNotificationsRead,
  setNotificationRead,
  updateNotificationPreferences,
} from "../notification-actions";
import {
  notificationRealtimeEvent,
  type NotificationRealtimeDetail,
} from "../notification-realtime";

type InboxFilter = "all" | "unread";
type CategoryFilter = "all" | NotificationCategory;

const categoryDetails: Record<
  NotificationCategory,
  { label: string; icon: IconName; tone: string }
> = {
  meeting: { label: "Meetings", icon: "users", tone: "bg-gold/10 text-gold" },
  schedule: {
    label: "Schedules",
    icon: "calendar",
    tone: "bg-savannah/10 text-savannah",
  },
  announcement: {
    label: "Announcements",
    icon: "megaphone",
    tone: "bg-victoria/10 text-victoria",
  },
  knowledge: {
    label: "Knowledge",
    icon: "file",
    tone: "bg-earth/10 text-earth",
  },
  access: { label: "Access", icon: "shield", tone: "bg-sunset/10 text-sunset" },
  attendance: {
    label: "Attendance",
    icon: "clock",
    tone: "bg-victoria/10 text-victoria",
  },
  system: { label: "System", icon: "bell", tone: "bg-[#333] text-[#aaa]" },
};

const preferenceRows: {
  key: Exclude<keyof NotificationPreferences, "inAppEnabled" | "emailEnabled">;
  label: string;
  description: string;
}[] = [
  { key: "meetingsEnabled", label: "Meetings", description: "Invitations, changes and responses" },
  { key: "schedulesEnabled", label: "Duties & schedules", description: "Assignments and schedule changes" },
  { key: "announcementsEnabled", label: "Announcements", description: "Published company notices" },
  { key: "knowledgeEnabled", label: "Knowledge", description: "Newly published documents" },
  { key: "accessEnabled", label: "Access", description: "Membership and role changes" },
  { key: "attendanceEnabled", label: "Attendance", description: "Attendance exceptions and reminders" },
];

function formatTimestamp(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Harare",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function Toggle({
  checked,
  disabled = false,
  label,
  onChange,
}: {
  checked: boolean;
  disabled?: boolean;
  label: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative h-6 w-11 shrink-0 rounded-full transition ${
        checked ? "bg-savannah" : "bg-[#3b3b37]"
      } ${disabled ? "cursor-not-allowed opacity-40" : "cursor-pointer"}`}
    >
      <span
        className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow-sm transition ${
          checked ? "left-6" : "left-1"
        }`}
      />
    </button>
  );
}

export function NotificationCentre({
  organizationId,
  portalName,
  initialNotifications,
  initialPreferences,
}: {
  organizationId: string;
  portalName: "Team Access" | "Agent Access";
  initialNotifications: NotificationView[];
  initialPreferences: NotificationPreferences;
}) {
  const router = useRouter();
  const knownNotificationIds = useRef(
    new Set(initialNotifications.map((notification) => notification.id)),
  );
  const [notifications, setNotifications] = useState(initialNotifications);
  const [preferences, setPreferences] = useState(initialPreferences);
  const [savedPreferences, setSavedPreferences] = useState(initialPreferences);
  const [inboxFilter, setInboxFilter] = useState<InboxFilter>("all");
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("all");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const unreadCount = notifications.filter((item) => !item.readAt).length;
  const filteredNotifications = useMemo(
    () =>
      notifications.filter((item) => {
        if (inboxFilter === "unread" && item.readAt) return false;
        return categoryFilter === "all" || item.category === categoryFilter;
      }),
    [categoryFilter, inboxFilter, notifications],
  );
  const preferencesChanged =
    JSON.stringify(preferences) !== JSON.stringify(savedPreferences);

  useEffect(() => {
    function receiveRealtimeNotification(event: Event) {
      const notification = (event as CustomEvent<NotificationRealtimeDetail>).detail
        .notification;
      if (knownNotificationIds.current.has(notification.id)) return;

      knownNotificationIds.current.add(notification.id);
      setNotifications((current) => [notification, ...current]);
    }

    window.addEventListener(notificationRealtimeEvent, receiveRealtimeNotification);
    return () =>
      window.removeEventListener(notificationRealtimeEvent, receiveRealtimeNotification);
  }, []);

  function runAction(
    action: () => Promise<void>,
    success?: string,
    rollback?: () => void,
  ) {
    setFeedback(null);
    startTransition(async () => {
      try {
        await action();
        if (success) setFeedback(success);
        router.refresh();
      } catch (error) {
        rollback?.();
        setFeedback(error instanceof Error ? error.message : "The update could not be saved.");
      }
    });
  }

  function changeReadState(notification: NotificationView, read: boolean) {
    const previousReadAt = notification.readAt;
    const readAt = read ? new Date().toISOString() : null;
    setNotifications((current) =>
      current.map((item) => (item.id === notification.id ? { ...item, readAt } : item)),
    );
    runAction(
      () => setNotificationRead(organizationId, notification.id, read),
      undefined,
      () =>
        setNotifications((current) =>
          current.map((item) =>
            item.id === notification.id ? { ...item, readAt: previousReadAt } : item,
          ),
        ),
    );
  }

  function openNotification(notification: NotificationView) {
    if (!notification.readAt) changeReadState(notification, true);
    if (notification.href) router.push(notification.href);
  }

  function markAllRead() {
    const previousReadState = new Map(
      notifications.map((notification) => [notification.id, notification.readAt]),
    );
    const readAt = new Date().toISOString();
    setNotifications((current) =>
      current.map((item) => ({ ...item, readAt: item.readAt ?? readAt })),
    );
    runAction(
      () => markAllNotificationsRead(organizationId),
      "All notifications marked as read.",
      () =>
        setNotifications((current) =>
          current.map((item) => ({
            ...item,
            readAt: previousReadState.get(item.id) ?? null,
          })),
        ),
    );
  }

  function removeNotification(notification: NotificationView) {
    setNotifications((current) => current.filter((item) => item.id !== notification.id));
    runAction(
      () => deleteNotification(organizationId, notification.id),
      "Notification removed.",
      () =>
        setNotifications((current) =>
          [...current, notification].sort(
            (a, b) =>
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
          ),
        ),
    );
  }

  function savePreferences() {
    runAction(async () => {
      await updateNotificationPreferences(organizationId, preferences);
      setSavedPreferences(preferences);
    }, "Notification preferences saved.");
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
      <section className="overflow-hidden rounded-3xl border border-[#343431] bg-[#1d1d1b]">
        <div className="flex flex-col gap-4 border-b border-[#343431] p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div className="flex items-center gap-2 rounded-xl bg-[#151514] p-1">
            {(["all", "unread"] as InboxFilter[]).map((filter) => (
              <button
                key={filter}
                onClick={() => setInboxFilter(filter)}
                className={`rounded-lg px-4 py-2 text-xs font-semibold capitalize transition ${
                  inboxFilter === filter
                    ? "bg-[#343431] text-white"
                    : "text-[#81817b] hover:text-white"
                }`}
              >
                {filter}
                {filter === "unread" && unreadCount > 0 ? ` (${unreadCount})` : ""}
              </button>
            ))}
          </div>
          {unreadCount > 0 && (
            <button
              disabled={pending}
              onClick={markAllRead}
              className="text-left text-xs font-semibold text-victoria transition hover:text-[#58c6ef] disabled:opacity-50"
            >
              Mark all as read
            </button>
          )}
        </div>

        <div className="flex gap-2 overflow-x-auto border-b border-[#343431] px-5 py-4 sm:px-6">
          <button
            onClick={() => setCategoryFilter("all")}
            className={`shrink-0 rounded-full border px-3 py-1.5 text-[10px] font-semibold transition ${
              categoryFilter === "all"
                ? "border-sunset/50 bg-sunset/10 text-[#ff8b76]"
                : "border-[#3b3b38] text-[#85857f] hover:text-white"
            }`}
          >
            All activity
          </button>
          {(Object.keys(categoryDetails) as NotificationCategory[]).map((category) => (
            <button
              key={category}
              onClick={() => setCategoryFilter(category)}
              className={`shrink-0 rounded-full border px-3 py-1.5 text-[10px] font-semibold transition ${
                categoryFilter === category
                  ? "border-sunset/50 bg-sunset/10 text-[#ff8b76]"
                  : "border-[#3b3b38] text-[#85857f] hover:text-white"
              }`}
            >
              {categoryDetails[category].label}
            </button>
          ))}
        </div>

        <div>
          {filteredNotifications.map((notification) => {
            const details = categoryDetails[notification.category];
            return (
              <article
                key={notification.id}
                className={`flex gap-4 border-b border-[#30302d] p-5 transition last:border-b-0 hover:bg-[#242422] sm:p-6 ${
                  notification.readAt ? "opacity-70" : "bg-white/2"
                }`}
              >
                <button
                  onClick={() => openNotification(notification)}
                  className="flex min-w-0 flex-1 gap-4 text-left"
                >
                  <span
                    className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${details.tone}`}
                  >
                    <Icon name={details.icon} className="h-4.5 w-4.5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-start gap-3">
                      <strong className="text-sm font-semibold text-[#e6e6df]">
                        {notification.title}
                      </strong>
                      {!notification.readAt && (
                        <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-sunset" />
                      )}
                    </span>
                    <span className="mt-2 block text-xs leading-5 text-[#92928c]">
                      {notification.body}
                    </span>
                    <span className="mt-3 flex flex-wrap items-center gap-2 text-[10px] text-[#666660]">
                      <span className="font-semibold uppercase tracking-[.08em] text-[#85857f]">
                        {details.label}
                      </span>
                      <span aria-hidden="true">•</span>
                      <span>{formatTimestamp(notification.createdAt)}</span>
                      {notification.href && (
                        <>
                          <span aria-hidden="true">•</span>
                          <span className="text-victoria">Open related item</span>
                        </>
                      )}
                    </span>
                  </span>
                </button>
                <div className="flex shrink-0 flex-col items-end gap-2">
                  <button
                    disabled={pending}
                    onClick={() => changeReadState(notification, !notification.readAt)}
                    className="rounded-lg border border-[#3c3c38] px-2.5 py-1.5 text-[9px] font-semibold text-[#a0a09a] transition hover:border-[#55554f] hover:text-white disabled:opacity-50"
                  >
                    {notification.readAt ? "Mark unread" : "Mark read"}
                  </button>
                  <button
                    disabled={pending}
                    onClick={() => removeNotification(notification)}
                    className="px-2 py-1 text-[9px] font-semibold text-[#777771] transition hover:text-sunset disabled:opacity-50"
                  >
                    Remove
                  </button>
                </div>
              </article>
            );
          })}

          {!filteredNotifications.length && (
            <div className="px-6 py-20 text-center">
              <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-[#292927] text-[#696963]">
                <Icon name="bell" className="h-5 w-5" />
              </span>
              <h2 className="mt-4 text-sm font-semibold text-[#d8d8d2]">
                {notifications.length ? "Nothing matches this view" : "No notifications yet"}
              </h2>
              <p className="mx-auto mt-2 max-w-sm text-xs leading-5 text-[#777771]">
                {notifications.length
                  ? "Change the status or category filter to see more operational updates."
                  : portalName === "Agent Access"
                    ? "Enquiry updates, inbox messages, rate assignments and account activity will appear here automatically."
                    : "Meeting invitations, schedule changes and published company updates will appear here automatically."}
              </p>
            </div>
          )}
        </div>
      </section>

      <aside className="h-fit rounded-3xl border border-[#343431] bg-[#1d1d1b] p-6 xl:sticky xl:top-26">
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-savannah/10 text-savannah">
            <Icon name="settings" className="h-4.5 w-4.5" />
          </span>
          <div>
            <h2 className="text-sm font-semibold text-white">Notification preferences</h2>
            <p className="mt-1 text-[10px] leading-4 text-[#777771]">
              Choose which operational updates reach your inbox.
            </p>
          </div>
        </div>

        <div className="mt-6 space-y-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold text-[#d9d9d3]">In-app notifications</p>
              <p className="mt-1 text-[10px] text-[#74746e]">Show alerts inside {portalName}</p>
            </div>
            <Toggle
              label="In-app notifications"
              checked={preferences.inAppEnabled}
              onChange={(inAppEnabled) =>
                setPreferences((current) => ({ ...current, inAppEnabled }))
              }
            />
          </div>

          <div className="flex items-center justify-between gap-4 border-y border-[#343431] py-5">
            <div>
              <div className="flex items-center gap-2">
                <p className="text-xs font-semibold text-[#9b9b95]">Email notifications</p>
                <span className="rounded-full bg-[#333330] px-2 py-0.5 text-[8px] font-bold uppercase tracking-[.08em] text-[#777771]">
                  Not connected
                </span>
              </div>
              <p className="mt-1 text-[10px] leading-4 text-[#666660]">
                Email delivery will be added when the mail service is connected.
              </p>
            </div>
            <Toggle label="Email notifications" checked={false} disabled onChange={() => {}} />
          </div>

          <div className="space-y-4">
            {preferenceRows.map((row) => (
              <div key={row.key} className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-medium text-[#cfcfc8]">{row.label}</p>
                  <p className="mt-1 text-[9px] leading-4 text-[#6f6f69]">{row.description}</p>
                </div>
                <Toggle
                  label={row.label}
                  checked={preferences[row.key]}
                  disabled={!preferences.inAppEnabled}
                  onChange={(checked) =>
                    setPreferences((current) => ({ ...current, [row.key]: checked }))
                  }
                />
              </div>
            ))}
          </div>
        </div>

        {feedback && (
          <p
            role="status"
            className={`mt-5 rounded-xl border px-3 py-2.5 text-[10px] leading-4 ${
              feedback.toLowerCase().includes("saved") || feedback.toLowerCase().includes("read")
                ? "border-savannah/20 bg-savannah/5 text-savannah"
                : "border-sunset/20 bg-sunset/5 text-[#f18a77]"
            }`}
          >
            {feedback}
          </p>
        )}

        <button
          disabled={pending || !preferencesChanged}
          onClick={savePreferences}
          className="mt-6 w-full rounded-xl bg-sunset px-4 py-3 text-xs font-semibold text-white transition hover:bg-[#f06a52] disabled:cursor-not-allowed disabled:opacity-40"
        >
          {pending ? "Saving…" : "Save preferences"}
        </button>
      </aside>
    </div>
  );
}
