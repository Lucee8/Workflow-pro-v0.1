/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { UserRole } from './types';

/**
 * Centralized Role-Based Access Control (RBAC) Permissions Map
 * Single source of truth for all role authorization across the application.
 */
export const ROLE_PERMISSIONS: Record<string, string[]> = {
  ADMIN: ['*'],
  MANAGER: [
    'carpenter_reports',
    'carpenter-reports',
    'orders',
    'detail_order_form',
    'order_details',
  ],
  WOOD_TAB_MANAGER: [
    'wood_management',
  ],
  CARPENTER: [
    'my_orders',
    'profile',
    'order_details',
  ],
  POLISH_PERSON: [
    'my_orders',
    'profile',
    'order_details',
  ],
  QC_STAFF: [
    'my_orders',
    'profile',
    'order_details',
  ],
};

/**
 * Check whether a given user role has permission to access a specific module or feature.
 */
export function hasPermission(role: UserRole | string | undefined | null, permission: string): boolean {
  if (!role) return false;
  const normalizedRole = role.toUpperCase().replace(/\s+/g, '_');
  const allowed = ROLE_PERMISSIONS[normalizedRole] || [];
  if (allowed.includes('*')) return true;

  const normalizedTarget = permission.toLowerCase().replace(/[-_]/g, '');
  return allowed.some((p) => {
    if (p === permission) return true;
    const normP = p.toLowerCase().replace(/[-_]/g, '');
    return normP === normalizedTarget;
  });
}

/**
 * Get the initial landing / default tab for any user role upon login or redirect.
 */
export function getDefaultTabForRole(role: UserRole | string | undefined | null): string {
  if (!role) return 'dashboard';
  const normalized = role.toLowerCase().replace(/[\s-]/g, '_');
  if (normalized === 'admin') return 'dashboard';
  if (normalized === 'manager') return 'orders';
  if (normalized === 'wood_tab_manager') return 'wood_management';
  if (normalized === 'carpenter' || normalized === 'polish_person' || normalized === 'qc_staff') return 'my_orders';
  return 'dashboard';
}

/**
 * Get formatted human-readable display name for any role.
 */
export function getRoleDisplayName(role: UserRole | string | undefined | null): string {
  if (!role) return 'Unknown';
  const normalized = role.toLowerCase().replace(/[\s-]/g, '_');
  switch (normalized) {
    case 'admin':
      return 'Administrator';
    case 'manager':
      return 'Manager';
    case 'wood_tab_manager':
      return 'Wood Tab Manager';
    case 'carpenter':
      return 'Carpenter';
    case 'polish_person':
      return 'Polish Person';
    case 'qc_staff':
      return 'QC Staff';
    default:
      return role.replace(/_/g, ' ');
  }
}
