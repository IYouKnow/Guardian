import { useEffect, useRef } from "react";
import { resolveBinding, matchesKeybind, Keybinding } from "../utils/keybinds";

export function useKeybind(
  id: string,
  handler: (e: KeyboardEvent) => void,
  deps: any[] = [],
  overrides?: Record<string, Keybinding>,
) {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    const binding = resolveBinding(id, overrides);
    if (!binding) return;

    const listener = (e: KeyboardEvent) => {
      if (matchesKeybind(e, binding)) {
        handlerRef.current(e);
      }
    };

    document.addEventListener("keydown", listener);
    return () => document.removeEventListener("keydown", listener);
  }, [id, overrides, ...deps]);
}
