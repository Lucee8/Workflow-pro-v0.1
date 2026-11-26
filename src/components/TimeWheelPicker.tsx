import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Clock, X } from 'lucide-react';
import {
  Time12HourParts,
  TimePeriod,
  format12HourPartsDisplay,
  format12HourTo24Hour,
  getLocalTimeHHMM,
  parse24HourTo12Hour,
} from './cncHelpers';

export interface TimeWheelPickerProps {
  isOpen: boolean;
  title: string;
  /** Saved value in 24-hour HH:mm format */
  value?: string | null;
  /** Fallback 24-hour HH:mm value when value is empty (defaults to current local time) */
  defaultValue?: string;
  onConfirm: (hhmm24: string) => void;
  onCancel: () => void;
}

interface WheelOption<T> {
  value: T;
  label: string;
}

const ITEM_HEIGHT = 44;
const VISIBLE_ITEMS = 5;
const WHEEL_HEIGHT = ITEM_HEIGHT * VISIBLE_ITEMS; // 220px
const SPACER_HEIGHT = ITEM_HEIGHT * 2; // 88px top & bottom padding so first/last items center cleanly

const HOUR_OPTIONS: WheelOption<number>[] = Array.from({ length: 12 }, (_, idx) => {
  const hour = idx + 1;
  return {
    value: hour,
    label: String(hour).padStart(2, '0'),
  };
});

const MINUTE_OPTIONS: WheelOption<number>[] = Array.from({ length: 60 }, (_, minute) => ({
  value: minute,
  label: String(minute).padStart(2, '0'),
}));

const PERIOD_OPTIONS: WheelOption<TimePeriod>[] = [
  { value: 'AM', label: 'AM' },
  { value: 'PM', label: 'PM' },
];

interface WheelColumnProps<T extends string | number> {
  id: string;
  label: string;
  options: WheelOption<T>[];
  selectedValue: T;
  onSelect: (value: T) => void;
  onNavigateColumn?: (direction: 'prev' | 'next') => void;
  columnRef?: React.RefObject<HTMLDivElement | null>;
}

