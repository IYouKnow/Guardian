import { useState, useRef, useCallback, useEffect } from "react";
import { PasswordEntry, Theme, AccentColor } from "../types";
import { getAccentColorClasses } from "../utils/accentColors";
import { motion } from "framer-motion";

interface PasswordTableProps {
  passwords: PasswordEntry[];
  onCopyUsername: (username: string) => void;
  onCopyPassword: (password: string) => void;
  onDelete: (id: string) => void;
  onContextMenu?: (x: number, y: number, password: PasswordEntry) => void;
  onDoubleClick?: (password: PasswordEntry) => void;
  onDragStart?: (passwordId: string, clientX: number, clientY: number) => void;
  selectedId?: string | null;
  onSelect?: (id: string | null) => void;
  theme: Theme;
  itemSize: "small" | "medium" | "large";
  accentColor: AccentColor;
}

export default function PasswordTable({
  passwords,
  onCopyUsername,
  onCopyPassword,
  onDelete,
  onContextMenu,
  onDoubleClick,
  onDragStart,
  selectedId,
  onSelect,
  theme,
  itemSize,
  accentColor,
}: PasswordTableProps) {
  const getSizeClasses = () => {
    if (itemSize === "small") {
      return {
        headerPadding: "py-3 px-4",
        cellPadding: "py-2 px-4",
        iconSize: "w-8 h-8",
        iconText: "text-xs",
        textSize: "text-xs",
        gap: "gap-3",
      };
    } else if (itemSize === "large") {
      return {
        headerPadding: "py-5 px-6",
        cellPadding: "py-5 px-6",
        iconSize: "w-12 h-12",
        iconText: "text-lg",
        textSize: "text-base",
        gap: "gap-5",
      };
    } else {
      return {
        headerPadding: "py-4 px-6",
        cellPadding: "py-3.5 px-6",
        iconSize: "w-10 h-10",
        iconText: "text-sm",
        textSize: "text-sm",
        gap: "gap-4",
      };
    }
  };

  const sizeClasses = getSizeClasses();

  const getThemeClasses = () => {
    switch (theme) {
      case "light":
        return {
          wrapper: "bg-white/50 backdrop-blur-xl border border-slate-200/60 shadow-xl shadow-slate-200/20",
          headerBg: "bg-slate-50/50",
          headerText: "text-slate-400",
          rowBorder: "border-slate-100",
          rowHover: "hover:bg-slate-50",
          text: "text-slate-700",
          textMuted: "text-slate-400",
          textTertiary: "text-slate-300",
          badge: "bg-slate-100 text-slate-600 border-slate-200",
        };
      case "slate":
        return {
          wrapper: "bg-slate-900/40 backdrop-blur-xl border border-slate-800/60 shadow-xl shadow-black/20",
          headerBg: "bg-slate-900/30",
          headerText: "text-slate-500",
          rowBorder: "border-slate-800/50",
          rowHover: "hover:bg-slate-800/30",
          text: "text-slate-200",
          textMuted: "text-slate-500",
          textTertiary: "text-slate-600",
          badge: "bg-slate-800/50 text-slate-300 border-slate-700/50",
        };
      case "violet":
        return {
          wrapper: "bg-[#120a1f]/60 backdrop-blur-xl border border-[#4a3a6b]/30 shadow-xl shadow-black/20",
          headerBg: "bg-[#120a1f]/30",
          headerText: "text-[#6272a4]",
          rowBorder: "border-[#4a3a6b]/20",
          rowHover: "hover:bg-[#23173a]/40",
          text: "text-[#f8f8f2]",
          textMuted: "text-[#6272a4]",
          textTertiary: "text-[#4a3a6b]",
          badge: "bg-[#23173a]/50 text-[#c9a0dc] border-[#4a3a6b]/30",
        };
      default: // dark
        return {
          wrapper: "bg-[#0a0a0a]/60 backdrop-blur-xl border border-white/5 shadow-xl shadow-black/40",
          headerBg: "bg-white/[0.02]",
          headerText: "text-zinc-500",
          rowBorder: "border-white/5",
          rowHover: "hover:bg-white/[0.03]",
          text: "text-zinc-200",
          textMuted: "text-zinc-500",
          textTertiary: "text-zinc-700",
          badge: "bg-white/5 text-zinc-400 border-white/5",
        };
    }
  };

  const themeClasses = getThemeClasses();
  const accentClasses = getAccentColorClasses(accentColor, theme);
  const [failedFavicons, setFailedFavicons] = useState<Set<string>>(new Set());
  const [copiedField, setCopiedField] = useState<{ id: string; field: 'username' | 'password' } | null>(null);
  const copiedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dragStartPos = useRef<{ x: number; y: number; id: string } | null>(null);
  const dragActive = useRef(false);
  const [colWidths, setColWidths] = useState<Record<number, number>>(() => {
    try {
      return JSON.parse(localStorage.getItem('guardian-table-col-widths') || '{}');
    } catch { return {}; }
  });
  const headerRowRef = useRef<HTMLTableRowElement | null>(null);
  const colWidthsInit = useRef(false);

  // Persist widths to localStorage
  useEffect(() => {
    localStorage.setItem('guardian-table-col-widths', JSON.stringify(colWidths));
  }, [colWidths]);

  // Capture natural widths on first render for columns not yet in localStorage
  useEffect(() => {
    if (colWidthsInit.current) return;
    const row = headerRowRef.current;
    if (!row) return;
    const ths = row.querySelectorAll('th[data-col-index]');
    if (ths.length === 0) return;
    const current = { ...colWidths };
    let changed = false;
    ths.forEach((th) => {
      const idx = parseInt((th as HTMLElement).getAttribute('data-col-index') || '0');
      if (current[idx] === undefined) {
        current[idx] = (th as HTMLElement).offsetWidth;
        changed = true;
      }
    });
    if (changed) setColWidths(current);
    colWidthsInit.current = true;
  }, []);

  const handleCopy = useCallback((id: string, field: 'username' | 'password', value: string, handler: (v: string) => void) => {
    handler(value);
    setCopiedField({ id, field });
    if (copiedTimer.current) clearTimeout(copiedTimer.current);
    copiedTimer.current = setTimeout(() => setCopiedField(null), 1500);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`w-full overflow-hidden rounded-2xl ${themeClasses.wrapper}`}
      data-table="password-table"
    >
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse table-fixed">
              <thead>
                <tr ref={headerRowRef} className={`border-b ${themeClasses.rowBorder} ${themeClasses.headerBg}`}>
                  {['Service', 'Username', 'Website', 'Password', 'Website', 'Actions'].map((label, i) => (
                    <th
                      key={`col-${i}`}
                      data-col-index={i}
                      className={`${sizeClasses.headerPadding} ${themeClasses.headerText} text-[0.65rem] font-bold uppercase tracking-widest overflow-hidden ${i < 5 ? 'relative' : 'text-right'}`}
                      style={colWidths[i] ? { width: colWidths[i], minWidth: 60 } : undefined}
                    >
                      {label}
                      {i < 5 && (
                        <div
                          className="absolute right-0 top-0 bottom-0 w-5 cursor-col-resize z-20 flex items-center justify-center touch-none select-none"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            const th = (e.currentTarget as HTMLElement).parentElement;
                            if (!th || !th.hasAttribute('data-col-index')) return;
                            const idx = parseInt(th.getAttribute('data-col-index') || '0');
                            const startX = e.clientX;
                            const startWidth = th.offsetWidth;

                            // Lock all columns at their current widths
                            const row = th.parentElement;
                            if (row) {
                              const locked: Record<number, number> = {};
                              row.querySelectorAll('th[data-col-index]').forEach((c, i) => {
                                const ci = parseInt((c as HTMLElement).getAttribute('data-col-index') || String(i));
                                locked[ci] = (c as HTMLElement).offsetWidth;
                              });
                              setColWidths(locked);
                            }

                            document.body.style.userSelect = "none";
                            document.body.style.cursor = "col-resize";

                            const onMove = (ev: MouseEvent) => {
                              const diff = ev.clientX - startX;
                              setColWidths(prev => ({ ...prev, [idx]: Math.max(80, startWidth + diff) }));
                            };
                            const onUp = () => {
                              document.removeEventListener('mousemove', onMove);
                              document.removeEventListener('mouseup', onUp);
                              document.body.style.userSelect = "";
                              document.body.style.cursor = "";
                            };
                            document.addEventListener('mousemove', onMove);
                            document.addEventListener('mouseup', onUp);
                          }}
                        >
                          <span className="w-px h-5 bg-current opacity-15 pointer-events-none" />
                        </div>
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
          <tbody>
            {passwords.map((password) => (
              <tr
                key={password.id}
                data-password-id={password.id}
                onClick={() => { if (!dragActive.current) onSelect?.(selectedId === password.id ? null : password.id); dragActive.current = false; }}
                onDoubleClick={() => { if (!dragActive.current) onDoubleClick?.(password); }}
                onContextMenu={onContextMenu ? (e) => { e.preventDefault(); onContextMenu(e.clientX, e.clientY, password); } : undefined}
                onPointerDown={(e) => { dragStartPos.current = { x: e.clientX, y: e.clientY, id: password.id }; }}
                onPointerMove={(e) => {
                  const start = dragStartPos.current;
                  if (!start || start.id !== password.id) return;
                  const dx = e.clientX - start.x;
                  const dy = e.clientY - start.y;
                  if (dx * dx + dy * dy > 64) {
                    dragStartPos.current = null;
                    dragActive.current = true;
                    onDragStart?.(password.id, e.clientX, e.clientY);
                  }
                }}
                onPointerUp={() => { dragStartPos.current = null; }}
                className={`group border-b last:border-0 ${themeClasses.rowBorder} transition-all duration-200 cursor-pointer ${selectedId === password.id ? `${accentClasses.lightClass}` : themeClasses.rowHover}`}
              >
                {/* Service */}
                <td className={`${sizeClasses.cellPadding} overflow-hidden`}>
                  <div className={`flex items-center ${sizeClasses.gap}`}>
                    <div className={`${sizeClasses.iconSize} rounded-xl ${selectedId === password.id ? 'bg-black/10' : accentClasses.bgClass} flex items-center justify-center shadow-lg ${accentClasses.shadowClass} transition-transform group-hover:scale-110 duration-300`}>
                      {password.favicon && !failedFavicons.has(password.id) ? (
                        <img
                          src={password.favicon}
                          alt=""
                          className="w-full h-full object-cover rounded-xl"
                          onError={() => {
                            setFailedFavicons((current) => {
                              const next = new Set(current);
                              next.add(password.id);
                              return next;
                            });
                          }}
                        />
                      ) : (
                        <span className={`font-bold ${accentClasses.onContrastClass} ${sizeClasses.iconText}`}>
                          {password.title.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className={`font-semibold ${themeClasses.text} ${sizeClasses.textSize} leading-tight truncate`}>{password.title}</div>
                      {password.favorite && (
                        <div className={`text-[0.6rem] font-bold uppercase tracking-wider ${accentClasses.textClass} mt-0.5 truncate`}>Favorite</div>
                      )}
                    </div>
                  </div>
                </td>

                {/* Username */}
                <td className={`${sizeClasses.cellPadding} overflow-hidden`}>
                  <div className={`flex items-center gap-2 group/field cursor-pointer`} onClick={(e) => { e.stopPropagation(); handleCopy(password.id, 'username', password.username, onCopyUsername); }}>
                    <span className={`${themeClasses.textMuted} ${sizeClasses.textSize} transition-colors truncate`}>
                      {password.username}
                    </span>
                    {copiedField?.id === password.id && copiedField?.field === 'username' ? (
                      <svg className={`w-3.5 h-3.5 text-green-400`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <svg className={`w-3 h-3 ${themeClasses.textMuted} opacity-0 group-hover/field:opacity-100 transition-all`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    )}
                  </div>
                </td>

                {/* Website */}
                <td className={`${sizeClasses.cellPadding} overflow-hidden`}>
                  <span className={`${themeClasses.textMuted} ${sizeClasses.textSize} opacity-70 truncate block`}>{password.website}</span>
                </td>

                {/* Password */}
                <td className={`${sizeClasses.cellPadding} overflow-hidden`}>
                  <div className={`flex items-center gap-2 group/field cursor-pointer`} onClick={(e) => { e.stopPropagation(); handleCopy(password.id, 'password', password.password, onCopyPassword); }}>
                    <span className={`${themeClasses.textTertiary} text-lg tracking-widest leading-none mt-1.5 transition-colors`}>
                      ••••••••
                    </span>
                    {copiedField?.id === password.id && copiedField?.field === 'password' ? (
                      <svg className={`w-3.5 h-3.5 text-green-400`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <svg className={`w-3 h-3 ${themeClasses.textMuted} opacity-0 group-hover/field:opacity-100 transition-all`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    )}
                  </div>
                </td>

                {/* Website */}
                <td className={`${sizeClasses.cellPadding} overflow-hidden`}>
                  <span className={`text-xs ${themeClasses.textMuted} truncate block max-w-[150px]`}>
                    {password.website || "—"}
                  </span>
                </td>

                {/* Actions */}
                <td className={`${sizeClasses.cellPadding} overflow-hidden`}>
                  <div className="flex justify-end">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(password.id);
                      }}
                      className={`p-2 rounded-lg hover:bg-red-500/10 text-red-500/50 hover:text-red-500 transition-colors`}
                      title="Delete Entry"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
}
