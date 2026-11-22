/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { CNCJob, User, UserRole } from '../types';

export const CNC_MACHINES = ['Small', 'Big'] as const;
export type CNCMachineOption = (typeof CNC_MACHINES)[number];

/**
 * Returns local calendar date in YYYY-MM-DD without UTC timezone drift.
 */
export function getLocalDateYYYYMMDD(date: Date = new Date()): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Returns current local time in 24-hour HH:MM format.
 */
export function getLocalTimeHHMM(date: Date = new Date()): string {
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

/**
 * Formats a YYYY-MM-DD string, ISO timestamp, or Date into DD/MM/YYYY.
 */
export function formatDateDDMMYYYY(dateInput?: string | Date | null): string {
  if (!dateInput) return '—';
  if (dateInput instanceof Date) {
    if (isNaN(dateInput.getTime())) return '—';
    const dd = String(dateInput.getDate()).padStart(2, '0');
    const mm = String(dateInput.getMonth() + 1).padStart(2, '0');
    const yyyy = dateInput.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  }
  const str = String(dateInput).trim();
  if (!str) return '—';
  const ymdMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (ymdMatch) {
    return `${ymdMatch[3]}/${ymdMatch[2]}/${ymdMatch[1]}`;
  }
  const dmyMatch = str.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (dmyMatch) {
    return str;
  }
  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    const dd = String(parsed.getDate()).padStart(2, '0');
    const mm = String(parsed.getMonth() + 1).padStart(2, '0');
    const yyyy = parsed.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  }
  return str;
}

/**
 * Validates strict 24-hour HH:MM format (00:00 to 23:59).
 */
export function isValid24HourTime(value?: string | null): boolean {
  if (!value) return false;
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value.trim());
}

/**
 * Normalizes single-digit hours like "9:30" -> "09:30" on blur if valid.
 */
export function normalize24HourTimeInput(value: string): string {
  const trimmed = value.trim();
  const match = trimmed.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return trimmed;
  const h = Number(match[1]);
  const m = Number(match[2]);
  if (h >= 0 && h <= 23 && m >= 0 && m <= 59) {
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }
  return trimmed;
}

export function parse24HourTimeToMinutes(hhmm?: string | null): number | null {
  if (!hhmm || !isValid24HourTime(hhmm)) return null;
  const [hStr, mStr] = hhmm.trim().split(':');
  return Number(hStr) * 60 + Number(mStr);
}

/**
 * Formats integer minutes into 24-hour duration HH:MM (e.g. 150 -> "02:30").
 */
export function formatMinutesToHHMM(totalMinutes: number): string {
  const safe = Math.max(0, Math.round(Number(totalMinutes) || 0));
  const hrs = Math.floor(safe / 60);
  const mins = safe % 60;
  return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
}

export interface RunningTimeResult {
  isValid: boolean;
  formatted: string;
  minutes: number;
  isOvernight: boolean;
  error?: string;
}

/**
 * Calculates CNC Machine Running Time in HH:MM from 24-hour Start Time and Stop Time.
 * Supports same-day (Stop > Start) and overnight shifts (Stop < Start when isOvernight=true).
 */
export function calculateMachineRunningTime(
  startTime?: string | null,
  stopTime?: string | null,
  isOvernight = false
): RunningTimeResult {
  const start = (startTime || '').trim();
  const stop = (stopTime || '').trim();

  if (!start || !stop) {
    return {
      isValid: false,
      formatted: '',
      minutes: 0,
      isOvernight,
      error: 'Start Time and Stop Time are required in 24-hour HH:MM format.',
    };
  }

  if (!isValid24HourTime(start) || !isValid24HourTime(stop)) {
    return {
      isValid: false,
      formatted: '',
      minutes: 0,
      isOvernight,
      error: 'Enter valid 24-hour times between 00:00 and 23:59 (e.g. 09:30, 18:30).',
    };
  }

  const startMins = parse24HourTimeToMinutes(start)!;
  const stopMins = parse24HourTimeToMinutes(stop)!;

  if (startMins === stopMins) {
    return {
      isValid: false,
      formatted: '',
      minutes: 0,
      isOvernight,
      error: 'Stop Time cannot be the same as Start Time.',
    };
  }

  let diffMinutes = 0;
  if (stopMins > startMins) {
    diffMinutes = stopMins - startMins;
  } else {
    if (!isOvernight) {
      return {
        isValid: false,
        formatted: '',
        minutes: 0,
        isOvernight: false,
        error: `Stop Time (${stop}) is earlier than Start Time (${start}). Enable "Overnight shift" if the job ran past midnight.`,
      };
    }
    diffMinutes = 24 * 60 - startMins + stopMins;
  }

  return {
    isValid: true,
    formatted: formatMinutesToHHMM(diffMinutes),
    minutes: diffMinutes,
    isOvernight: stopMins < startMins ? true : isOvernight,
  };
}

export function normalizeUserRole(role?: UserRole | string | null): string {
  if (!role) return '';
  return String(role).trim().toLowerCase().replace(/[\s-]+/g, '_');
}

