import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, Search, X } from 'lucide-react';
import { CNC_TOOL_OPTIONS } from './cncHelpers';

export interface SearchableToolSelectProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  options?: readonly string[];
  placeholder?: string;
  required?: boolean;
}

export const SearchableToolSelect: React.FC<SearchableToolSelectProps> = ({
  id = 'cnc-tool-used-select',
  value,
  onChange,
  options = CNC_TOOL_OPTIONS,
  placeholder = 'Select or search tool',
  required = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const normalizedValue = (value || '').trim();
  const isLegacyValue = Boolean(
    normalizedValue && !options.some((opt) => opt === normalizedValue)
  );

  // Preserve exact option order; append/prepend legacy value only if an existing historical record has one outside the 23-item list
  const allOptions = useMemo(() => {
    if (!isLegacyValue) return [...options];
    return [normalizedValue, ...options];
  }, [isLegacyValue, normalizedValue, options]);

  const filteredOptions = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return allOptions;
    const tokens = query.split(/\s+/).filter(Boolean);
    return allOptions.filter((option) => {
      const lower = option.toLowerCase();
      return tokens.every((token) => lower.includes(token));
    });
  }, [allOptions, searchQuery]);

  // Close dropdown on outside click/tap
  useEffect(() => {
    if (!isOpen) return;
    const handleOutsidePointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node | null;
      if (containerRef.current && target && !containerRef.current.contains(target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsidePointerDown);
    document.addEventListener('touchstart', handleOutsidePointerDown);
    return () => {
      document.removeEventListener('mousedown', handleOutsidePointerDown);
      document.removeEventListener('touchstart', handleOutsidePointerDown);
    };
  }, [isOpen]);

  // Reset search and highlight when opening
  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('');
      return;
    }
    const selectedIdx = filteredOptions.findIndex((opt) => opt === normalizedValue);
    setHighlightedIndex(selectedIdx >= 0 ? selectedIdx : 0);
    const timer = window.setTimeout(() => {
      searchInputRef.current?.focus({ preventScroll: true });
    }, 15);
    return () => window.clearTimeout(timer);
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  // Keep highlighted option scrolled into view
  useEffect(() => {
    if (!isOpen || !listRef.current) return;
    const activeItem = listRef.current.querySelector<HTMLElement>(
      `[data-tool-option-idx="${highlightedIndex}"]`
    );
    activeItem?.scrollIntoView({ block: 'nearest' });
  }, [highlightedIndex, isOpen]);

  const handleSelectOption = (option: string) => {
    onChange(option);
    setIsOpen(false);
    setSearchQuery('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      setIsOpen(false);
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        filteredOptions.length === 0 ? 0 : (prev + 1) % filteredOptions.length
      );
      return;
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        filteredOptions.length === 0
          ? 0
          : (prev - 1 + filteredOptions.length) % filteredOptions.length
      );
      return;
    }

    if (e.key === 'Enter') {
      e.preventDefault();
      const chosen = filteredOptions[highlightedIndex];
      if (chosen) {
        handleSelectOption(chosen);
      }
    }
  };

  return (
    <div ref={containerRef} className="relative w-full min-w-0">
      <button
        id={id}
        type="button"
        role="combobox"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-required={required}
        onClick={() => setIsOpen((prev) => !prev)}
        onKeyDown={handleKeyDown}
        className={`w-full min-w-0 px-3.5 py-2.5 bg-white border rounded-xl text-xs font-medium flex items-center justify-between gap-2 text-left shadow-2xs transition cursor-pointer focus:outline-none focus:ring-1 focus:ring-teal-700 focus:border-teal-700 ${
          isOpen ? 'border-teal-700 ring-1 ring-teal-700' : 'border-stone-200 hover:border-stone-300'
        }`}
      >
        <span
          className={`min-w-0 flex-1 truncate ${
            normalizedValue ? 'text-stone-800 font-semibold' : 'text-stone-400 font-normal'
          }`}
          title={normalizedValue || placeholder}
        >
          {normalizedValue || placeholder}
        </span>

        <span className="flex items-center gap-1 shrink-0">
          {normalizedValue && (
            <span
              role="button"
              tabIndex={-1}
              aria-label="Clear selected tool"
              onClick={(e) => {
                e.stopPropagation();
                onChange('');
                setIsOpen(true);
              }}
              className="p-0.5 rounded-md text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition cursor-pointer"
            >
              <X size={12} />
            </span>
          )}
          <ChevronDown
            size={14}
            className={`text-stone-400 transition-transform duration-150 ${
              isOpen ? 'rotate-180 text-teal-700' : ''
            }`}
          />
        </span>
      </button>

      {isOpen && (
        <div
          className="absolute left-0 right-0 top-full mt-1.5 z-50 w-full min-w-0 bg-white border border-stone-200 rounded-xl shadow-xl overflow-hidden animate-in fade-in duration-100"
          onKeyDown={handleKeyDown}
        >
          {/* Search Input Header */}
          <div className="p-2 border-b border-stone-100 bg-stone-50/80">
            <div className="relative flex items-center">
              <Search size={13} className="absolute left-2.5 text-stone-400 pointer-events-none" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setHighlightedIndex(0);
                }}
                placeholder="Search tool name, size, or bit..."
                aria-label="Search tool options"
                className="w-full min-w-0 pl-8 pr-7 py-2 bg-white border border-stone-200 rounded-lg text-xs font-medium text-stone-800 placeholder:text-stone-400 focus:outline-none focus:ring-1 focus:ring-teal-700 focus:border-teal-700"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setHighlightedIndex(0);
                    searchInputRef.current?.focus();
                  }}
                  aria-label="Clear tool search"
                  className="absolute right-2 p-0.5 text-stone-400 hover:text-stone-700 rounded cursor-pointer"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          </div>

          {/* Options List */}
          <div
            ref={listRef}
            role="listbox"
            aria-label="CNC Tool Options"
            className="max-h-56 overflow-y-auto overflow-x-hidden overscroll-contain divide-y divide-stone-50"
          >
            {filteredOptions.map((option, idx) => {
              const isSelected = option === normalizedValue;
              const isHighlighted = idx === highlightedIndex;
              const isSavedLegacyOption = isLegacyValue && option === normalizedValue;

              return (
                <button
                  key={`${option}-${idx}`}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  data-tool-option-idx={idx}
                  onMouseEnter={() => setHighlightedIndex(idx)}
                  onClick={() => handleSelectOption(option)}
                  className={`w-full min-h-[38px] px-3 py-2 text-left text-xs flex items-center justify-between gap-2 transition cursor-pointer ${
                    isSelected
                      ? 'bg-teal-50 text-[#115e59] font-bold'
                      : isHighlighted
                      ? 'bg-stone-100 text-stone-900 font-medium'
                      : 'bg-white text-stone-700 hover:bg-stone-50 font-medium'
                  }`}
                >
                  <span className="min-w-0 flex-1 break-words leading-snug">
                    {option}
                    {isSavedLegacyOption && (
                      <span className="ml-1.5 inline-block px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide rounded bg-stone-100 text-stone-500">
                        Saved
                      </span>
                    )}
                  </span>
                  {isSelected && <Check size={14} className="text-[#115e59] shrink-0" />}
                </button>
              );
            })}

            {filteredOptions.length === 0 && (
              <div className="px-3 py-5 text-center text-xs text-stone-400 font-medium">
                No matching tool found for "{searchQuery.trim()}"
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchableToolSelect;
