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
  if (!a && !b) return 0;
  if (!a) return 1;
  if (!b) return -1;

  // 1. Compare creation timestamps if available (newest first)
  const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
  const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
  if (!isNaN(timeA) && !isNaN(timeB) && timeA > 0 && timeB > 0 && Math.abs(timeA - timeB) > 1000) {
    return timeB - timeA;
  }

  // 2. Compare order_date if dates are distinct
  const dateA = a.order_date ? new Date(a.order_date).getTime() : 0;
  const dateB = b.order_date ? new Date(b.order_date).getTime() : 0;
  if (!isNaN(dateA) && !isNaN(dateB) && dateA > 0 && dateB > 0 && Math.abs(dateA - dateB) > 86400000) {
    return dateB - dateA;
  }

  const artA = a.article_no || a.articleNumber || '';
  const artB = b.article_no || b.articleNumber || '';

  const serialA = getArticleSerial(artA);
  const serialB = getArticleSerial(artB);

  // If one has legacy 4-digit outlier (>1000) while other is normal serial (<=500), don't let 6841 supersede newer orders
  if (serialA > 1000 && serialB <= 500) return 1; // B is newer
  if (serialB > 1000 && serialA <= 500) return -1; // A is newer

  if (serialB !== serialA) {
    return serialB - serialA; // Descending order: 0008, 0007, 0006...
  }

  // Fallback lexicographical comparison
  const strCompare = artB.localeCompare(artA, undefined, { numeric: true, sensitivity: 'base' });
  if (strCompare !== 0) return strCompare;

  // Final fallback to date
  return (timeB || dateB) - (timeA || dateA);
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
  productRequirement?: string;
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
      productRequirement: found.productRequirement || found.notes || '',
    };
  }

  return {
    id: quote.customer_id || '',
    name: quote.customer_name || 'Customer',
    phone: '',
    address: '',
    city: '',
    email: '',
    productRequirement: '',
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

    const formattedItems = Array.isArray(q.items) ? q.items.map((item: any, idx: number) => {
      const normalizedImages = Array.isArray(item?.images)
        ? item.images.map((img: any) => {
            if (typeof img === 'string') return { url: img, description: '' };
            if (img && typeof img === 'object' && img.url) return { url: img.url, description: img.description || '' };
            return null;
          }).filter(Boolean)
        : [];

      return {
        ...item,
        id: item.id || `item_${q.id}_${idx + 1}`,
        images: normalizedImages
      };
    }) : [];

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

  // Also self-heal and generate missing production orders for any invoiced or approved quotations
  let updatedOrders = Array.isArray(state.orders) ? [...state.orders] : [];
  let updatedPayments = Array.isArray(state.payments) ? [...state.payments] : [];
  let ordersChanged = false;

  updatedQuotations.forEach((q: any) => {
    if (!q || !Array.isArray(q.items) || q.items.length === 0) return;
    const receivedAmt = Number(q.received_amount) || 0;
    const isInvoice = receivedAmt > 0;
    const isApproved = q.status === 'Approved';

    if (isInvoice || isApproved) {
      const grandTotal = Number(q.totalAmount) || 0;

      q.items.forEach((item: any, idx: number) => {
        if (!item) return;

        const isMatch = updatedOrders.some((o: any) => {
          const isParentMatch = o.parent_order_id === q.id || o.quotation_ref === q.id || o.id === `${q.id.replace('QT', 'ORD')}-${idx + 1}` || o.id === `${q.id.replace('QT', 'ORD')}-${item.id}` || o.id === q.id.replace('QT', 'ORD');
          const isItemMatch = o.quotation_item_id === item.id || o.item_id === item.id || o.id.endsWith(`-${item.id}`) || o.id.endsWith(`-${idx + 1}`) || (q.items.length === 1 && (o.parent_order_id === q.id || o.quotation_ref === q.id)) || (o.sub_category === item.furnitureItem && (o.parent_order_id === q.id || o.quotation_ref === q.id));
          return isParentMatch && isItemMatch;
        });

        if (!isMatch) {
          ordersChanged = true;
          const orderId = q.items.length > 1 ? `${q.id.replace('QT', 'ORD')}-${idx + 1}` : q.id.replace('QT', 'ORD');
          
          // Compute sequential article number
          let maxSerial = 0;
          updatedOrders.forEach((o: any) => {
            if (o && o.article_no) {
              const parts = String(o.article_no).split('/');
              const num = parseInt(parts[parts.length - 1], 10);
              if (!isNaN(num) && num > maxSerial && num <= 1000) {
                maxSerial = num;
              }
            }
          });
          const nextSerial = Math.max(1, maxSerial + 1);
          const now = new Date();
          const dd = String(now.getDate()).padStart(2, '0');
          const mm = String(now.getMonth() + 1).padStart(2, '0');
          const nnnn = String(nextSerial).padStart(4, '0');
          const artNo = `${dd}/${mm}/XX/${nnnn}`;

          const itemTotal = Number(item.total) || Math.round(grandTotal / (q.items.length || 1));
          const itemAdvance = grandTotal > 0 ? Math.round((itemTotal / grandTotal) * receivedAmt) : 0;

          const newOrder: any = {
            id: orderId,
            parent_order_id: q.id,
            quotation_ref: q.id,
            quotation_item_id: item.id,
            article_no: artNo,
            customer_id: q.customer_id,
            category: detectCategoryFromFurnitureItem(item.furnitureItem),
            sub_category: item.furnitureItem || 'Custom Furniture',
            size: item.dimensions || 'Custom',
            custom_size: item.dimensions || 'Custom',
            finish: 'Natural Teak Polish',
            special_notes: `Quotation Ref: ${q.id} | Product: ${item.furnitureItem || ''}`,
            design_type: 'Custom',
            material: item.material || 'Solid Teak Wood(Sagwan)',
            color_shade: 'Natural Teak / Walnut',
            no_of_units: Math.max(1, Number(item.quantity) || 1),
            carpenter_id: '',
            polish_person_id: '',
            current_status: 'Pending',
            stage: 'Pending',
            wood_schedule_status: 'Pending',
            is_delayed: false,
            priority: 'normal',
            order_date: q.created_at ? q.created_at.split('T')[0] : now.toISOString().split('T')[0],
            delivery_date: q.validUntil || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            portal_token: Math.random().toString(36).substring(2, 10),
            portal_token_expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            qr_token: `https://bhisesworkshop.com/order/${orderId}`,
            created_at: q.created_at || now.toISOString(),
            created_by: q.created_by || 'Admin',
            images: item.images || [],
            total_amount: itemTotal,
            advance_paid: itemAdvance,
          };

          updatedOrders = [newOrder, ...updatedOrders];

          if (itemAdvance > 0) {
            const paymentId = `PAY_${orderId}_ADV`;
            if (!updatedPayments.some((p: any) => p.id === paymentId || p.order_id === orderId)) {
              updatedPayments = [
                {
                  id: paymentId,
                  order_id: orderId,
                  amount: itemAdvance,
                  date: q.created_at ? q.created_at.split('T')[0] : now.toISOString().split('T')[0],
                  payment_mode: 'Cash',
                  notes: `Advance payment for quotation invoice ${q.id}`,
                  receipt_no: `REC-${orderId}`,
                  created_at: q.created_at || now.toISOString(),
                },
                ...updatedPayments
              ];
            }
          }
        }
      });
    }
  });

  if (!hasChanges && !ordersChanged) return state;

  return {
    ...state,
    crmQuotations: updatedQuotations,
    orders: updatedOrders,
    payments: updatedPayments,
  };
}