function WheelColumn<T extends string | number>({
  id,
  label,
  options,
  selectedValue,
  onSelect,
  onNavigateColumn,
  columnRef,
}: WheelColumnProps<T>) {
  const internalRef = useRef<HTMLDivElement>(null);
  const scrollElRef = columnRef || internalRef;

  const selectedIndex = useMemo(() => {
    const idx = options.findIndex((opt) => opt.value === selectedValue);
    return idx >= 0 ? idx : 0;
  }, [options, selectedValue]);

  const [visualIndex, setVisualIndex] = useState(selectedIndex);
  const settleTimerRef = useRef<number | null>(null);
  const isPointerDraggingRef = useRef(false);
  const wasDraggedRef = useRef(false);
  const pointerStartYRef = useRef(0);
  const pointerStartScrollTopRef = useRef(0);
  const programmaticTargetTopRef = useRef<number | null>(null);
  const programmaticTimeoutRef = useRef<number | null>(null);

  const prefersReducedMotion = useCallback(() => {
    return (
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    );
  }, []);

  const clearProgrammaticLock = useCallback(() => {
    programmaticTargetTopRef.current = null;
    if (programmaticTimeoutRef.current !== null) {
      window.clearTimeout(programmaticTimeoutRef.current);
      programmaticTimeoutRef.current = null;
    }
  }, []);

  const scrollToIndex = useCallback(
    (index: number, behavior: ScrollBehavior = 'smooth') => {
      const el = scrollElRef.current;
      if (!el) return;
      const clamped = Math.max(0, Math.min(options.length - 1, index));
      const targetTop = clamped * ITEM_HEIGHT;
      const effectiveBehavior: ScrollBehavior = prefersReducedMotion() ? 'auto' : behavior;

      clearProgrammaticLock();
      programmaticTargetTopRef.current = targetTop;
      programmaticTimeoutRef.current = window.setTimeout(() => {
        programmaticTargetTopRef.current = null;
      }, effectiveBehavior === 'auto' ? 80 : 420);

      el.scrollTo({ top: targetTop, behavior: effectiveBehavior });
    },
    [clearProgrammaticLock, options.length, prefersReducedMotion, scrollElRef]
  );

  // Position scroll immediately at initial selected index before first paint
  useLayoutEffect(() => {
    const el = scrollElRef.current;
    if (!el) return;
    setVisualIndex(selectedIndex);
    const initialTop = selectedIndex * ITEM_HEIGHT;
    programmaticTargetTopRef.current = initialTop;
    el.scrollTop = initialTop;
    const timer = window.setTimeout(() => {
      programmaticTargetTopRef.current = null;
    }, 80);
    return () => window.clearTimeout(timer);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    return () => {
      if (settleTimerRef.current !== null) {
        window.clearTimeout(settleTimerRef.current);
      }
      if (programmaticTimeoutRef.current !== null) {
        window.clearTimeout(programmaticTimeoutRef.current);
      }
    };
  }, []);

  const commitIndex = useCallback(
    (idx: number) => {
      const clamped = Math.max(0, Math.min(options.length - 1, idx));
      const option = options[clamped];
      if (option && option.value !== selectedValue) {
        onSelect(option.value);
      }
    },
    [onSelect, options, selectedValue]
  );

  const handleScroll = useCallback(() => {
    const el = scrollElRef.current;
    if (!el) return;

    if (programmaticTargetTopRef.current !== null) {
      if (Math.abs(el.scrollTop - programmaticTargetTopRef.current) <= 1.5) {
        clearProgrammaticLock();
      } else {
        return;
      }
    }

    const rawIdx = el.scrollTop / ITEM_HEIGHT;
    const clampedIdx = Math.max(0, Math.min(options.length - 1, Math.round(rawIdx)));

    setVisualIndex(clampedIdx);
    commitIndex(clampedIdx);

    if (settleTimerRef.current !== null) {
      window.clearTimeout(settleTimerRef.current);
    }

    if (!isPointerDraggingRef.current) {
      settleTimerRef.current = window.setTimeout(() => {
        const currentEl = scrollElRef.current;
        if (!currentEl) return;
        const settledIdx = Math.max(
          0,
          Math.min(options.length - 1, Math.round(currentEl.scrollTop / ITEM_HEIGHT))
        );
        const alignedTop = settledIdx * ITEM_HEIGHT;
        if (Math.abs(currentEl.scrollTop - alignedTop) > 1.5) {
          scrollToIndex(settledIdx, 'smooth');
        }
      }, 110);
    }
  }, [clearProgrammaticLock, commitIndex, options.length, scrollElRef, scrollToIndex]);

  // Desktop mouse click-and-drag support (touch scrolling remains 100% native)
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    clearProgrammaticLock();
    if (e.pointerType !== 'mouse' || e.button !== 0) return;
    const el = scrollElRef.current;
    if (!el) return;

    isPointerDraggingRef.current = true;
    wasDraggedRef.current = false;
    pointerStartYRef.current = e.clientY;
    pointerStartScrollTopRef.current = el.scrollTop;

    const handleWindowPointerMove = (moveEvent: PointerEvent) => {
      const deltaY = moveEvent.clientY - pointerStartYRef.current;
      if (Math.abs(deltaY) >= 6) {
        wasDraggedRef.current = true;
        el.style.scrollSnapType = 'none';
      }
      if (wasDraggedRef.current) {
        el.scrollTop = pointerStartScrollTopRef.current - deltaY;
      }
    };

    const handleWindowPointerUp = () => {
      window.removeEventListener('pointermove', handleWindowPointerMove);
      window.removeEventListener('pointerup', handleWindowPointerUp);
      window.removeEventListener('pointercancel', handleWindowPointerUp);

      isPointerDraggingRef.current = false;
      el.style.scrollSnapType = 'y mandatory';

      if (wasDraggedRef.current) {
        const idx = Math.max(0, Math.min(options.length - 1, Math.round(el.scrollTop / ITEM_HEIGHT)));
        setVisualIndex(idx);
        commitIndex(idx);
        scrollToIndex(idx, 'smooth');
        window.setTimeout(() => {
          wasDraggedRef.current = false;
        }, 60);
      }
    };

    window.addEventListener('pointermove', handleWindowPointerMove);
    window.addEventListener('pointerup', handleWindowPointerUp);
    window.addEventListener('pointercancel', handleWindowPointerUp);
  };

  const handleItemTap = (idx: number) => {
    if (wasDraggedRef.current) return;
    setVisualIndex(idx);
    commitIndex(idx);
    scrollToIndex(idx, 'smooth');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    let nextIdx: number | null = null;
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      nextIdx = Math.max(0, visualIndex - 1);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      nextIdx = Math.min(options.length - 1, visualIndex + 1);
    } else if (e.key === 'PageUp') {
      e.preventDefault();
      nextIdx = Math.max(0, visualIndex - 5);
    } else if (e.key === 'PageDown') {
      e.preventDefault();
      nextIdx = Math.min(options.length - 1, visualIndex + 5);
    } else if (e.key === 'Home') {
      e.preventDefault();
      nextIdx = 0;
    } else if (e.key === 'End') {
      e.preventDefault();
      nextIdx = options.length - 1;
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      onNavigateColumn?.('prev');
      return;
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      onNavigateColumn?.('next');
      return;
    }

    if (nextIdx !== null) {
      setVisualIndex(nextIdx);
      commitIndex(nextIdx);
      scrollToIndex(nextIdx, 'smooth');
    }
  };

  return (
    <div className="relative w-full min-w-0 h-full overflow-hidden">
      <div
        ref={scrollElRef}
        id={id}
        data-wheel-scroll="true"
        role="listbox"
        tabIndex={0}
        aria-label={label}
        aria-activedescendant={`${id}-opt-${visualIndex}`}
        onScroll={handleScroll}
        onWheel={clearProgrammaticLock}
        onTouchStart={clearProgrammaticLock}
        onPointerDown={handlePointerDown}
        onKeyDown={handleKeyDown}
        className="h-full w-full overflow-y-auto overflow-x-hidden snap-y snap-mandatory no-scrollbar overscroll-contain touch-pan-y select-none cursor-grab active:cursor-grabbing rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-700/60"
        style={{ scrollSnapType: 'y mandatory', WebkitOverflowScrolling: 'touch' }}
      >
        <div style={{ height: `${SPACER_HEIGHT}px` }} aria-hidden="true" />
        {options.map((opt, idx) => {
          const distance = Math.abs(idx - visualIndex);
          const isSelected = distance === 0;
          return (
            <button
              key={String(opt.value)}
              id={`${id}-opt-${idx}`}
              type="button"
              role="option"
              tabIndex={-1}
              aria-selected={isSelected}
              onClick={() => handleItemTap(idx)}
              style={{ height: `${ITEM_HEIGHT}px` }}
              className={`w-full px-1 snap-center flex items-center justify-center font-mono tabular-nums transition-all duration-150 select-none cursor-pointer focus:outline-none ${
                isSelected
                  ? 'text-teal-900 font-extrabold text-lg sm:text-xl'
                  : distance === 1
                  ? 'text-stone-600 font-semibold text-sm sm:text-base opacity-60 hover:opacity-85'
                  : 'text-stone-400 font-medium text-xs sm:text-sm opacity-30 hover:opacity-60'
              }`}
            >
              {opt.label}
            </button>
          );
        })}
        <div style={{ height: `${SPACER_HEIGHT}px` }} aria-hidden="true" />
      </div>
    </div>
  );
}

