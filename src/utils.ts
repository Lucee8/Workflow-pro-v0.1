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
