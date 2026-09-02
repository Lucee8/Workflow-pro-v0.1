/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { User, Customer, Order, StatusLog, Payment, Material, AlertRule, OrderStage, CRMCustomer, CRMQuotation, CRMFollowUp, CRMPayment, CRMNote, CRMAttachment, CRMTimelineEvent, AuditLog } from '../types';
import { reconcileQuotationsAndCustomers } from '../utils';

// Helper to generate UUIDs
export function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/// Initial Seed Users
export const SEED_USERS: User[] = [
  {
    id: 'user_admin',
    name: 'Admin Manager',
    email: 'admin@bhisesworkshop.com',
    role: 'admin',
    initials: 'AD',
    status: 'ACTIVE',
    is_active: true,
    last_seen: 'Just now',
    created_at: '2026-06-02T18:22:29Z',
    google_linked: false,
  },
  {
    id: 'user_lucee_gmail',
    name: 'Lucee Code Administrator',
    email: 'luceecode@gmail.com',
    role: 'admin',
    initials: 'LC',
    status: 'ACTIVE',
    is_active: true,
    last_seen: 'Just now',
    created_at: '2026-06-02T18:22:29Z',
    google_linked: true,
  },
  {
    id: 'user_yogesh_mgr',
    name: 'Yogesh',
    email: 'yogesh@gmail.com',
    role: 'manager',
    initials: 'YG',
    status: 'ACTIVE',
    is_active: true,
    last_seen: 'Never active yet',
    created_at: '2026-07-04T02:00:00Z',
    google_linked: true,
    phone: '9876543230',
  },
  {
    id: 'user_suresh_mgr',
    name: 'Suresh',
    email: 'suresh@gmail.com',
    role: 'manager',
    initials: 'SM',
    status: 'ACTIVE',
    is_active: true,
    last_seen: 'Never active yet',
    created_at: '2026-07-04T02:00:00Z',
    google_linked: true,
    phone: '9876543231',
  },
  {
    id: 'user_woodtab_mgr',
    name: 'Wood Tab Manager',
    email: 'woodtab@gmail.com',
    role: 'wood_tab_manager',
    initials: 'WT',
    status: 'ACTIVE',
    is_active: true,
    last_seen: 'Never active yet',
    created_at: '2026-07-04T02:00:00Z',
    google_linked: true,
    phone: '9876543232',
  },
  {
    id: 'user_rinku_v_prod',
    name: 'Rinku Vishwakarma',
    email: 'rinku@bhisesworkshop.com',
    role: 'carpenter',
    initials: 'RV',
    status: 'ACTIVE',
    is_active: true,
    last_seen: 'Never active yet',
    created_at: '2026-07-04T02:00:00Z',
    google_linked: false,
    phone: '9876543221',
  },
  {
    id: 'user_ifran_k_prod',
    name: 'Ifran Khan',
    email: 'ifran@bhisesworkshop.com',
    role: 'carpenter',
    initials: 'IK',
    status: 'ACTIVE',
    is_active: true,
    last_seen: 'Never active yet',
    created_at: '2026-07-04T02:00:00Z',
    google_linked: false,
    phone: '9876543222',
  },
  {
    id: 'user_vijay_k_prod',
    name: 'Vijay Kumar',
    email: 'vijay@bhisesworkshop.com',
    role: 'carpenter',
    initials: 'VK',
    status: 'ACTIVE',
    is_active: true,
    last_seen: 'Never active yet',
    created_at: '2026-07-04T02:00:00Z',
    google_linked: false,
    phone: '9876543223',
  },
  {
    id: 'user_dinesh_m_prod',
    name: 'Dinesh Mestry',
    email: 'dinesh.m@bhisesworkshop.com',
    role: 'carpenter',
    initials: 'DM',
    status: 'ACTIVE',
    is_active: true,
    last_seen: 'Never active yet',
    created_at: '2026-07-04T02:00:00Z',
    google_linked: false,
    phone: '9876543224',
  },
  {
    id: 'user_dinesh_v_prod',
    name: 'Dinesh Vishwakarma',
    email: 'dinesh.v@bhisesworkshop.com',
    role: 'carpenter',
    initials: 'DV',
    status: 'ACTIVE',
    is_active: true,
    last_seen: 'Never active yet',
    created_at: '2026-07-04T02:00:00Z',
    google_linked: false,
    phone: '9876543225',
  },
  {
    id: 'user_suresh_m_prod',
    name: 'Suresh Mestry',
    email: 'suresh@bhisesworkshop.com',
    role: 'carpenter',
    initials: 'SM',
    status: 'ACTIVE',
    is_active: true,
    last_seen: 'Never active yet',
    created_at: '2026-07-04T02:00:00Z',
    google_linked: false,
    phone: '9876543226',
  },
  {
    id: 'user_parma_c_prod',
    name: 'Parma Chauhan',
    email: 'parma@bhisesworkshop.com',
    role: 'polish_person',
    initials: 'PC',
    status: 'ACTIVE',
    is_active: true,
    last_seen: 'Never active yet',
    created_at: '2026-07-04T02:00:00Z',
    google_linked: false,
    phone: '9876543227',
  },
  {
    id: 'user_sunil_k_prod',
    name: 'Sunil Kumar',
    email: 'sunil@bhisesworkshop.com',
    role: 'polish_person',
    initials: 'SK',
    status: 'ACTIVE',
    is_active: true,
    last_seen: 'Never active yet',
    created_at: '2026-07-04T02:00:00Z',
    google_linked: false,
    phone: '9876543228',
  },
  {
    id: 'user_qc_inspector',
    name: 'QC Inspector',
    email: 'qc@bhisesworkshop.com',
    role: 'qc_staff',
    initials: 'QC',
    status: 'ACTIVE',
    is_active: true,
    last_seen: 'Just now',
    created_at: '2026-07-04T02:00:00Z',
    google_linked: false,
    phone: '9876543229',
  },
  {
    id: 'user_suspended_sample',
    name: 'Suspended Account Sample',
    email: 'suspended_user@gmail.com',
    role: 'carpenter',
    initials: 'SU',
    status: 'SUSPENDED',
    is_active: false,
    last_seen: 'Never active',
    created_at: '2026-07-04T02:00:00Z',
    google_linked: true,
    phone: '9876543299',
  },
  {
    id: 'user_locked_sample',
    name: 'Locked Account Sample',
    email: 'locked_user@gmail.com',
    role: 'manager',
    initials: 'LU',
    status: 'LOCKED',
    is_active: false,
    last_seen: 'Never active',
    created_at: '2026-07-04T02:00:00Z',
    google_linked: true,
    phone: '9876543298',
  },
  {
    id: 'user_inactive_sample',
    name: 'Inactive Account Sample',
    email: 'inactive_user@gmail.com',
    role: 'carpenter',
    initials: 'IU',
    status: 'INACTIVE',
    is_active: false,
    last_seen: 'Never active',
    created_at: '2026-07-04T02:00:00Z',
    google_linked: true,
    phone: '9876543297',
  }
];

