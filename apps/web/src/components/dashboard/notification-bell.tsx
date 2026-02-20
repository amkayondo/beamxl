"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { api } from "@/trpc/react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function timeAgo(date: Date | string): string {
  const now = Date.now();
  const then = new Date(date).getTime();
  const seconds = Math.floor((now - then) / 1000);

  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function notificationTypeIcon(type: string): string {
  switch (type) {
    case "PAYMENT_RECEIVED":
      return "\u2713";
    case "CONTACT_REPLIED":
      return "\u2709";
    case "CONTACT_OPTED_OUT":
      return "\u2298";
    case "AUTOMATION_FAILED":
      return "!";
    case "FLOW_COMPLETED":
      return "\u25B6";
    case "IMPORT_COMPLETED":
      return "\u21E7";
    case "COMPLIANCE_BLOCKED":
      return "\u26A0";
    default:
      return "\u2022";
  }
}

export function NotificationBell({ orgId }: { orgId: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const { data: unreadData } = api.notifications.unreadCount.useQuery(
    { orgId },
    { refetchInterval: 30000 },
  );

  const { data: listData, refetch: refetchList } =
    api.notifications.list.useQuery(
      { orgId, pageSize: 20 },
      { enabled: isOpen },
    );

  const utils = api.useUtils();

  const markReadMutation = api.notifications.markRead.useMutation({
    onSuccess: () => {
      void utils.notifications.unreadCount.invalidate({ orgId });
      void refetchList();
    },
  });

  const markAllReadMutation = api.notifications.markAllRead.useMutation({
    onSuccess: () => {
      void utils.notifications.unreadCount.invalidate({ orgId });
      void refetchList();
    },
  });

  const unreadCount = unreadData?.count ?? 0;

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  function handleNotificationClick(notification: {
    id: string;
    link?: string | null;
    readAt?: Date | string | null;
  }) {
    if (!notification.readAt) {
      markReadMutation.mutate({ orgId, notificationId: notification.id });
    }
    if (notification.link) {
      setIsOpen(false);
      router.push(notification.link);
    }
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <Button
        variant="ghost"
        size="sm"
        className="relative h-9 w-9 p-0"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label="Notifications"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
          <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
        </svg>

        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </Button>

      {isOpen && (
        <div className="absolute right-0 top-full z-50 mt-2 w-96 overflow-hidden rounded-lg border border-border bg-background shadow-lg">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <h3 className="text-sm font-semibold">Notifications</h3>
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-auto px-2 py-1 text-xs text-muted-foreground"
                onClick={() => markAllReadMutation.mutate({ orgId })}
                disabled={markAllReadMutation.isPending}
              >
                Mark all read
              </Button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {!listData?.items.length ? (
              <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                No notifications yet
              </div>
            ) : (
              listData.items.map((notification) => (
                <button
                  key={notification.id}
                  className={cn(
                    "flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-accent/50",
                    !notification.readAt && "bg-accent/20",
                  )}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-sm">
                    {notificationTypeIcon(notification.type)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p
                        className={cn(
                          "text-sm",
                          !notification.readAt && "font-semibold",
                        )}
                      >
                        {notification.title}
                      </p>
                      {!notification.readAt && (
                        <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-blue-500" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {notification.body}
                    </p>
                    <p className="mt-1 text-[11px] text-muted-foreground/70">
                      {timeAgo(notification.createdAt)}
                    </p>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
