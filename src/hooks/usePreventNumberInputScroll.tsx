import React, { useEffect } from 'react';

/**
 * Globally prevents mouse wheel scrolling from incrementing or decrementing
 * focused <input type="number"> fields across the browser.
 * 
 * - If user scrolls while focused on a number input, the browser default step action
 *   is prevented, and the input is blurred so the mouse wheel doesn't alter the value.
 * - If a number input is focused and the user scrolls the surrounding page, the input
 *   is cleanly blurred to ensure smooth page scrolling without accidental numerical drift.
 */
export function initNumberInputWheelFix(): () => void {
  if (typeof window === 'undefined') {
    return () => {};
  }

  const handleWheel = (event: WheelEvent) => {
    const target = event.target as HTMLElement | null;
    const numberInput = target instanceof HTMLInputElement && target.type === 'number'
      ? target
      : (target?.closest?.('input[type="number"]') as HTMLInputElement | null);

    const activeEl = document.activeElement as HTMLElement | null;
    const activeNumberInput = activeEl instanceof HTMLInputElement && activeEl.type === 'number'
      ? activeEl
      : null;

    if (numberInput) {
      if (document.activeElement === numberInput) {
        // Prevent default browser step increment/decrement
        event.preventDefault();
        // Blur to remove focus so scrolling continues smoothly
        numberInput.blur();
      }
    } else if (activeNumberInput) {
      // If a number input is focused while scrolling elsewhere on the page/container,
      // blur it so focus is released and numerical values are never altered.
      activeNumberInput.blur();
    }
  };

  // Use capture phase and passive: false so preventDefault() succeeds in stopping
  // native browser number input increment/decrement before it is executed.
  document.addEventListener('wheel', handleWheel, { passive: false, capture: true });

  return () => {
    document.removeEventListener('wheel', handleWheel, { capture: true });
  };
}

/**
 * Custom React hook to enforce number input wheel protection in React tree lifecycle.
 */
export function usePreventNumberInputScroll(): void {
  useEffect(() => {
    const cleanup = initNumberInputWheelFix();
    return cleanup;
  }, []);
}

/**
 * Reusable event handler for individual JSX input onWheel props:
 * e.g. <input type="number" onWheel={handleNumberInputWheel} />
 */
export function handleNumberInputWheel(e: React.WheelEvent<HTMLInputElement>): void {
  e.preventDefault();
  e.currentTarget.blur();
}