// Initial Seed Customers
const SEED_CUSTOMERS: Customer[] = [];

// Seed Wardrobe/Cupboard Interior & Production photos for dynamic representation
const FURNITURE_PHOTOS = [
  'https://images.unsplash.com/photo-1595428774223-ef52624120d2?auto=format&fit=crop&q=80&w=800',
  'https://images.unsplash.com/photo-1558882224-cca166733360?auto=format&fit=crop&q=80&w=800',
  'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&q=80&w=800',
  'https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&q=80&w=800',
];

// Initial Seed Orders
const SEED_ORDERS: Order[] = [];

// Initial Seed Logs
const SEED_LOGS: StatusLog[] = [];

// Seed Material stock for Phase 2 readiness
const SEED_MATERIALS: Material[] = [];

const SEED_PAYMENTS: Payment[] = [];

export interface AppState {
  users: User[];
  customers: Customer[];
  orders: Order[];
  statusLogs: StatusLog[];
  materials: Material[];
  payments: Payment[];
  auditLogs: AuditLog[];
  currentUser: User | null;
  crmCustomers: CRMCustomer[];
  crmQuotations: CRMQuotation[];
  crmFollowUps: CRMFollowUp[];
  crmPayments: CRMPayment[];
  crmNotes: CRMNote[];
  crmAttachments: CRMAttachment[];
  crmTimelineEvents: CRMTimelineEvent[];
}