/**
 * Calculates a comparable numeric rank for CRM Customer Lead numbers.
 * Supports patterns like CRM-YY-MM-SSS (e.g. CRM-26-08-019 -> 260800019).
 */
export function getCRMCustomerLeadRank(id?: string): number {
  if (!id) return -1;
  const str = String(id).trim();

  // Standard format: CRM-YY-MM-SSS or CRM-YYYY-MM-SSS
  const matchFull = str.match(/^CRM-(?:20)?(\d{2})-(\d{1,2})-(\d+)/i);
  if (matchFull) {
    const yy = parseInt(matchFull[1], 10) || 0;
    const mm = parseInt(matchFull[2], 10) || 0;
    const serial = parseInt(matchFull[3], 10) || 0;
    return yy * 10000000 + mm * 100000 + serial;
  }

  // Format: CRM-NNNN
  const matchSimple = str.match(/^CRM-(\d+)/i);
  if (matchSimple) {
    return parseInt(matchSimple[1], 10) || 0;
  }

  return -1;
}

/**
 * Comparator function to sort CRM customer leads in strict DESCENDING order:
 * - Newest lead number first (e.g. CRM-26-08-019 before CRM-26-08-018, CRM-26-09-001 before CRM-26-08-019)
 * - Fallback to created_at timestamp descending
 * - Fallback to alphanumeric ID descending
 */
