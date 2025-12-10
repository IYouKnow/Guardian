import { Toast } from "../hooks/useToast";
import { getAccentColorClasses } from "../utils/accentColors";
import { AccentColor, Theme } from "../types";

interface ToastContainerProps {
  toasts: Toast[];
  onRemove: (id: string) => void;
  theme: Theme;
  accentColor: AccentColor;
}

export default function ToastContainer({
  toasts,
  onRemove,
  theme,
  accentColor,
}: ToastContainerProps) {
  const getThemeClasses = () => {
    if (theme === "light") {
      return {
        bg: "bg-white",
        text: "text-gray-800",
        border: "border-gray-200",
        shadow: "shadow-lg",
      };
    } else {
      return {
        bg: "bg-gray-800",
        text: "text-white",
        border: "border-gray-700",
        shadow: "shadow-lg",
      };
    }
  };

  const themeClasses = getThemeClasses();
  const accentClasses = getAccentColorClasses(accentColor);

  const getToastColorClasses = (type: Toast["type"]) => {
    switch (type) {
      case "success":
        return "bg-green-500";
      case "error":
        return "bg-red-500";
      case "warning":
        return "bg-yellow-500";
      case "info":
      default:
        return accentClasses.bgClass;
    }
  };

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-md">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`
            ${themeClasses.bg} ${themeClasses.text} ${themeClasses.border} ${themeClasses.shadow}
            border rounded-lg px-4 py-3 flex items-center gap-3 animate-slide-in-from-right
            backdrop-blur-sm
          `}
        >
          <div
            className={`w-1 h-6 rounded-full ${getToastColorClasses(toast.type)} flex-shrink-0`}
          />
          <p className="flex-1 text-sm font-medium">{toast.message}</p>
          <button
            onClick={() => onRemove(toast.id)}
            className={`
              flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center
              ${themeClasses.text} hover:bg-black/10 dark:hover:bg-white/10
              transition-colors
            `}
            aria-label="Close toast"
          >
            <svg
              className="w-3 h-3"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
      ))}
    </div>
  );
}