export function loadState(): AppState {
  try {
    const data = localStorage.getItem('bhise_workshop_tracker_db');
    if (data) {
      const parsed = JSON.parse(data);
      if (parsed.users && parsed.orders && parsed.customers) {
        // Detect old legacy mock records and purge them to force a clean start
        const isDemo = parsed.users.some((u: any) => u.id === 'user_amit_gmail' || u.id === 'user_amit_prod' || u.name === 'Amit Sharma' || u.name === 'Bhavesh k' || u.name === 'Mahesh Verma' || u.id === 'user_sagar' || u.email === 'admin@bhises@gmail.com') ||
                       parsed.orders.some((o: any) => o.id === 'order_1');
        if (isDemo) {
          localStorage.removeItem('bhise_workshop_tracker_db');
          localStorage.removeItem('mrp_hardware_v2');
          localStorage.removeItem('mrp_wood_v2');
          localStorage.removeItem('mrp_consumption_logs');
        } else {
          // Fix any duplicate or out-of-series article_no in existing orders
          if (Array.isArray(parsed.orders) && parsed.orders.length > 0) {
            const seen = new Set<string>();
            let maxSerialSeen = 0;
            let hasOutlier = false;

            parsed.orders.forEach((o: any) => {
              if (o.article_no) {
                const parts = o.article_no.split('/');
                const num = parseInt(parts[parts.length - 1], 10);
                if (!isNaN(num)) {
                  if (num > maxSerialSeen) maxSerialSeen = num;
                  if (num > parsed.orders.length + 5) hasOutlier = true;
                }
              }
            });

            // If there are duplicate article numbers, missing numbers, or outlier jump numbers (> count + 5), re-sequence chronologically
            if (hasOutlier || parsed.orders.some((o: any) => !o.article_no || seen.has(o.article_no))) {
              // Sort orders by created_at / order_date ascending to preserve historical sequence
              const sortedOrders = [...parsed.orders].sort((a: any, b: any) => {
                const dateA = new Date(a.created_at || a.order_date || 0).getTime();
                const dateB = new Date(b.created_at || b.order_date || 0).getTime();
                return dateA - dateB;
              });

              let serialCounter = 0;
              parsed.orders = sortedOrders.map((o: any) => {
                serialCounter++;
                const parts = o.article_no ? o.article_no.split('/') : [];
                let datePart = parts.length >= 2 ? `${parts[0]}/${parts[1]}` : '';
                if (!datePart || datePart.length < 5) {
                  const date = new Date(o.created_at || o.order_date || Date.now());
                  const dd = String(date.getDate()).padStart(2, '0');
                  const mm = String(date.getMonth() + 1).padStart(2, '0');
                  datePart = `${dd}/${mm}`;
                }
                const carpenterPart = parts.length >= 3 ? parts[2] : 'XX';
                const newArtNo = `${datePart}/${carpenterPart}/${String(serialCounter).padStart(4, '0')}`;
                return { ...o, article_no: newArtNo };
              });
            }
          }

          // Ensure required manager and wood_tab_manager users exist
          const existingUsers: User[] = Array.isArray(parsed.users) ? parsed.users : [];
          const requiredUsers: User[] = [
            SEED_USERS.find(u => u.email === 'yogesh@gmail.com')!,
            SEED_USERS.find(u => u.email === 'suresh@gmail.com')!,
            SEED_USERS.find(u => u.email === 'woodtab@gmail.com')!,
          ].filter(Boolean);

          requiredUsers.forEach(reqUser => {
            const idx = existingUsers.findIndex(u => u.email.toLowerCase() === reqUser.email.toLowerCase());
            if (idx === -1) {
              existingUsers.push(reqUser);
            } else {
              // Ensure role and active status match requirements
              existingUsers[idx] = {
                ...existingUsers[idx],
                role: reqUser.role,
                status: reqUser.status || (existingUsers[idx].is_active ? 'ACTIVE' : 'INACTIVE'),
                is_active: reqUser.status === 'ACTIVE' || existingUsers[idx].is_active,
                name: reqUser.name,
              };
            }
          });

          // Reconcile and self-heal quotation-to-customer linkages
          const reconciled = reconcileQuotationsAndCustomers(parsed);

          return {
            ...reconciled,
            users: existingUsers,
            payments: reconciled.payments || [],
            materials: reconciled.materials || [],
            auditLogs: reconciled.auditLogs || [],
            crmCustomers: reconciled.crmCustomers || [],
            crmQuotations: reconciled.crmQuotations || [],
            crmFollowUps: reconciled.crmFollowUps || [],
            crmPayments: reconciled.crmPayments || [],
            crmNotes: reconciled.crmNotes || [],
            crmAttachments: reconciled.crmAttachments || [],
            crmTimelineEvents: reconciled.crmTimelineEvents || [],
          };
        }
      }
    }
  } catch (error) {
    console.error('Failed reading localStorage database', error);
  }

  // Fallback to seeded data
  const state: AppState = {
    users: SEED_USERS,
    customers: SEED_CUSTOMERS,
    orders: SEED_ORDERS,
    statusLogs: SEED_LOGS,
    materials: SEED_MATERIALS,
    payments: SEED_PAYMENTS,
    auditLogs: [],
    currentUser: SEED_USERS[0],
    crmCustomers: [],
    crmQuotations: [],
    crmFollowUps: [],
    crmPayments: [],
    crmNotes: [],
    crmAttachments: [],
    crmTimelineEvents: [],
  };
  saveState(state);
  return state;
}

