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

/**
 * Generates a clean sequential order number in the format ORDYYMMSSS (e.g. ORD2607001, ORD2607002, ORD2607003).
 * Correctly parses existing order IDs without treating sub-item suffixes (e.g. -1, -4) as part of the serial.
 *
 * @param targetDate Optional date string (YYYY-MM-DD, DD/MM/YYYY, or ISO). Defaults to current date.
 * @param orderList Optional list of existing orders to inspect for highest serial.
 * @param quoteList Optional list of existing CRM quotations to inspect for highest serial.
 * @returns Standardized order number string (e.g. ORD2607001).
 */
export function generateNewOrderNo(
  targetDate?: string,
  orderList: any[] = [],
  quoteList: any[] = []
): string {
  let dateToUse = targetDate || new Date().toISOString().split('T')[0];
  if (dateToUse.includes('T')) {
    dateToUse = dateToUse.split('T')[0];
  }

  let yy = '';
  let mm = '';

  if (dateToUse && dateToUse.includes('-')) {
    const parts = dateToUse.split('-');
    if (parts[0] && parts[0].length === 4) {
      // YYYY-MM-DD
      yy = parts[0].slice(-2);
      mm = (parts[1] || '').padStart(2, '0');
    } else if (parts[2] && parts[2].length === 4) {
      // DD-MM-YYYY
      yy = parts[2].slice(-2);
      mm = (parts[1] || '').padStart(2, '0');
    }
  } else if (dateToUse && dateToUse.includes('/')) {
    const parts = dateToUse.split('/');
    if (parts[2] && parts[2].length === 4) {
      // DD/MM/YYYY
      yy = parts[2].slice(-2);
      mm = (parts[1] || '').padStart(2, '0');
    } else if (parts[0] && parts[0].length === 4) {
      // YYYY/MM/DD
      yy = parts[0].slice(-2);
      mm = (parts[1] || '').padStart(2, '0');
    }
  }

  if (!yy || !mm) {
    const d = new Date();
    yy = d.getFullYear().toString().slice(-2);
    mm = String(d.getMonth() + 1).padStart(2, '0');
  }

  const prefix = `ORD${yy}${mm}`;

  // Strict regex: matches ORD + (optional separator) + YY + MM + (optional separator) + DIGITS
  // Captures only the continuous numeric serial immediately following the date prefix.
  // Stops at any subsequent hyphen, underscore, slash or letter (e.g. "-1", "_item1").
  const serialRegex = new RegExp(`^ORD[-_\\s/]?${yy}${mm}[-_\\s/]?(\\d+)`, 'i');

  let maxSerial = 0;

  const processIdString = (idStr?: string) => {
    if (!idStr || typeof idStr !== 'string') return;
    const match = idStr.trim().match(serialRegex);
    if (match && match[1]) {
      const serialNum = parseInt(match[1], 10);
      if (!isNaN(serialNum) && serialNum > maxSerial) {
        maxSerial = serialNum;
      }
    }
  };

  if (orderList && Array.isArray(orderList)) {
    orderList.forEach((o: any) => {
      if (!o) return;
      processIdString(o.id);
      processIdString(o.orderNo);
      processIdString(o.parent_order_id);
    });
  }

  if (quoteList && Array.isArray(quoteList)) {
    quoteList.forEach((q: any) => {
      if (!q) return;
      processIdString(q.id);
      processIdString(q.orderNo);
      processIdString(q.quotationNo);
    });
  }

  const nextSerial = maxSerial + 1;
  const sss = String(nextSerial).padStart(3, '0');
  return `${prefix}${sss}`;
}

/**
 * Safely scales and compresses an image (File or base64 data URL) into a web-optimized JPEG data URL
 * that stays well under Firestore's 1MB document size limit (typically 30KB - 100KB).
 */
export function compressImage(
  input: File | string,
  maxWidth = 800,
  maxHeight = 800,
  quality = 0.65
): Promise<string> {
  return new Promise((resolve) => {
    const processDataUrl = (dataUrl: string) => {
      if (!dataUrl) {
        resolve('');
        return;
      }

      // Non-image string or non-data URL
      if (typeof dataUrl === 'string' && !dataUrl.startsWith('data:image/') && !dataUrl.startsWith('blob:')) {
        resolve(dataUrl);
        return;
      }

      const img = new Image();
      img.onload = () => {
        let width = img.width || 800;
        let height = img.height || 600;

        // Scale down dimensions if greater than maxWidth or maxHeight
        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, width);
        canvas.height = Math.max(1, height);
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          let compressed = canvas.toDataURL('image/jpeg', quality);

          // If still large (>300KB base64 string length ~400,000 chars), compress further to quality 0.45
          if (compressed.length > 400000) {
            compressed = canvas.toDataURL('image/jpeg', 0.45);
          }
          resolve(compressed);
        } else {
          resolve(dataUrl);
        }
      };
      img.onerror = () => resolve(dataUrl);
      img.src = dataUrl;
    };

    if (input instanceof File) {
      const reader = new FileReader();
      reader.onload = (e) => {
        processDataUrl((e.target?.result as string) || '');
      };
      reader.onerror = () => resolve('');
      reader.readAsDataURL(input);
    } else {
      processDataUrl(input);
    }
  });
}