export function compareCRMCustomersDesc<T extends { id?: string; created_at?: string; name?: string }>(
  a: T,
  b: T
): number {
  if (!a && !b) return 0;
  if (!a) return 1;
  if (!b) return -1;

  const rankA = getCRMCustomerLeadRank(a.id);
  const rankB = getCRMCustomerLeadRank(b.id);

  // If both have CRM lead numbers, higher/newer number comes first
  if (rankA > 0 && rankB > 0 && rankA !== rankB) {
    return rankB - rankA;
  }

  // If only one has a structured CRM lead number, prioritize structured CRM leads
  if (rankA > 0 && rankB <= 0) return -1;
  if (rankB > 0 && rankA <= 0) return 1;

  // Fallback to creation timestamp descending
  const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
  const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
  if (!isNaN(timeA) && !isNaN(timeB) && timeA !== timeB && (timeA > 0 || timeB > 0)) {
    return timeB - timeA;
  }

  // Fallback to natural alphanumeric ID comparison descending
  const idA = a.id || '';
  const idB = b.id || '';
  const idComp = idB.localeCompare(idA, undefined, { numeric: true, sensitivity: 'base' });
  if (idComp !== 0) return idComp;

  // Final fallback to name
  return (a.name || '').localeCompare(b.name || '');
}

/**
 * Automatically classifies a furniture item name into standard workshop category.
 */
export function detectCategoryFromFurnitureItem(name: string): string {
  if (!name || typeof name !== 'string') return 'Living Room';
  const lower = name.toLowerCase().trim();

  if (lower.includes('door') || lower.includes('frame') || lower.includes('safety door')) {
    return 'Door Frames';
  }
  if (lower.includes('bed') || lower.includes('wardrobe') || lower.includes('dressing') || lower.includes('cupboard') || lower.includes('side table') || lower.includes('bedroom')) {
    return 'Beds';
  }
  if (lower.includes('mandir') || lower.includes('temple') || lower.includes('pooja') || lower.includes('rajasan')) {
    return 'Wooden Mandirs';
  }
  if (lower.includes('sofa') || lower.includes('couch') || lower.includes('living')) {
    return 'Wooden Sofas';
  }
  if (lower.includes('swing') || lower.includes('jhula') || lower.includes('zula')) {
    return 'Wooden Swings';
  }
  if (lower.includes('dining') || lower.includes('chair') || lower.includes('crockery')) {
    return 'Dining Tables';
  }
  if (lower.includes('teapoy') || lower.includes('coffee table') || lower.includes('center table')) {
    return 'Teapoys & Coffee Tables';
  }
  if (lower.includes('tv') || lower.includes('unit') || lower.includes('entertainment')) {
    return 'TV Units';
  }
  if (lower.includes('diwan') || lower.includes('khat')) {
    return 'Diwans';
  }
  if (lower.includes('kitchen') || lower.includes('cabinet') || lower.includes('pantry')) {
    return 'Kitchen';
  }

  return 'Living Room';
}