export function isSuperAdminRole(role?: UserRole | string | null): boolean {
  return normalizeUserRole(role) === 'super_admin';
}

export function isAdminRole(role?: UserRole | string | null): boolean {
  const norm = normalizeUserRole(role);
  return norm === 'admin' || norm === 'super_admin';
}

export function isOperatorRole(role?: UserRole | string | null): boolean {
  const norm = normalizeUserRole(role);
  return norm === 'cnc_operator' || norm === 'operator';
}

export function isCNCManagerRole(role?: UserRole | string | null): boolean {
  const norm = normalizeUserRole(role);
  return norm === 'cnc_workshop' || norm === 'cnc_manager';
}

export function isUserActiveStatus(user?: { status?: string; is_active?: boolean } | null): boolean {
  if (!user) return false;
  const status = (user.status || (user.is_active ? 'ACTIVE' : 'INACTIVE')).toUpperCase();
  return status === 'ACTIVE';
}

/**
 * Returns all CNC operators (active + inactive) from the central user directory.
 */
export function getAllCNCOperators(users: User[]): User[] {
  const seen = new Set<string>();
  return (users || []).filter((u) => {
    if (!u || !u.id || seen.has(u.id)) return false;
    if (!isOperatorRole(u.role)) return false;
    seen.add(u.id);
    return true;
  });
}

/**
 * Returns only ACTIVE CNC operators for dropdowns & job assignments.
 */
export function getActiveCNCOperators(users: User[]): User[] {
  return getAllCNCOperators(users).filter((u) => isUserActiveStatus(u));
}

/**
 * Checks whether a CNCJob belongs to the given operator (by operator_id or legacy operator_name fallback).
 */
export function jobBelongsToOperator(job: CNCJob, user: User): boolean {
  if (!job || !user) return false;
  if (job.operator_id && job.operator_id.trim()) {
    return job.operator_id.trim() === user.id;
  }
  const jobOpName = (job.operator_name || '').trim().toLowerCase();
  const userName = (user.name || '').trim().toLowerCase();
  return Boolean(jobOpName && userName && jobOpName === userName);
}

/**
 * Filters CNC jobs according to role permissions:
 * - Operators see ONLY their own assigned jobs.
 * - Admins / Super Admins / CNC Managers see all jobs.
 */
export function filterJobsForUser(jobs: CNCJob[], currentUser: User): CNCJob[] {
  if (!currentUser) return [];
  if (isOperatorRole(currentUser.role)) {
    return (jobs || []).filter((j) => jobBelongsToOperator(j, currentUser));
  }
  return jobs || [];
}

/**
 * Resolves numeric machine running minutes from machine_running_time or legacy run_time_minutes.
 */
export function getJobRunningMinutes(job: CNCJob): number {
  if (job.machine_running_time) {
    const match = job.machine_running_time.trim().match(/^(\d+):([0-5]\d)$/);
    if (match) {
      return Number(match[1]) * 60 + Number(match[2]);
    }
  }
  return Math.max(0, Math.round(Number(job.run_time_minutes ?? job.completion_time_minutes ?? 0) || 0));
}

/**
 * Returns HH:MM string for display in queue, dashboard, and reports (with legacy minute fallback).
 */
export function getJobRunningTimeDisplay(job: CNCJob): string {
  if (job.machine_running_time && /^\d+:[0-5]\d$/.test(job.machine_running_time.trim())) {
    return job.machine_running_time.trim();
  }
  const mins = Number(job.run_time_minutes ?? job.completion_time_minutes ?? 0);
  if (mins > 0) {
    return formatMinutesToHHMM(mins);
  }
  return '—';
}

export interface OperatorJobStats {
  assignedCount: number;
  queuedCount: number;
  inProgressCount: number;
  completedCount: number;
  totalRunningMinutes: number;
  totalRunningHHMM: string;
  assignedJobs: CNCJob[];
}

export function computeOperatorJobStats(operator: User, jobs: CNCJob[]): OperatorJobStats {
  const assignedJobs = (jobs || []).filter((j) => jobBelongsToOperator(j, operator));
  const queuedCount = assignedJobs.filter((j) => j.status === 'Queued' || j.status === 'Pending').length;
  const inProgressCount = assignedJobs.filter((j) => j.status === 'In Progress').length;
  const completedCount = assignedJobs.filter((j) => j.status === 'Completed').length;
  const totalRunningMinutes = assignedJobs.reduce((sum, j) => sum + getJobRunningMinutes(j), 0);

  return {
    assignedCount: assignedJobs.length,
    queuedCount,
    inProgressCount,
    completedCount,
    totalRunningMinutes,
    totalRunningHHMM: formatMinutesToHHMM(totalRunningMinutes),
    assignedJobs,
  };
}

/**
 * Generates deterministic SHA-256 hex digest (used for privacy-preserving operatorInvites document IDs).
 */
export async function sha256Hex(input: string): Promise<string> {
  const normalized = input.trim().toLowerCase();
  const data = new TextEncoder().encode(normalized);
  const hashBuffer = await globalThis.crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}
