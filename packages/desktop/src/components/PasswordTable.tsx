import React, { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { PasswordEntry, Theme, AccentColor } from "../types";
import { getAccentColorClasses, getAccentColorHex } from "../utils/accentColors";
import { motion } from "framer-motion";

const STATIC_COLUMNS = [
  { key: 0, label: "Service" },
  { key: 1, label: "Username" },
  { key: 2, label: "Website" },
  { key: 3, label: "Password" },
  { key: 4, label: "Notes" },
  { key: 5, label: "Actions" },
] as const;

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
  customFieldTemplates?: { name: string; type: string }[];
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
  customFieldTemplates,
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
      default:
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

  const allColumns: { key: string | number; label: string }[] = useMemo(() => {
    const cols: { key: string | number; label: string }[] = STATIC_COLUMNS.map(c => ({ key: c.key, label: c.label }));
    if (customFieldTemplates) {
      customFieldTemplates.forEach((tmpl, i) => {
        cols.push({ key: `cf_${i}`, label: tmpl.name });
      });
    }
    return cols;
  }, [customFieldTemplates]);

  const staticCount = STATIC_COLUMNS.length;

  const [failedFavicons, setFailedFavicons] = useState<Set<string>>(new Set());
  const [copiedField, setCopiedField] = useState<{ id: string; field: 'username' | 'password' } | null>(null);
  const [expandedCustomId, setExpandedCustomId] = useState<string | null>(null);
  const copiedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dragStartPos = useRef<{ x: number; y: number; id: string } | null>(null);
  const dragActive = useRef(false);

  const [colWidths, setColWidths] = useState<Record<string, number>>(() => {
    try {
      return JSON.parse(localStorage.getItem('guardian-table-col-widths') || '{}');
    } catch { return {}; }
  });

  const [colOrder, setColOrder] = useState<(string | number)[]>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('guardian-table-col-order') || 'null');
      if (Array.isArray(saved) && saved.length >= staticCount) return saved;
    } catch { /* fall through */ }
    const def: (string | number)[] = [0, 1, 2, 3, 4, 5];
    if (customFieldTemplates) {
      customFieldTemplates.forEach((_, i) => def.push(`cf_${i}`));
    }
    return def;
  });

  const headerRowRef = useRef<HTMLTableRowElement | null>(null);
  const colWidthsInit = useRef(false);

  const colDragRef = useRef<{ key: string | number } | null>(null);
  const isDraggingCol = useRef(false);
  const dropTargetRef = useRef<number | null>(null);
  const [draggedColKey, setDraggedColKey] = useState<string | number | null>(null);
  const ghostRef = useRef<HTMLDivElement>(null);
  const ghostOffsetRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    localStorage.setItem('guardian-table-col-widths', JSON.stringify(colWidths));
  }, [colWidths]);

  useEffect(() => {
    if (isDraggingCol.current) return;
    localStorage.setItem('guardian-table-col-order', JSON.stringify(colOrder));
  }, [colOrder]);

  // Sync colOrder when customFieldTemplates change (add new CF columns)
  useEffect(() => {
    setColOrder(prev => {
      const cfKeys = new Set(
        (customFieldTemplates || []).map((_, i) => `cf_${i}`)
      );
      const existing = new Set(prev);
      const missing = [...cfKeys].filter(k => !existing.has(k));
      if (missing.length === 0) return prev;
      return [...prev, ...missing];
    });
  }, [customFieldTemplates]);

  useEffect(() => {
    if (colWidthsInit.current) return;
    const row = headerRowRef.current;
    if (!row) return;
    const ths = row.querySelectorAll<HTMLElement>('th[data-col-index]');
    if (ths.length === 0) return;
    const current = { ...colWidths };
    let changed = false;
    ths.forEach((th) => {
      const idx = th.getAttribute('data-col-index') || '0';
      if (current[idx] === undefined) {
        current[idx] = th.offsetWidth;
        changed = true;
      }
    });
    if (changed) setColWidths(current);
    colWidthsInit.current = true;
  }, [allColumns.length]);

  const handleCopy = useCallback((id: string, field: 'username' | 'password', value: string, handler: (v: string) => void) => {
    handler(value);
    setCopiedField({ id, field });
    if (copiedTimer.current) clearTimeout(copiedTimer.current);
    copiedTimer.current = setTimeout(() => setCopiedField(null), 1500);
  }, []);

  const renderCell = (colKey: string | number, password: PasswordEntry) => {
    if (typeof colKey === 'string' && colKey.startsWith('cf_')) {
      const idx = parseInt(colKey.slice(3), 10);
      const tmpl = customFieldTemplates?.[idx];
      const cf = tmpl ? password.customFields?.find(f => f.name === tmpl.name) : undefined;
      return (
        <td key={`${password.id}-${colKey}`} className={`${sizeClasses.cellPadding} overflow-hidden`}>
          <span className={`${themeClasses.textMuted} ${sizeClasses.textSize} truncate block`}>
            {cf?.value || "—"}
          </span>
        </td>
      );
    }
    switch (colKey) {
      case 0:
        return (
          <motion.td key={`${password.id}-col-0`} layout className={`${sizeClasses.cellPadding} overflow-hidden`}>
            <div className={`flex items-center ${sizeClasses.gap}`}>
              <div className={`${sizeClasses.iconSize} rounded-xl flex-shrink-0 ${selectedId === password.id ? 'bg-black/10' : accentClasses.bgClass} flex items-center justify-center shadow-lg ${accentClasses.shadowClass} transition-transform group-hover:scale-110 duration-300`}>
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
          </motion.td>
        );
      case 1:
        return (
          <motion.td key={`${password.id}-col-1`} layout className={`${sizeClasses.cellPadding} overflow-hidden`}>
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
          </motion.td>
        );
      case 2:
        return (
          <motion.td key={`${password.id}-col-2`} layout className={`${sizeClasses.cellPadding} overflow-hidden`}>
            <span className={`${themeClasses.textMuted} ${sizeClasses.textSize} opacity-70 truncate block`}>{password.website}</span>
          </motion.td>
        );
      case 3:
        return (
          <motion.td key={`${password.id}-col-3`} layout className={`${sizeClasses.cellPadding} overflow-hidden`}>
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
          </motion.td>
        );
      case 4:
        return (
          <motion.td key={`${password.id}-col-4`} layout className={`${sizeClasses.cellPadding} overflow-hidden`}>
            <span className={`text-xs ${themeClasses.textMuted} truncate block max-w-[100px]`}>
              {password.notes || "—"}
            </span>
          </motion.td>
        );
      case 5:
        return (
          <motion.td key={`${password.id}-col-5`} layout className={`${sizeClasses.cellPadding} overflow-hidden`}>
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
          </motion.td>
        );
    }
  };

  const saveColOrder = useCallback((order: (string | number)[]) => {
    localStorage.setItem('guardian-table-col-order', JSON.stringify(order));
  }, []);

  const handleColDragStart = (e: React.MouseEvent, colKey: string | number) => {
    e.stopPropagation();

    const thEl = e.currentTarget as HTMLElement;
    const rect = thEl.getBoundingClientRect();

    colDragRef.current = { key: colKey };
    isDraggingCol.current = true;
    setDraggedColKey(colKey);

    ghostOffsetRef.current = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };

    if (ghostRef.current) {
      ghostRef.current.style.width = `${rect.width}px`;
      ghostRef.current.style.left = `${e.clientX - ghostOffsetRef.current.x}px`;
      ghostRef.current.style.top = `${e.clientY - ghostOffsetRef.current.y}px`;
    }

    const accentHex = getAccentColorHex(accentColor, theme);

    document.body.style.userSelect = "none";
    document.body.style.cursor = "grabbing";

    const positionIndicator = (clientX: number) => {
      const row = headerRowRef.current;
      if (!row) return;
      const ths = Array.from(row.querySelectorAll<HTMLElement>('th[data-col-index]'));
      if (ths.length === 0) return;

      let targetIdx = 0;
      for (let i = 0; i < ths.length; i++) {
        const rect = ths[i].getBoundingClientRect();
        const mid = rect.left + rect.width / 2;
        if (clientX < mid) {
          targetIdx = i;
          break;
        }
        targetIdx = i + 1;
      }

      dropTargetRef.current = targetIdx;

      // Reset all resize handle spans
      row.querySelectorAll<HTMLElement>('.cursor-col-resize span').forEach(s => {
        s.style.opacity = '';
        s.style.width = '';
        s.style.background = '';
      });
      ths.forEach(th => { th.style.borderRight = ''; th.style.borderLeft = ''; });
      if (targetIdx === 0) {
        ths[0].style.borderLeft = `2px solid ${accentHex}`;
      } else if (targetIdx < ths.length) {
        const prev = ths[targetIdx - 1];
        const handle = prev.querySelector<HTMLElement>('.cursor-col-resize span');
        if (handle) {
          handle.style.opacity = '1';
          handle.style.width = '2px';
          handle.style.background = accentHex;
        } else {
          prev.style.borderRight = `2px solid ${accentHex}`;
        }
      }
    };

    positionIndicator(e.clientX);

    const onMove = (ev: MouseEvent) => {
      if (!colDragRef.current) return;

      if (ghostRef.current) {
        ghostRef.current.style.left = `${ev.clientX - ghostOffsetRef.current.x}px`;
        ghostRef.current.style.top = `${ev.clientY - ghostOffsetRef.current.y}px`;
      }

      positionIndicator(ev.clientX);
    };

    const onUp = () => {
      const key = colDragRef.current?.key;
      const targetIdx = dropTargetRef.current;
      colDragRef.current = null;
      isDraggingCol.current = false;
      dropTargetRef.current = null;
      setDraggedColKey(null);

      const row = headerRowRef.current;
      if (row) {
        row.querySelectorAll<HTMLElement>('th[data-col-index]').forEach(th => {
          th.style.borderRight = '';
          th.style.borderLeft = '';
        });
        row.querySelectorAll<HTMLElement>('.cursor-col-resize span').forEach(s => {
          s.style.opacity = '';
          s.style.width = '';
          s.style.background = '';
        });
      }

      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      document.body.style.userSelect = "";
      document.body.style.cursor = "";

      if (key !== undefined && targetIdx !== null) {
        setColOrder(prev => {
          const from = prev.indexOf(key);
          if (from === -1 || targetIdx === from || targetIdx === from + 1) {
            saveColOrder(prev);
            return prev;
          }
          const next = [...prev];
          next.splice(from, 1);
          const insertAt = from < targetIdx ? targetIdx - 1 : targetIdx;
          next.splice(insertAt, 0, key);
          saveColOrder(next);
          return next;
        });
      }
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  };

  return (
    <>
    {draggedColKey !== null && allColumns.find(c => c.key === draggedColKey) && (
      <div
        ref={ghostRef}
        className={`fixed pointer-events-none z-50 ${sizeClasses.headerPadding} ${themeClasses.headerBg} ${themeClasses.headerText} text-[0.65rem] font-bold uppercase tracking-widest truncate rounded-lg shadow-2xl border ${themeClasses.rowBorder} opacity-95 transition-all duration-200 ease-out`}
      >
        {allColumns.find(c => c.key === draggedColKey)!.label}
      </div>
    )}
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`w-full overflow-hidden rounded-2xl ${themeClasses.wrapper} relative`}
      data-table="password-table"
    >
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse table-fixed">
          <thead>
            <tr ref={headerRowRef} className={`border-b ${themeClasses.rowBorder} ${themeClasses.headerBg}`}>
              {colOrder.map((colKey) => {
                const col = allColumns.find(c => c.key === colKey)!;
                const isResizable = colKey !== 5;
                return (
                  <motion.th
                    key={colKey}
                    layout
                    data-col-index={colKey}
                    className={`${sizeClasses.headerPadding} ${themeClasses.headerText} text-[0.65rem] font-bold uppercase tracking-widest overflow-hidden truncate ${!isResizable ? 'text-right' : 'relative'} cursor-grab active:cursor-grabbing select-none ${draggedColKey === colKey ? `${accentClasses.textClass} opacity-90` : ''}`}
                    style={colWidths[colKey] ? { width: colWidths[colKey], minWidth: 60 } : { width: 120, minWidth: 80 }}
                    onMouseDown={(e) => handleColDragStart(e, colKey)}
                  >
                    {col.label}
                    {isResizable && (
                      <div
                        className="absolute right-0 top-0 bottom-0 w-5 cursor-col-resize z-20 flex items-center justify-center touch-none select-none"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          const th = (e.currentTarget as HTMLElement).parentElement;
                          if (!th || !th.hasAttribute('data-col-index')) return;
                          const idx = th.getAttribute('data-col-index') || '0';
                          const startX = e.clientX;
                          const startWidth = th.offsetWidth;

                          const row = th.parentElement;
                          if (row) {
                            const locked: Record<string, number> = {};
                            row.querySelectorAll<HTMLElement>('th[data-col-index]').forEach((c) => {
                              const ci = c.getAttribute('data-col-index') || '0';
                              locked[ci] = c.offsetWidth;
                            });
                            setColWidths(locked);
                          }

                          document.body.style.userSelect = "none";
                          document.body.style.cursor = "col-resize";

                          const onMove = (ev: MouseEvent) => {
                            const diff = ev.clientX - startX;
                            setColWidths(prev => ({ ...prev, [idx]: Math.max(50, startWidth + diff) }));
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
                  </motion.th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {passwords.map((password, idx) => (
              <React.Fragment key={password.id ?? idx}>
              <tr
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
                {colOrder.map((colKey) => renderCell(colKey, password))}
              </tr>
              {password.customFields && password.customFields.length > 0 && (!customFieldTemplates || customFieldTemplates.length === 0) && (
                <tr
                  onClick={() => setExpandedCustomId(expandedCustomId === password.id ? null : password.id)}
                  className={`border-b last:border-0 ${themeClasses.rowBorder} cursor-pointer ${expandedCustomId === password.id ? '' : 'hidden'}`}
                >
                  <td colSpan={colOrder.length + (customFieldTemplates?.length || 0)} className="px-6 py-3">
                    <div className="flex flex-wrap gap-3">
                      {password.customFields.map((f, i) => (
                        <div key={i} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${themeClasses.badge} text-[0.6rem]`}>
                          <span className={`font-bold uppercase tracking-wider ${themeClasses.textMuted}`}>{f.name}</span>
                          <span className={`font-medium ${themeClasses.text}`}>{f.value}</span>
                        </div>
                      ))}
                    </div>
                  </td>
                </tr>
              )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </motion.div>
    </>
  );
}