const TimeWheelPickerDialog: React.FC<Omit<TimeWheelPickerProps, 'isOpen'>> = ({
  title,
  value,
  defaultValue,
  onConfirm,
  onCancel,
}) => {
  const [draft, setDraft] = useState<Time12HourParts>(() => {
    const parsedValue = parse24HourTo12Hour(value);
    if (parsedValue) return parsedValue;
    const parsedDefault = parse24HourTo12Hour(defaultValue);
    if (parsedDefault) return parsedDefault;
    return parse24HourTo12Hour(getLocalTimeHHMM()) || { hour: 9, minute: 30, period: 'AM' };
  });

  const backdropRef = useRef<HTMLDivElement>(null);
  const hourRef = useRef<HTMLDivElement>(null);
  const minuteRef = useRef<HTMLDivElement>(null);
  const periodRef = useRef<HTMLDivElement>(null);

  // Lock background page scroll and block touchmove scroll chaining outside wheel/body scroll containers
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const prevHtmlOverflow = html.style.overflow;
    const prevBodyOverflow = body.style.overflow;
    const prevHtmlOverscroll = html.style.overscrollBehavior;
    const prevBodyOverscroll = body.style.overscrollBehavior;

    html.style.overflow = 'hidden';
    body.style.overflow = 'hidden';
    html.style.overscrollBehavior = 'none';
    body.style.overscrollBehavior = 'none';

    const backdropEl = backdropRef.current;
    const handleTouchMove = (e: TouchEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) {
        e.preventDefault();
        return;
      }
      const insideWheel = target.closest('[data-wheel-scroll="true"]');
      if (insideWheel) return;

      const bodyScrollEl = target.closest('[data-picker-body-scroll="true"]') as HTMLElement | null;
      if (bodyScrollEl && bodyScrollEl.scrollHeight > bodyScrollEl.clientHeight + 1) {
        return;
      }
      e.preventDefault();
    };

    backdropEl?.addEventListener('touchmove', handleTouchMove, { passive: false });

    return () => {
      backdropEl?.removeEventListener('touchmove', handleTouchMove);
      html.style.overflow = prevHtmlOverflow;
      body.style.overflow = prevBodyOverflow;
      html.style.overscrollBehavior = prevHtmlOverscroll;
      body.style.overscrollBehavior = prevBodyOverscroll;
    };
  }, []);

  // Focus the hours wheel (non-input element so mobile keyboard never opens) and handle Escape
  useEffect(() => {
    const timer = window.setTimeout(() => {
      hourRef.current?.focus({ preventScroll: true });
    }, 30);

    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onCancel();
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown, true);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('keydown', handleGlobalKeyDown, true);
    };
  }, [onCancel]);

  const handleConfirm = () => {
    const hhmm24 = format12HourTo24Hour(draft.hour, draft.minute, draft.period);
    onConfirm(hhmm24);
  };

  const formattedPreview = format12HourPartsDisplay(draft);

  const modalContent = (
    <div
      ref={backdropRef}
      className="fixed inset-0 z-[80] bg-stone-900/55 backdrop-blur-[2px] flex items-end md:items-center justify-center px-3 pt-3 pb-0 md:p-4 overscroll-none"
      onClick={onCancel}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="time-wheel-picker-title"
        onClick={(e) => e.stopPropagation()}
        className="w-full md:max-w-[380px] max-h-[90dvh] bg-white rounded-t-3xl md:rounded-2xl shadow-2xl border border-b-0 md:border-b border-stone-200 overflow-hidden flex flex-col"
      >
        {/* Mobile Bottom-Sheet Drag Indicator */}
        <div className="md:hidden pt-2.5 pb-1 bg-[#115e59] flex justify-center shrink-0 touch-none">
          <span className="w-10 h-1 rounded-full bg-teal-200/50" aria-hidden="true" />
        </div>

        {/* Teal Header */}
        <div className="px-4 py-3 bg-[#115e59] text-white flex items-center justify-between shrink-0 touch-none">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-teal-800/80 border border-teal-600/50 flex items-center justify-center text-teal-100 shrink-0">
              <Clock size={16} />
            </div>
            <div className="min-w-0">
              <h4
                id="time-wheel-picker-title"
                className="text-sm font-bold text-white leading-tight truncate"
              >
                {title}
              </h4>
              <p className="text-[11px] text-teal-100/90 font-mono font-semibold tabular-nums">
                {formattedPreview}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Close time picker"
            className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg text-teal-100 hover:text-white hover:bg-teal-800/60 transition cursor-pointer shrink-0"
          >
            <X size={18} />
          </button>
        </div>

        {/* 3-Wheel Picker Body */}
        <div
          data-picker-body-scroll="true"
          className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden overscroll-contain px-3 sm:px-4 py-3 sm:py-4 bg-white"
        >
          {/* Equal-width 3-Column Labels */}
          <div className="grid grid-cols-3 gap-1.5 sm:gap-2.5 w-full mb-1.5 select-none">
            <span className="text-center text-[10px] font-bold uppercase tracking-wider text-stone-400">
              Hour
            </span>
            <span className="text-center text-[10px] font-bold uppercase tracking-wider text-stone-400">
              Min
            </span>
            <span className="text-center text-[10px] font-bold uppercase tracking-wider text-stone-400">
              AM / PM
            </span>
          </div>

          {/* Equal-width 3-Column Horizontal Wheels */}
          <div
            className="relative grid grid-cols-3 gap-1.5 sm:gap-2.5 w-full overflow-hidden"
            style={{ height: `${WHEEL_HEIGHT}px` }}
          >
            {/* Center Selection Highlight Bar */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute left-0 right-0 rounded-xl bg-teal-50/90 border border-teal-200/90 shadow-2xs"
              style={{
                top: `${SPACER_HEIGHT}px`,
                height: `${ITEM_HEIGHT}px`,
              }}
            />

            {/* Top Fade Overlay */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute left-0 right-0 top-0 z-10 bg-gradient-to-b from-white via-white/75 to-transparent"
              style={{
                height: `${SPACER_HEIGHT}px`,
              }}
            />

            {/* Bottom Fade Overlay */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute left-0 right-0 bottom-0 z-10 bg-gradient-to-t from-white via-white/75 to-transparent"
              style={{
                height: `${SPACER_HEIGHT}px`,
              }}
            />

            {/* Colon Separator centered between Hour (col 1) and Min (col 2) */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute z-20 left-1/3 -translate-x-1/2 flex items-center justify-center font-mono font-black text-base sm:text-xl text-teal-800 select-none"
              style={{
                top: `${SPACER_HEIGHT}px`,
                height: `${ITEM_HEIGHT}px`,
              }}
            >
              :
            </div>

            {/* Hour Wheel (1–12) */}
            <WheelColumn
              id="wheel-hour"
              label="Hour"
              options={HOUR_OPTIONS}
              selectedValue={draft.hour}
              columnRef={hourRef}
              onSelect={(hour) => setDraft((prev) => ({ ...prev, hour }))}
              onNavigateColumn={(dir) => {
                if (dir === 'next') minuteRef.current?.focus();
              }}
            />

            {/* Minute Wheel (00–59) */}
            <WheelColumn
              id="wheel-minute"
              label="Min"
              options={MINUTE_OPTIONS}
              selectedValue={draft.minute}
              columnRef={minuteRef}
              onSelect={(minute) => setDraft((prev) => ({ ...prev, minute }))}
              onNavigateColumn={(dir) => {
                if (dir === 'prev') hourRef.current?.focus();
                if (dir === 'next') periodRef.current?.focus();
              }}
            />

            {/* Period Wheel (AM / PM) */}
            <WheelColumn
              id="wheel-period"
              label="AM / PM"
              options={PERIOD_OPTIONS}
              selectedValue={draft.period}
              columnRef={periodRef}
              onSelect={(period) => setDraft((prev) => ({ ...prev, period }))}
              onNavigateColumn={(dir) => {
                if (dir === 'prev') minuteRef.current?.focus();
              }}
            />
          </div>

          <p className="mt-2 text-center text-[11px] text-stone-400 font-medium select-none">
            Scroll or tap a value, then confirm
          </p>
        </div>

        {/* Footer Actions pinned at bottom with safe-area padding */}
        <div className="px-3 sm:px-4 py-3 pb-[max(0.875rem,env(safe-area-inset-bottom))] md:pb-3 bg-stone-50 border-t border-stone-200 flex items-center gap-2.5 shrink-0 touch-none">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 min-h-[44px] px-4 py-2.5 bg-white border border-stone-200 hover:bg-stone-100 text-stone-700 rounded-xl text-xs font-bold transition cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-700"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="flex-1 min-h-[44px] px-4 py-2.5 bg-[#115e59] hover:bg-[#0f524d] text-white rounded-xl text-xs font-bold shadow-sm transition cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 focus-visible:ring-offset-1"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );

  if (typeof document !== 'undefined' && document.body) {
    return createPortal(modalContent, document.body);
  }
  return modalContent;
};

export const TimeWheelPicker: React.FC<TimeWheelPickerProps> = ({ isOpen, ...props }) => {
  if (!isOpen) return null;
  return <TimeWheelPickerDialog {...props} />;
};

export default TimeWheelPicker;
