import type { NotificationView } from "./notification-service";

export const notificationRealtimeEvent = "shearwater:notification-realtime";

export interface NotificationRealtimeDetail {
  type: "INSERT";
  notification: NotificationView;
}

export function publishNotificationRealtime(detail: NotificationRealtimeDetail) {
  window.dispatchEvent(
    new CustomEvent<NotificationRealtimeDetail>(notificationRealtimeEvent, {
      detail,
    }),
  );
}
