import React, { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { PasswordEntry, Theme, AccentColor } from "../types";
import { getAccentColorClasses, getAccentColorHex } from "../utils/accentColors";
import { motion } from "framer-motion";
import { useVirtualizer } from "@tanstack/react-virtual";

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
        headerPadding: "py-[22px] px-6",
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

  const rowEstimate = useMemo(() => {
    switch (itemSize) {
      case "small": return 40;
      case "large": return 60;
      default: return 52;
    }
  }, [itemSize]);

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

  const headerRowRef = useRef<HTMLDivElement | null>(null);
  const colMinWidthsRef = useRef<Record<string, number>>({});
  const colWidthsInit = useRef(false);
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: passwords.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => rowEstimate,
    overscan: 5,
  });

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
    if (!headerRowRef.current) return;
    const children = headerRowRef.current.querySelectorAll<HTMLElement>('[data-col-index]');
    if (children.length === 0) return;
    const current = { ...colWidths };
    let changed = false;
    children.forEach((el) => {
      const idx = el.getAttribute('data-col-index') || '0';
      if (current[idx] === undefined) {
        current[idx] = el.offsetWidth;
        changed = true;
      }
    });
    if (changed) setColWidths(current);
    colWidthsInit.current = true;
  }, [allColumns.length, colWidths]);

  useEffect(() => {
    const el = document.createElement('span');
    const sample = headerRowRef.current?.querySelector<HTMLElement>('[data-col-index]');
    if (sample) {
      const style = getComputedStyle(sample);
      el.style.font = style.font;
      el.style.fontSize = style.fontSize;
      el.style.fontWeight = style.fontWeight;
      el.style.letterSpacing = style.letterSpacing;
      el.style.textTransform = style.textTransform;
      el.style.visibility = 'hidden';
      el.style.position = 'fixed';
      el.style.whiteSpace = 'nowrap';
      el.style.paddingLeft = style.paddingLeft;
      el.style.paddingRight = style.paddingRight;
      document.body.appendChild(el);
    }
    const widths: Record<string, number> = {};
    allColumns.forEach((col) => {
      el.textContent = String(col.label);
      widths[String(col.key)] = el.offsetWidth;
    });
    colMinWidthsRef.current = widths;
    if (el.parentNode) el.parentNode.removeChild(el);
  }, [allColumns]);

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
        <span className={`${themeClasses.textMuted} ${sizeClasses.textSize} truncate block`}>
          {cf?.value || "—"}
        </span>
      );
    }
    switch (colKey) {
      case 0:
        return (
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
        );
      case 1:
        return (
          <div className={`flex items-center gap-2 group/field cursor-pointer w-full`} onClick={(e) => { e.stopPropagation(); handleCopy(password.id, 'username', password.username, onCopyUsername); }}>
            <span className={`${themeClasses.textMuted} ${sizeClasses.textSize} transition-colors truncate flex-1 min-w-0`}>
              {password.username}
            </span>
            {copiedField?.id === password.id && copiedField?.field === 'username' ? (
              <svg className={`w-3.5 h-3.5 text-green-400 flex-shrink-0`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className={`w-3 h-3 ${themeClasses.textMuted} opacity-0 group-hover/field:opacity-100 transition-all flex-shrink-0`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            )}
          </div>
        );
      case 2:
        return (
          <span className={`${themeClasses.textMuted} ${sizeClasses.textSize} opacity-70 truncate block`}>{password.website}</span>
        );
      case 3:
        return (
          <div className={`flex items-center gap-2 group/field cursor-pointer w-full`} onClick={(e) => { e.stopPropagation(); handleCopy(password.id, 'password', password.password, onCopyPassword); }}>
            <span className={`${themeClasses.textTertiary} text-lg tracking-widest leading-none mt-1.5 transition-colors`}>
              ••••••••
            </span>
            {copiedField?.id === password.id && copiedField?.field === 'password' ? (
              <svg className={`w-3.5 h-3.5 text-green-400 flex-shrink-0`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className={`w-3 h-3 ${themeClasses.textMuted} opacity-0 group-hover/field:opacity-100 transition-all flex-shrink-0`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            )}
          </div>
        );
      case 4:
        return (
          <span className={`text-xs ${themeClasses.textMuted} truncate block max-w-[100px]`}>
            {password.notes || "—"}
          </span>
        );
      case 5:
        return (
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
        );
    }
  };

  const saveColOrder = useCallback((order: (string | number)[]) => {
    localStorage.setItem('guardian-table-col-order', JSON.stringify(order));
  }, []);

  const handleColDragStart = (e: React.MouseEvent, colKey: string | number) => {
    e.stopPropagation();
    const el = e.currentTarget as HTMLElement;
    const rect = el.getBoundingClientRect();

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
      const children = Array.from(row.querySelectorAll<HTMLElement>('[data-col-index]'));
      if (children.length === 0) return;

      let targetIdx = 0;
      for (let i = 0; i < children.length; i++) {
        const r = children[i].getBoundingClientRect();
        const mid = r.left + r.width / 2;
        if (clientX < mid) {
          targetIdx = i;
          break;
        }
        targetIdx = i + 1;
      }

      dropTargetRef.current = targetIdx;

      row.querySelectorAll<HTMLElement>('.cursor-col-resize span').forEach(s => {
        s.style.opacity = '';
        s.style.width = '';
        s.style.background = '';
      });
      children.forEach(el => { el.style.borderRight = ''; el.style.borderLeft = ''; });
      if (targetIdx === 0) {
        children[0].style.borderLeft = `2px solid ${accentHex}`;
      } else if (targetIdx < children.length) {
        const prev = children[targetIdx - 1];
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
        row.querySelectorAll<HTMLElement>('[data-col-index]').forEach(el => {
          el.style.borderRight = '';
          el.style.borderLeft = '';
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

  const totalWidth = useMemo(() => {
    return colOrder.reduce<number>((sum, k) => sum + (colWidths[String(k)] || 120), 0);
  }, [colOrder, colWidths]);

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
      className={`w-full overflow-hidden rounded-2xl ${themeClasses.wrapper} relative flex flex-col min-h-0`}
      data-table="password-table"
    >
      <div
        ref={headerRowRef as any}
        className={`flex border-b flex-shrink-0 ${themeClasses.rowBorder} ${themeClasses.headerBg}`}
      >
            {colOrder.map((colKey) => {
              const col = allColumns.find(c => c.key === colKey)!;
              const isResizable = colKey !== 5;
              return (
                <div
                  key={colKey}
                  data-col-index={colKey}
                  className={`${sizeClasses.headerPadding} ${themeClasses.headerText} text-[0.65rem] font-bold uppercase tracking-widest overflow-hidden truncate flex-shrink-0 flex items-center ${!isResizable ? 'justify-end' : 'relative'} cursor-grab active:cursor-grabbing select-none ${draggedColKey === colKey ? `${accentClasses.textClass} opacity-90` : ''}`}
                  style={{ width: colWidths[String(colKey)] || 120, minWidth: colMinWidthsRef.current[String(colKey)] || 60 }}
                  onMouseDown={(e) => handleColDragStart(e, colKey)}
                >
                  {col.label}
                  {isResizable && (
                    <div
                      className="absolute right-0 top-0 bottom-0 w-5 cursor-col-resize z-20 flex items-center justify-center touch-none select-none"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        const parent = (e.currentTarget as HTMLElement).parentElement;
                        if (!parent || !parent.hasAttribute('data-col-index')) return;
                        const idx = parent.getAttribute('data-col-index') || '0';
                        const startX = e.clientX;
                        const startWidth = parent.offsetWidth;

                        const row = parent.parentElement;
                        if (row) {
                          const locked: Record<string, number> = {};
                          row.querySelectorAll<HTMLElement>('[data-col-index]').forEach((c) => {
                            const ci = c.getAttribute('data-col-index') || '0';
                            locked[ci] = c.offsetWidth;
                          });
                          setColWidths(locked);
                        }

                        document.body.style.userSelect = "none";
                        document.body.style.cursor = "col-resize";

                        const onMove = (ev: MouseEvent) => {
                          const diff = ev.clientX - startX;
                          setColWidths(prev => ({ ...prev, [idx]: Math.max(colMinWidthsRef.current[idx] || 60, startWidth + diff) }));
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
                </div>
              );
            })}
          </div>
        <div ref={parentRef} className="overflow-y-auto overflow-x-auto flex-1 min-h-0">
          <div style={{ height: `${virtualizer.getTotalSize()}px`, minWidth: `${totalWidth}px`, position: 'relative' }}>
          {virtualizer.getVirtualItems().map(virtualRow => {
            const password = passwords[virtualRow.index];
            return (
              <div
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
                className={`flex border-b last:border-0 ${themeClasses.rowBorder} transition-all duration-200 cursor-pointer group ${selectedId === password.id ? `${accentClasses.lightClass}` : themeClasses.rowHover}`}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: `${virtualRow.size}px`,
                  transform: `translateY(${virtualRow.start}px)`,
                }}
              >
                {colOrder.map((colKey) => (
                  <div
                    key={`${password.id}-${colKey}`}
                    className={`${sizeClasses.cellPadding} overflow-hidden flex-shrink-0 flex items-center`}
                    style={{ width: colWidths[String(colKey)] || 120, minWidth: colMinWidthsRef.current[String(colKey)] || 60 }}
                  >
                    {renderCell(colKey, password)}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>
    </motion.div>
    </>
  );
}