export interface ResolvedCustomerInfo {
  id: string;
  name: string;
  phone: string;
  address: string;
  city: string;
  email?: string;
}

/**
 * Accurately and deterministically resolves the customer associated with a quotation.
 * Uses quotation.customer_id with defensive fallback against name-id desynchronization.
 */
export function resolveQuotationCustomer(
  quote: { customer_id?: string; customer_name?: string } | null | undefined,
  crmCustomers: Array<any> = [],
  customers: Array<any> = []
): ResolvedCustomerInfo {
  if (!quote) {
    return { id: '', name: 'Customer', phone: '', address: '', city: '' };
  }

  const allCusts = [
    ...(Array.isArray(crmCustomers) ? crmCustomers : []),
    ...(Array.isArray(customers) ? customers : [])
  ];

  // 1. Try finding customer by unique customer_id
  let found: any = null;
  if (quote.customer_id) {
    found = allCusts.find((c) => c && c.id === quote.customer_id);
  }

  // 2. If found customer by ID but the customer's name doesn't match quote.customer_name (e.g. from previous resequencing corruption),
  // or if customer was not found by ID, fallback to finding by customer_name
  if ((!found || (quote.customer_name && found.name && found.name.trim().toLowerCase() !== quote.customer_name.trim().toLowerCase())) && quote.customer_name) {
    const byName = allCusts.find(
      (c) => c && c.name && c.name.trim().toLowerCase() === quote.customer_name!.trim().toLowerCase()
    );
    if (byName) {
      found = byName;
    }
  }

  if (found) {
    return {
      id: found.id,
      name: found.name || quote.customer_name || 'Customer',
      phone: found.phone || found.whatsappNumber || '',
      address: found.address || '',
      city: found.city || found.address || '',
      email: found.email || '',
    };
  }

  return {
    id: quote.customer_id || '',
    name: quote.customer_name || 'Customer',
    phone: '',
    address: '',
    city: '',
  };
}

/**
 * Self-heals quotation-to-customer relationships across the state.
 * Ensures every quotation has its correct unique customer_id linked to the true customer,
 * matching customer_name, and items with unique IDs.
 */
export function reconcileQuotationsAndCustomers(state: any): any {
  if (!state || typeof state !== 'object') return state;

  const crmCustomers = Array.isArray(state.crmCustomers) ? state.crmCustomers : [];
  const customers = Array.isArray(state.customers) ? state.customers : [];
  const crmQuotations = Array.isArray(state.crmQuotations) ? state.crmQuotations : [];

  if (crmQuotations.length === 0) {
    return state;
  }

  const allCusts = [...crmCustomers, ...customers];

  let hasChanges = false;
  const updatedQuotations = crmQuotations.map((q: any) => {
    if (!q) return q;

    // Resolve by customer_id first
    let matchedCustomer = q.customer_id
      ? allCusts.find((c) => c && c.id === q.customer_id)
      : null;

    // If ID mismatch or missing, resolve by name
    if ((!matchedCustomer || (q.customer_name && matchedCustomer.name && matchedCustomer.name.trim().toLowerCase() !== q.customer_name.trim().toLowerCase())) && q.customer_name) {
      const byName = allCusts.find(
        (c) => c && c.name && c.name.trim().toLowerCase() === q.customer_name.trim().toLowerCase()
      );
      if (byName) {
        matchedCustomer = byName;
      }
    }

    const resolvedCustId = matchedCustomer ? matchedCustomer.id : q.customer_id;
    const resolvedCustName = matchedCustomer ? (matchedCustomer.name || q.customer_name) : q.customer_name;

    const formattedItems = Array.isArray(q.items) ? q.items.map((item: any, idx: number) => ({
      ...item,
      id: item.id || `item_${q.id}_${idx + 1}`
    })) : [];

    if (q.customer_id !== resolvedCustId || q.customer_name !== resolvedCustName) {
      hasChanges = true;
    }

    return {
      ...q,
      customer_id: resolvedCustId,
      customer_name: resolvedCustName,
      items: formattedItems
    };
  });

  if (!hasChanges) return state;

  return {
    ...state,
    crmQuotations: updatedQuotations,
  };
}

