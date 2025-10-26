"use client";

import { useEffect, useState } from "react";

export type UploadNotification = {
  id: string;
  type: "success" | "error" | "info";
  title: string;
  message: string;
  timestamp: Date;
};

interface UploadStatusProps {
  notifications: UploadNotification[];
  onDismiss: (id: string) => void;
}

export function UploadStatus({ notifications, onDismiss }: UploadStatusProps) {
  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-2 w-96 max-w-full">
      {notifications.map((notification) => (
        <NotificationItem
          key={notification.id}
          notification={notification}
          onDismiss={onDismiss}
        />
      ))}
    </div>
  );
}

function NotificationItem({
  notification,
  onDismiss,
}: {
  notification: UploadNotification;
  onDismiss: (id: string) => void;
}) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(() => onDismiss(notification.id), 300);
    }, 5000);

    return () => clearTimeout(timer);
  }, [notification.id, onDismiss]);

  const colors = {
    success: "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800",
    error: "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800",
    info: "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800",
  };

  const iconColors = {
    success: "text-green-600 dark:text-green-400",
    error: "text-red-600 dark:text-red-400",
    info: "text-blue-600 dark:text-blue-400",
  };

  const icons = {
    success: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    ),
    error: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    ),
    info: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    ),
  };

  return (
    <div
      className={`transform rounded-lg border p-4 shadow-lg transition-all duration-300 ${
        colors[notification.type]
      } ${isVisible ? "translate-x-0 opacity-100" : "translate-x-full opacity-0"}`}
    >
      <div className="flex items-start">
        <div className={`flex-shrink-0 ${iconColors[notification.type]}`}>
          {icons[notification.type]}
        </div>
        <div className="ml-3 flex-1">
          <p className="text-sm font-medium text-gray-900 dark:text-white">
            {notification.title}
          </p>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
            {notification.message}
          </p>
        </div>
        <button
          onClick={() => {
            setIsVisible(false);
            setTimeout(() => onDismiss(notification.id), 300);
          }}
          className="ml-4 inline-flex flex-shrink-0 text-gray-400 hover:text-gray-500 focus:outline-none dark:text-gray-500 dark:hover:text-gray-400"
        >
          <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path
              fillRule="evenodd"
              d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
              clipRule="evenodd"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}

// Hook for managing notifications
export function useNotifications() {
  const [notifications, setNotifications] = useState<UploadNotification[]>([]);

  const addNotification = (
    type: UploadNotification["type"],
    title: string,
    message: string
  ) => {
    const notification: UploadNotification = {
      id: Date.now().toString(),
      type,
      title,
      message,
      timestamp: new Date(),
    };
    setNotifications((prev) => [...prev, notification]);
  };

  const dismissNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  return {
    notifications,
    addNotification,
    dismissNotification,
  };
}
