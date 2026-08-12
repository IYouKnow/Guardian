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
    <div className="fixed bottom-6 right-6 z-50 flex flex-col-reverse gap-3 min-w-[320px] max-w-sm pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`
            ${theme === 'light' ? 'bg-[#18181b] text-white' : 'bg-[#18181b] text-white'} 
            border border-white/10 shadow-2xl rounded-lg px-4 py-3.5 flex items-center gap-3.5 
            pointer-events-auto transform transition-all duration-300 animate-slide-in-from-right hover:scale-[1.02]
          `}
        >
          <div
            className={`w-1 h-5 rounded-full ${getToastColorClasses(toast.type)} shadow-[0_0_10px_rgba(0,0,0,0.5)] flex-shrink-0`}
          />
          <p className="flex-1 text-sm font-bold tracking-tight">{toast.message}</p>
          <button
            onClick={() => onRemove(toast.id)}
            className="flex-shrink-0 w-5 h-5 flex items-center justify-center text-zinc-500 hover:text-white transition-colors"
            aria-label="Close toast"
          >
            <svg
              className="w-3.5 h-3.5"
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

