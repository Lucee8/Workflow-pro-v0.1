/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { User, Customer, Order, StatusLog, Payment, Material, AlertRule, OrderStage, CRMCustomer, CRMQuotation, CRMFollowUp, CRMPayment, CRMNote, CRMAttachment, CRMTimelineEvent, AuditLog } from '../types';

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
    is_active: true,
    status: 'ACTIVE',
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
    is_active: true,
    status: 'ACTIVE',
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
    is_active: true,
    status: 'ACTIVE',
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
    is_active: true,
    status: 'ACTIVE',
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
    is_active: true,
    status: 'ACTIVE',
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
    is_active: true,
    status: 'ACTIVE',
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
    is_active: true,
    status: 'ACTIVE',
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
    is_active: true,
    status: 'ACTIVE',
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
    is_active: true,
    status: 'ACTIVE',
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
    is_active: true,
    status: 'ACTIVE',
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
    is_active: true,
    status: 'ACTIVE',
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
    is_active: true,
    status: 'ACTIVE',
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
    is_active: true,
    status: 'ACTIVE',
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
    is_active: true,
    status: 'ACTIVE',
    last_seen: 'Just now',
    created_at: '2026-07-04T02:00:00Z',
    google_linked: false,
    phone: '9876543229',
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
  auditLogs: AuditLog[];
}

export function loadState(): AppState {
  try {
    const data = localStorage.getItem('bhise_workshop_tracker_db');
    if (data) {
      const parsed = JSON.parse(data);
      if (parsed && typeof parsed === 'object') {
        const existingUsers: User[] = Array.isArray(parsed.users) && parsed.users.length > 0 ? parsed.users : SEED_USERS;
        const requiredUsers: User[] = [
          SEED_USERS.find(u => u.email === 'yogesh@gmail.com')!,
          SEED_USERS.find(u => u.email === 'suresh@gmail.com')!,
          SEED_USERS.find(u => u.email === 'woodtab@gmail.com')!,
        ].filter(Boolean);

        requiredUsers.forEach(reqUser => {
          const idx = existingUsers.findIndex(u => u.email.toLowerCase() === reqUser.email.toLowerCase());
          if (idx === -1) {
            existingUsers.push(reqUser);
          }
        });

        return {
          users: existingUsers.map(u => ({
            ...u,
            status: u.status || (u.is_active ? 'ACTIVE' : 'INACTIVE'),
          })),
          customers: Array.isArray(parsed.customers) ? parsed.customers : [],
          orders: Array.isArray(parsed.orders) ? parsed.orders : [],
          statusLogs: Array.isArray(parsed.statusLogs) ? parsed.statusLogs : [],
          materials: Array.isArray(parsed.materials) ? parsed.materials : [],
          payments: Array.isArray(parsed.payments) ? parsed.payments : [],
          currentUser: null,
          crmCustomers: Array.isArray(parsed.crmCustomers) ? parsed.crmCustomers : [],
          crmQuotations: Array.isArray(parsed.crmQuotations) ? parsed.crmQuotations : [],
          crmFollowUps: Array.isArray(parsed.crmFollowUps) ? parsed.crmFollowUps : [],
          crmPayments: Array.isArray(parsed.crmPayments) ? parsed.crmPayments : [],
          crmNotes: Array.isArray(parsed.crmNotes) ? parsed.crmNotes : [],
          crmAttachments: Array.isArray(parsed.crmAttachments) ? parsed.crmAttachments : [],
          crmTimelineEvents: Array.isArray(parsed.crmTimelineEvents) ? parsed.crmTimelineEvents : [],
          auditLogs: Array.isArray(parsed.auditLogs) ? parsed.auditLogs : [],
        };
      }
    }
  } catch (error) {
    console.error('Failed reading localStorage database', error);
  }

  // Fallback to initial data structure
  const state: AppState = {
    users: SEED_USERS,
    customers: SEED_CUSTOMERS,
    orders: SEED_ORDERS,
    statusLogs: SEED_LOGS,
    materials: SEED_MATERIALS,
    payments: SEED_PAYMENTS,
    currentUser: null,
    crmCustomers: [],
    crmQuotations: [],
    crmFollowUps: [],
    crmPayments: [],
    crmNotes: [],
    crmAttachments: [],
    crmTimelineEvents: [],
    auditLogs: [],
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
