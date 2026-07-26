/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { doc, runTransaction } from 'firebase/firestore';
import { db } from './firebase';
import { Order } from '../types';

export interface GeneratedParentOrderId {
  parentOrderId: string;
  orderSequence: number;
}

/**
 * Gets Asia/Kolkata 2-digit year (YY) and 2-digit month (MM).
 */
export function getKolkataYearMonth(): { yy: string; mm: string; yearMonth: string } {
  const now = new Date();
  try {
    const formatter = new Intl.DateTimeFormat('en-IN', {
      timeZone: 'Asia/Kolkata',
      year: '2-digit',
      month: '2-digit',
    });
    const parts = formatter.formatToParts(now);
    let yy = '';
    let mm = '';
    for (const p of parts) {
      if (p.type === 'year') yy = p.value;
      if (p.type === 'month') mm = p.value;
    }
    if (yy && mm && yy.length === 2 && mm.length === 2) {
      return { yy, mm, yearMonth: `${yy}${mm}` };
    }
  } catch (e) {
    console.warn("Intl Asia/Kolkata format error, using fallback date:", e);
  }

  // Fallback if Intl fails
  const kDateStr = now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' });
  const kDate = new Date(kDateStr);
  const yy = kDate.getFullYear().toString().slice(-2);
  const mm = String(kDate.getMonth() + 1).padStart(2, '0');
  return { yy, mm, yearMonth: `${yy}${mm}` };
}

/**
 * Generates parent Order ID using a Firebase transaction on a numeric counter document.
 * Format: ORD + YY + MM + 3-digit sequence (e.g. ORD2607001).
 * Resets sequence to 001 at the start of each month.
 */
export async function generateNextParentOrderId(): Promise<GeneratedParentOrderId> {
  const { yy, mm, yearMonth } = getKolkataYearMonth();
  const counterRef = doc(db, 'counters', `order_sequence_${yearMonth}`);

  let seq = 1;
  try {
    seq = await runTransaction(db, async (transaction) => {
      const counterDoc = await transaction.get(counterRef);
      let currentSeq = 0;
      if (counterDoc.exists()) {
        const data = counterDoc.data();
        if (typeof data?.seq === 'number') {
          currentSeq = data.seq;
        }
      }
      const nextSeq = currentSeq + 1;
      transaction.set(
        counterRef,
        {
          seq: nextSeq,
          yearMonth,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
      return nextSeq;
    });
  } catch (err) {
    console.warn("Firebase transaction counter failed or offline; using atomic local storage fallback:", err);
    const localKey = `order_sequence_counter_${yearMonth}`;
    const stored = localStorage.getItem(localKey);
    let nextSeq = stored ? parseInt(stored, 10) + 1 : 1;
    if (isNaN(nextSeq) || nextSeq < 1) nextSeq = 1;
    localStorage.setItem(localKey, String(nextSeq));
    seq = nextSeq;
  }

  const paddedSeq = String(seq).padStart(3, '0');
  const parentOrderId = `ORD${yy}${mm}${paddedSeq}`;
  return { parentOrderId, orderSequence: seq };
}

/**
 * Parses numeric order sequence from parentOrderId string (e.g. ORD2607005 -> 5)
 */
export function parseParentOrderSequence(parentOrderId?: string, orderSequence?: number): number {
  if (typeof orderSequence === 'number' && !isNaN(orderSequence) && orderSequence > 0) {
    return orderSequence;
  }
  if (!parentOrderId) return 0;
  
  // Clean string and look for trailing 3 digits or full digits at the end
  const cleanStr = String(parentOrderId).trim().toUpperCase();
  const match = cleanStr.match(/(\d{3,})$/);
  if (match) {
    const numStr = match[1];
    if (numStr.length >= 3) {
      const seqStr = numStr.slice(-3);
      const val = parseInt(seqStr, 10);
      if (!isNaN(val)) return val;
    }
    const val = parseInt(numStr, 10);
    if (!isNaN(val)) return val;
  }
  return 0;
}