export function saveState(state: AppState) {
  try {
    // Keep local storage cache lightweight to avoid browser 5MB quota limits (Firestore stores full data)
    const lightweightState: AppState = {
      ...state,
      auditLogs: (state.auditLogs || []).slice(0, 30),
      crmAttachments: (state.crmAttachments || []).map(att => {
        // Strip heavy base64 strings from local storage cache if larger than 50KB
        if (att.url && att.url.startsWith('data:') && att.url.length > 50000) {
          return { ...att, url: '' };
        }
        return att;
      }),
    };
    localStorage.setItem('bhise_workshop_tracker_db', JSON.stringify(lightweightState));
  } catch (err) {
    try {
      // If quota exceeded, retain all quotations and core business records with stripped large image previews
      const safeQuotations = (state.crmQuotations || []).map(q => ({
        ...q,
        items: (q.items || []).map(item => ({
          ...item,
          images: (item.images || []).map((img: any) => {
            const url = typeof img === 'string' ? img : (img?.url || '');
            const description = typeof img === 'object' ? (img?.description || '') : '';
            // If huge base64, keep thumbnail placeholder or trimmed ref
            return { url: url.length > 150000 ? '' : url, description };
          })
        }))
      }));

      const safeState: Partial<AppState> = {
        ...state,
        auditLogs: (state.auditLogs || []).slice(0, 10),
        crmQuotations: safeQuotations,
      };
      localStorage.setItem('bhise_workshop_tracker_db', JSON.stringify(safeState));
    } catch {
      // Silently ignore storage quota limits in restricted iframe/browser environments
    }
  }
}

