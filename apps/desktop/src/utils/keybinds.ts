export interface Keybinding {
  key: string;
  ctrl?: boolean;
  alt?: boolean;
  shift?: boolean;
  meta?: boolean;
}

export interface KeybindEntry {
  id: string;
  label: string;
  default: Keybinding;
  current: Keybinding;
}

const DEFAULTS: KeybindEntry[] = [
  { id: 'search', label: 'Search vault entries', default: { key: 'f', ctrl: true, meta: true }, current: { key: 'f', ctrl: true, meta: true } },
  { id: 'reorder-up', label: 'Reorder entry up', default: { key: 'ArrowUp', alt: true }, current: { key: 'ArrowUp', alt: true } },
  { id: 'reorder-down', label: 'Reorder entry down', default: { key: 'ArrowDown', alt: true }, current: { key: 'ArrowDown', alt: true } },
  { id: 'delete-folder', label: 'Delete active folder', default: { key: 'Delete' }, current: { key: 'Delete' } },
];

export function loadKeybinds(): KeybindEntry[] {
  return DEFAULTS.map((entry) => ({ ...entry, current: { ...entry.default } }));
}

export function resolveBinding(id: string, overrides?: Record<string, Keybinding>): Keybinding | undefined {
  const entry = DEFAULTS.find((e) => e.id === id);
  if (!entry) return undefined;
  if (overrides && overrides[id]) {
    return { ...entry.default, ...overrides[id] };
  }
  return entry.default;
}

export function matchesKeybind(e: KeyboardEvent, binding: Keybinding): boolean {
  if (e.key.toLowerCase() !== binding.key.toLowerCase()) return false;

  const hasCtrlOrMeta = e.ctrlKey || e.metaKey;
  const wantsCtrlOrMeta = binding.ctrl || binding.meta;

  if (wantsCtrlOrMeta && !hasCtrlOrMeta) return false;
  if (!wantsCtrlOrMeta && hasCtrlOrMeta) return false;
  if (binding.alt && !e.altKey) return false;
  if (!binding.alt && e.altKey) return false;
  if (binding.shift && !e.shiftKey) return false;
  if (!binding.shift && e.shiftKey) return false;

  return true;
}

export function formatKeybind(binding: Keybinding): string {
  const parts: string[] = [];
  if (binding.ctrl && binding.meta) {
    parts.push('Ctrl/Cmd');
  } else {
    if (binding.meta) parts.push('Cmd');
    if (binding.ctrl) parts.push('Ctrl');
  }
  if (binding.alt) parts.push('Alt');
  if (binding.shift) parts.push('Shift');
  const keyMap: Record<string, string> = {
    'arrowup': '\u2191',
    'arrowdown': '\u2193',
    'arrowleft': '\u2190',
    'arrowright': '\u2192',
    'delete': 'Delete',
    'backspace': 'Backspace',
    'enter': 'Enter',
    'escape': 'Escape',
    ' ': 'Space',
  };
  parts.push(keyMap[binding.key.toLowerCase()] || binding.key.toUpperCase());
  return parts.join('+');
}
