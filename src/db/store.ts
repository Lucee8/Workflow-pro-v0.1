/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { User, Customer, Order, StatusLog, Payment, Material, AlertRule, OrderStage, CRMCustomer, CRMQuotation, CRMFollowUp, CRMPayment, CRMNote, CRMAttachment, CRMTimelineEvent } from '../types';

// Helper to generate UUIDs
export function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/// Initial Seed Users
const SEED_USERS: User[] = [
  {
    id: 'user_admin',
    name: 'Admin Manager',
    email: 'admin@bhisesworkshop.com',
    role: 'admin',
    initials: 'AD',
    is_active: true,
    last_seen: 'Just now',
    created_at: '2026-06-02T18:22:29Z',
    password: 'admin',
    google_linked: false,
  },
  {
    id: 'user_lucee_gmail',
    name: 'Lucee Code Administrator',
    email: 'luceecode@gmail.com',
    role: 'admin',
    initials: 'LC',
    is_active: true,
    last_seen: 'Just now',
    created_at: '2026-06-02T18:22:29Z',
    password: 'admin',
    google_linked: true,
  },
  {
    id: 'user_rinku_v_prod',
    name: 'Rinku Vishwakarma',
    email: 'rinku@bhisesworkshop.com',
    role: 'carpenter',
    initials: 'RV',
    is_active: true,
    last_seen: 'Never active yet',
    created_at: '2026-07-04T02:00:00Z',
    password: 'carpenter123',
    google_linked: false,
    phone: '9876543221',
  },
  {
    id: 'user_ifran_k_prod',
    name: 'Ifran Khan',
    email: 'ifran@bhisesworkshop.com',
    role: 'carpenter',
    initials: 'IK',
    is_active: true,
    last_seen: 'Never active yet',
    created_at: '2026-07-04T02:00:00Z',
    password: 'carpenter123',
    google_linked: false,
    phone: '9876543222',
  },
  {
    id: 'user_vijay_k_prod',
    name: 'Vijay Kumar',
    email: 'vijay@bhisesworkshop.com',
    role: 'carpenter',
    initials: 'VK',
    is_active: true,
    last_seen: 'Never active yet',
    created_at: '2026-07-04T02:00:00Z',
    password: 'carpenter123',
    google_linked: false,
    phone: '9876543223',
  },
  {
    id: 'user_dinesh_m_prod',
    name: 'Dinesh Mestry',
    email: 'dinesh.m@bhisesworkshop.com',
    role: 'carpenter',
    initials: 'DM',
    is_active: true,
    last_seen: 'Never active yet',
    created_at: '2026-07-04T02:00:00Z',
    password: 'carpenter123',
    google_linked: false,
    phone: '9876543224',
  },
  {
    id: 'user_dinesh_v_prod',
    name: 'Dinesh Vishwakarma',
    email: 'dinesh.v@bhisesworkshop.com',
    role: 'carpenter',
    initials: 'DV',
    is_active: true,
    last_seen: 'Never active yet',
    created_at: '2026-07-04T02:00:00Z',
    password: 'carpenter123',
    google_linked: false,
    phone: '9876543225',
  },
  {
    id: 'user_suresh_m_prod',
    name: 'Suresh Mestry',
    email: 'suresh@bhisesworkshop.com',
    role: 'carpenter',
    initials: 'SM',
    is_active: true,
    last_seen: 'Never active yet',
    created_at: '2026-07-04T02:00:00Z',
    password: 'carpenter123',
    google_linked: false,
    phone: '9876543226',
  },
  {
    id: 'user_parma_c_prod',
    name: 'Parma Chauhan',
    email: 'parma@bhisesworkshop.com',
    role: 'polish_person',
    initials: 'PC',
    is_active: true,
    last_seen: 'Never active yet',
    created_at: '2026-07-04T02:00:00Z',
    password: 'polish123',
    google_linked: false,
    phone: '9876543227',
  },
  {
    id: 'user_sunil_k_prod',
    name: 'Sunil Kumar',
    email: 'sunil@bhisesworkshop.com',
    role: 'polish_person',
    initials: 'SK',
    is_active: true,
    last_seen: 'Never active yet',
    created_at: '2026-07-04T02:00:00Z',
    password: 'polish123',
    google_linked: false,
    phone: '9876543228',
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
                if (seen.has(o.article_no)) {
                  // Track duplicates for later re-sequencing
                  return;
                }
                seen.add(o.article_no);
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

          return {
            ...parsed,
            payments: parsed.payments || [],
            materials: parsed.materials || [],
            crmCustomers: parsed.crmCustomers || [],
            crmQuotations: parsed.crmQuotations || [],
            crmFollowUps: parsed.crmFollowUps || [],
            crmPayments: parsed.crmPayments || [],
            crmNotes: parsed.crmNotes || [],
            crmAttachments: parsed.crmAttachments || [],
            crmTimelineEvents: parsed.crmTimelineEvents || [],
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
    currentUser: SEED_USERS[0], // Start as Admin for convenience, login allows changes
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
    localStorage.setItem('bhise_workshop_tracker_db', JSON.stringify(state));
  } catch (err) {
    console.error('Failed writing to localStorage database', err);
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