// Generate serial formula: DD/MM/IK(1st char of 1st name and 1st char of last name)/0000(sr.no. in series)
export function generateArticleNumber(
  category: string,
  carpenterId: string,
  allOrders: Order[],
  allUsers: User[],
  offset: number = 0
): string {
  const date = new Date();
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');

  const carpenter = allUsers.find(u => u.id === carpenterId);
  let namePart = 'XX';
  if (carpenter) {
    if (carpenter.initials && carpenter.initials.trim().length >= 2) {
      namePart = carpenter.initials.trim().toUpperCase();
    } else {
      const parts = carpenter.name.trim().split(/\s+/);
      if (parts.length >= 2) {
        namePart = (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
      } else if (parts.length === 1 && parts[0]) {
        namePart = parts[0].substring(0, 2).toUpperCase();
        if (namePart.length < 2) {
          namePart = (namePart + 'X').substring(0, 2);
        }
      }
    }
  }

  // Parse highest existing serial number from all existing orders
  let maxSerial = 0;
  if (allOrders && Array.isArray(allOrders)) {
    allOrders.forEach(o => {
      if (o.article_no) {
        const parts = o.article_no.split('/');
        const lastPart = parts[parts.length - 1];
        const num = parseInt(lastPart, 10);
        if (!isNaN(num)) {
          if (allOrders.length < 100 && num > 1000) {
            // Ignore legacy stray random numbers
          } else if (num > maxSerial) {
            maxSerial = num;
          }
        }
      }
    });
    if (allOrders.length > maxSerial && allOrders.length < 1000) {
      maxSerial = allOrders.length;
    }
  }

  const nextSerial = maxSerial + 1 + offset;
  const nnnn = String(nextSerial).padStart(4, '0');

  return `${dd}/${mm}/${namePart}/${nnnn}`;
}

/**
 * Re-sequences CRM customer IDs to eliminate any gaps (e.g. jumps from CRM-26-08-032 to CRM-26-08-477),
 * ensuring customer IDs are strictly continuous: 001, 002, ... 032, 033, 034, 035, etc.
 * Cascades changes across all associated CRM collections, orders, and customer records.
 */
export function resequenceCRMCustomersInState(state: AppState): {
  updatedState: AppState;
  idMapping: Record<string, string>;
  changesCount: number;
} {
  const crmCustomers = state.crmCustomers || [];
  if (crmCustomers.length === 0) {
    return { updatedState: state, idMapping: {}, changesCount: 0 };
  }

  // Group customers by month prefix, e.g. "CRM-26-08-"
  const prefixGroups: Record<string, CRMCustomer[]> = {};
  const ungrouped: CRMCustomer[] = [];

  crmCustomers.forEach((c) => {
    if (!c || !c.id) return;
    const match = c.id.match(/^(CRM-\d{2}-\d{2}-)(\d+)$/);
    if (match) {
      const prefix = match[1];
      if (!prefixGroups[prefix]) {
        prefixGroups[prefix] = [];
      }
      prefixGroups[prefix].push(c);
    } else {
      ungrouped.push(c);
    }
  });

  const idMapping: Record<string, string> = {};
  const resequencedCustomers: CRMCustomer[] = [...ungrouped];

  Object.entries(prefixGroups).forEach(([prefix, list]) => {
    // Sort chronologically:
    // 1. By created_at (ascending)
    // 2. Fallback to numeric serial if created_at is identical
    const sorted = [...list].sort((a, b) => {
      const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
      const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
      if (timeA !== timeB && timeA > 0 && timeB > 0) {
        return timeA - timeB;
      }
      const numA = parseInt(a.id.substring(prefix.length), 10) || 0;
      const numB = parseInt(b.id.substring(prefix.length), 10) || 0;
      return numA - numB;
    });

    sorted.forEach((c, idx) => {
      const newSerial = idx + 1;
      const newId = `${prefix}${String(newSerial).padStart(3, '0')}`;
      if (c.id !== newId) {
        idMapping[c.id] = newId;
        resequencedCustomers.push({ ...c, id: newId });
      } else {
        resequencedCustomers.push(c);
      }
    });
  });

  const changesCount = Object.keys(idMapping).length;
  if (changesCount === 0) {
    return { updatedState: state, idMapping: {}, changesCount: 0 };
  }

  // Cascade updates across all related state collections
  const updatedQuotations = (state.crmQuotations || []).map((q) => {
    if (q && q.customer_id && idMapping[q.customer_id]) {
      return { ...q, customer_id: idMapping[q.customer_id] };
    }
    return q;
  });

  const updatedFollowUps = (state.crmFollowUps || []).map((f) => {
    if (f && f.customer_id && idMapping[f.customer_id]) {
      return { ...f, customer_id: idMapping[f.customer_id] };
    }
    return f;
  });

  const updatedNotes = (state.crmNotes || []).map((n) => {
    if (n && n.customer_id && idMapping[n.customer_id]) {
      return { ...n, customer_id: idMapping[n.customer_id] };
    }
    return n;
  });

  const updatedAttachments = (state.crmAttachments || []).map((a) => {
    if (a && a.customer_id && idMapping[a.customer_id]) {
      return { ...a, customer_id: idMapping[a.customer_id] };
    }
    return a;
  });

  const updatedPayments = (state.crmPayments || []).map((p) => {
    if (p && p.customer_id && idMapping[p.customer_id]) {
      return { ...p, customer_id: idMapping[p.customer_id] };
    }
    return p;
  });

  const updatedTimelineEvents = (state.crmTimelineEvents || []).map((e) => {
    if (e && e.customer_id && idMapping[e.customer_id]) {
      return { ...e, customer_id: idMapping[e.customer_id] };
    }
    return e;
  });

  const updatedCustomers = (state.customers || []).map((cust) => {
    if (cust && cust.id && idMapping[cust.id]) {
      return { ...cust, id: idMapping[cust.id] };
    }
    return cust;
  });

  const updatedOrders = (state.orders || []).map((o) => {
    if (o && o.customer_id && idMapping[o.customer_id]) {
      return { ...o, customer_id: idMapping[o.customer_id] };
    }
    return o;
  });

  const updatedState: AppState = {
    ...state,
    crmCustomers: resequencedCustomers,
    crmQuotations: updatedQuotations,
    crmFollowUps: updatedFollowUps,
    crmNotes: updatedNotes,
    crmAttachments: updatedAttachments,
    crmPayments: updatedPayments,
    crmTimelineEvents: updatedTimelineEvents,
    customers: updatedCustomers,
    orders: updatedOrders,
  };

  return { updatedState, idMapping, changesCount };
}

