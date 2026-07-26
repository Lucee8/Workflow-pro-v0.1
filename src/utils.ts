/**
 * Standard utility functions for date formatting across the application.
 */

/**
 * Formats any input date string or Date object to DD/MM/YYYY.
 * @param dateInput The date to format.
 * @returns Standardized date string in DD/MM/YYYY format or empty string.
 */
export function formatToDDMMYYYY(dateInput: any): string {
  if (!dateInput) return '';
  
  const dateStr = String(dateInput).trim();
  
  // If already in DD/MM/YYYY format, return as-is
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) {
    return dateStr;
  }

  // Handle case where it might be in YYYY-MM-DD format
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
  }

  // Handle case where it is standard ISO/timestamp or serial
  try {
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      return `${day}/${month}/${year}`;
    }
  } catch (e) {
    // ignore parsing errors and fallback
  }

  return dateStr;
}

/**
 * Converts any date (especially DD/MM/YYYY) to YYYY-MM-DD for HTML5 date inputs.
 * @param dateInput The date to convert.
 * @returns YYYY-MM-DD formatted string or empty string.
 */
export function parseToInputDate(dateInput: any): string {
  if (!dateInput) return '';
  
  const dateStr = String(dateInput).trim();
  
  // If already in YYYY-MM-DD, return as-is
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return dateStr;
  }

  // If in DD/MM/YYYY format
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) {
    const [day, month, year] = dateStr.split('/');
    return `${year}-${month}-${day}`;
  }

  // Handle ISO string or anything with time
  if (dateStr.includes('T')) {
    return dateStr.split('T')[0];
  }

  try {
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      return `${year}-${month}-${day}`;
    }
  } catch (e) {
    // ignore
  }

  return dateStr;
}

/**
 * Extracts the numeric serial at the end of an article number.
 * Examples:
 *  "25/07/SK/0008" -> 8
 *  "0008"          -> 8
 *  "ART-2026-008"  -> 8
 */
export function getArticleSerial(articleNo: string | undefined | null): number {
  if (!articleNo) return 0;
  const str = String(articleNo).trim();
  // Try splitting by slash, dash, underscore, space
  const parts = str.split(/[/_\-\s]+/);
  if (parts.length > 0) {
    const lastPart = parts[parts.length - 1];
    const num = parseInt(lastPart.replace(/\D/g, ''), 10);
    if (!isNaN(num)) return num;
  }
  // Fallback regex to match trailing digits
  const match = str.match(/(\d+)\D*$/);
  if (match) {
    const num = parseInt(match[1], 10);
    if (!isNaN(num)) return num;
  }
  return 0;
}

/**
 * Comparator function to sort orders by numeric serial at the end of articleNumber / article_no descending.
 * The latest article (e.g. 0008) appears first.
 */
export function compareOrdersByArticleSerialDesc<T extends { article_no?: string; articleNumber?: string; created_at?: string; order_date?: string }>(
  a: T,
  b: T
): number {
  const artA = a.article_no || a.articleNumber || '';
  const artB = b.article_no || b.articleNumber || '';

  const serialA = getArticleSerial(artA);
  const serialB = getArticleSerial(artB);

  if (serialB !== serialA) {
    return serialB - serialA; // Descending order: 0008, 0007, 0006...
  }

  // Fallback lexicographical comparison
  const strCompare = artB.localeCompare(artA, undefined, { numeric: true, sensitivity: 'base' });
  if (strCompare !== 0) return strCompare;

  // Final fallback to date
  const dateA = new Date(a.created_at || a.order_date || 0).getTime();
  const dateB = new Date(b.created_at || b.order_date || 0).getTime();
  return dateB - dateA;
}

