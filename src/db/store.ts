/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { User, Customer, Order, StatusLog, Payment, Material, AlertRule, OrderStage } from '../types';

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
    id: 'user_amit_prod',
    name: 'Amit Sharma',
    email: 'amit@gmail.com',
    role: 'carpenter',
    initials: 'AS',
    is_active: true,
    last_seen: 'Never active yet',
    created_at: '2026-06-02T18:22:29Z',
    password: 'carpenter123',
    google_linked: true,
    phone: '9876543211',
  },
  {
    id: 'user_mahesh_prod',
    name: 'Mahesh Verma',
    email: 'mahesh@gmail.com',
    role: 'polish_person',
    initials: 'MV',
    is_active: true,
    last_seen: 'Never active yet',
    created_at: '2023-06-02T18:22:29Z',
    password: 'polishperson123',
    google_linked: true,
    phone: '9876543212',
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
}

export function loadState(): AppState {
  try {
    const data = localStorage.getItem('bhise_workshop_tracker_db');
    if (data) {
      const parsed = JSON.parse(data);
      if (parsed.users && parsed.orders && parsed.customers) {
        // Detect old legacy mock records and purge them to force a clean start
        const isDemo = parsed.users.some((u: any) => u.id === 'user_amit_gmail' || u.id === 'user_sagar' || u.email === 'admin@bhises@gmail.com') ||
                       parsed.orders.some((o: any) => o.id === 'order_1');
        if (isDemo) {
          localStorage.removeItem('bhise_workshop_tracker_db');
          localStorage.removeItem('mrp_hardware_v2');
          localStorage.removeItem('mrp_wood_v2');
          localStorage.removeItem('mrp_consumption_logs');
        } else {
          return {
            ...parsed,
            payments: parsed.payments || [],
            materials: parsed.materials || [],
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

// Generate serial formula: YY/MM/BH(1st 2 chars of name)/0000(sr.no. in series)
export function generateArticleNumber(
  category: string,
  carpenterId: string,
  allOrders: Order[],
  allUsers: User[]
): string {
  const date = new Date();
  const yy = date.getFullYear().toString().slice(-2);
  const mm = String(date.getMonth() + 1).padStart(2, '0');

  const carpenter = allUsers.find(u => u.id === carpenterId);
  const namePart = carpenter ? carpenter.name.substring(0, 2).toUpperCase() : 'XX';

  // Count existing orders globally as series count
  const nextSerial = allOrders.length + 1;
  const nnnn = String(nextSerial).padStart(4, '0');

  return `${yy}/${mm}/${namePart}/${nnnn}`;
}
