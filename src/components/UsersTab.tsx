/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { User, UserRole, UserStatus, AuditLog } from '../types';
import { generateUUID } from '../db/store';
import { 
  Users, 
  Filter, 
  PlusCircle, 
  Search, 
  Edit2, 
  ShieldAlert, 
  Check, 
  X,
  ShieldCheck,
  Mail, 
  Lock, 
  CheckCircle2,
  Trash2,
  KeyRound,
  History,
  Shield,
  Clock,
  AlertTriangle,
  RefreshCw,
  Send,
  UserCheck,
  UserX,
  UserMinus
} from 'lucide-react';
import { auth } from '../db/firebase';
import { sendPasswordResetEmail } from 'firebase/auth';
import { logAuditEvent } from '../db/firebaseService';

interface UsersTabProps {
  users: User[];
  auditLogs?: AuditLog[];
  onAddUser: (user: User) => void;
  onUpdateUser: (updatedUser: User) => void;
  onDeleteUser: (userId: string) => void;
  currentUser: User;
}

export default function UsersTab({ 
  users, 
  auditLogs = [],
  onAddUser, 
  onUpdateUser, 
  onDeleteUser, 
  currentUser 
}: UsersTabProps) {
  const [activeSubTab, setActiveSubTab] = React.useState<'users' | 'audit_logs'>('users');
  const [searchTerm, setSearchTerm] = React.useState('');
  const [roleFilter, setRoleFilter] = React.useState<string>('All Roles');
  const [statusFilter, setStatusFilter] = React.useState<string>('All Statuses');
  const [confirmDeleteId, setConfirmDeleteId] = React.useState<string | null>(null);
  const [actionNotice, setActionNotice] = React.useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Auto-reset notices
  React.useEffect(() => {
    if (actionNotice) {
      const timer = setTimeout(() => setActionNotice(null), 4500);
      return () => clearTimeout(timer);
    }
  }, [actionNotice]);

  // Auto-reset user deletion confirmation after 4 seconds
  React.useEffect(() => {
    if (confirmDeleteId) {
      const timer = setTimeout(() => setConfirmDeleteId(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [confirmDeleteId]);

  // Modular user model edits
  const [editingUser, setEditingUser] = React.useState<User | null>(null);
  const [showAddModal, setShowAddModal] = React.useState(false);

  // Form states (NO plaintext passwords)
  const [fullName, setFullName] = React.useState('');
  const [userEmail, setUserEmail] = React.useState('');
  const [userRole, setUserRole] = React.useState<UserRole>('manager');
  const [initials, setInitials] = React.useState('');
  const [userStatus, setUserStatus] = React.useState<UserStatus>('ACTIVE');
  const [phone, setPhone] = React.useState('');
  const [isGoogleLinked, setIsGoogleLinked] = React.useState(true);

  // Compute metric cards
  const totalUsers = users.length;
  const activeUsersCount = users.filter((u) => u.status === 'ACTIVE' || (!u.status && u.is_active)).length;
  const inactiveUsersCount = totalUsers - activeUsersCount;
  const rolesCount = new Set(users.map((u) => u.role)).size;

  // Filter lists
  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.role.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesRole = roleFilter === 'All Roles' || user.role === roleFilter;

    let matchesStatus = true;
    const currentStatus = user.status || (user.is_active ? 'ACTIVE' : 'INACTIVE');
    if (statusFilter !== 'All Statuses') {
      matchesStatus = currentStatus.toUpperCase() === statusFilter.toUpperCase();
    }

    return matchesSearch && matchesRole && matchesStatus;
  });

  const handleEditClick = (u: User) => {
    setEditingUser(u);
    setFullName(u.name);
    setUserEmail(u.email);
    setUserRole(u.role);
    setInitials(u.initials);
    setUserStatus(u.status || (u.is_active ? 'ACTIVE' : 'INACTIVE'));
    setPhone(u.phone || '');
    setIsGoogleLinked(u.google_linked ?? true);
    setShowAddModal(false);
  };

  const startAddNewUser = () => {
    setEditingUser(null);
    setFullName('');
    setUserEmail('');
    setUserRole('manager');
    setInitials('');
    setUserStatus('ACTIVE');
    setPhone('');
    setIsGoogleLinked(true);
    setShowAddModal(true);
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !userEmail.trim() || !initials.trim()) {
      setActionNotice({ type: 'error', message: 'Mandatory fields: Name, Email and 2-Character initials are required.' });
      return;
    }

    if (initials.trim().length !== 2) {
      setActionNotice({ type: 'error', message: 'Initials must be exactly 2 uppercase characters.' });
      return;
    }

    const emailClean = userEmail.trim().toLowerCase();
    if (users.some(u => u.email.trim().toLowerCase() === emailClean)) {
      setActionNotice({ type: 'error', message: `User with email "${emailClean}" is already registered.` });
      return;
    }

    const newUser: User = {
      id: 'user_' + generateUUID().split('-')[0],
      name: fullName.trim(),
      email: emailClean,
      role: userRole,
      initials: initials.trim().toUpperCase(),
      is_active: userStatus === 'ACTIVE',
      status: userStatus,
      phone: phone.trim() || undefined,
      last_seen: 'Never active yet',
      created_at: new Date().toISOString(),
      created_by: currentUser.id,
      google_linked: isGoogleLinked,
    };

    onAddUser(newUser);

    await logAuditEvent({
      action: 'USER_CREATED',
      actor_id: currentUser.id,
      actor_email: currentUser.email,
      actor_name: currentUser.name,
      target_id: newUser.id,
      target_email: newUser.email,
      details: `Created user ${newUser.name} with role ${newUser.role.toUpperCase()} and status ${newUser.status}`,
      status: 'SUCCESS',
    });

    setShowAddModal(false);
    setActionNotice({ type: 'success', message: `User "${fullName}" added successfully with role "${userRole.toUpperCase()}".` });
  };

  const handleSaveUserEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    if (!fullName.trim() || !userEmail.trim() || !initials.trim()) {
      setActionNotice({ type: 'error', message: 'Mandatory fields: Name, Email and 2-Character initials are required.' });
      return;
    }

    const roleChanged = editingUser.role !== userRole;
    const statusChanged = (editingUser.status || (editingUser.is_active ? 'ACTIVE' : 'INACTIVE')) !== userStatus;

    const updated: User = {
      ...editingUser,
      name: fullName.trim(),
      email: userEmail.trim().toLowerCase(),
      role: userRole,
      initials: initials.trim().toUpperCase(),
      is_active: userStatus === 'ACTIVE',
      status: userStatus,
      phone: phone.trim() || undefined,
      google_linked: isGoogleLinked,
    };

    onUpdateUser(updated);

    if (roleChanged || statusChanged) {
      await logAuditEvent({
        action: roleChanged ? 'ROLE_CHANGED' : 'STATUS_CHANGED',
        actor_id: currentUser.id,
        actor_email: currentUser.email,
        actor_name: currentUser.name,
        target_id: updated.id,
        target_email: updated.email,
        details: `Updated ${updated.name}: Role=${updated.role.toUpperCase()}, Status=${updated.status}`,
        status: 'SUCCESS',
      });
    }

    setEditingUser(null);
    setActionNotice({ type: 'success', message: `Profile updated for ${fullName}.` });
  };

  const handleSendPasswordReset = async (targetUser: User) => {
    try {
      await sendPasswordResetEmail(auth, targetUser.email);
      setActionNotice({ 
        type: 'success', 
        message: `Password reset email dispatched to ${targetUser.email}. The user will receive instructions to set their password.` 
      });

      await logAuditEvent({
        action: 'PASSWORD_RESET_DISPATCHED',
        actor_id: currentUser.id,
        actor_email: currentUser.email,
        actor_name: currentUser.name,
        target_id: targetUser.id,
        target_email: targetUser.email,
        details: `Admin requested password reset email for ${targetUser.email}`,
        status: 'SUCCESS',
      });
    } catch (err: any) {
      setActionNotice({ 
        type: 'error', 
        message: `Could not send reset email: ${err.message || 'Firebase Auth service offline.'}` 
      });
    }
  };

  const handleDeleteWithAudit = async (userId: string) => {
    const targetUser = users.find(u => u.id === userId);
    onDeleteUser(userId);
    setConfirmDeleteId(null);

    if (targetUser) {
      await logAuditEvent({
        action: 'USER_DELETED',
        actor_id: currentUser.id,
        actor_email: currentUser.email,
        actor_name: currentUser.name,
        target_id: targetUser.id,
        target_email: targetUser.email,
        details: `Deleted user profile ${targetUser.name} (${targetUser.email})`,
        status: 'SUCCESS',
      });
    }

    setActionNotice({ type: 'success', message: 'User account removed from database.' });
  };

  return (
    <div id="users-management-view" className="space-y-6 text-left">
      
      {/* Top Banner Notice */}
      {actionNotice && (
        <div 
          className={`p-4 rounded-xl border flex items-center justify-between text-xs font-semibold animate-in fade-in duration-200 ${
            actionNotice.type === 'success' 
              ? 'bg-emerald-50 text-emerald-900 border-emerald-200' 
              : 'bg-rose-50 text-rose-900 border-rose-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {actionNotice.type === 'success' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
            <span>{actionNotice.message}</span>
          </div>
          <button onClick={() => setActionNotice(null)} className="hover:opacity-70">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Page Title header & Tab Switcher */}
      <div className="flex justify-between items-center flex-wrap gap-4 border-b border-stone-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black font-display text-stone-900 tracking-tight">
              Users &amp; Access Control
            </h1>
            <span className="bg-stone-100 text-stone-700 px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider border border-stone-200">
              RBAC
            </span>
          </div>
          <p className="text-stone-500 text-xs mt-1">
            Pre-approved management directory, role permissions, and immutable security audit logs
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Sub-tab switcher */}
          <div className="bg-stone-100 p-1 rounded-xl flex items-center border border-stone-200">
            <button
              onClick={() => setActiveSubTab('users')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                activeSubTab === 'users' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <Users size={14} />
              <span>Authorized Users ({users.length})</span>
            </button>
            <button
              onClick={() => setActiveSubTab('audit_logs')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                activeSubTab === 'audit_logs' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <History size={14} />
              <span>Audit Logs ({auditLogs.length})</span>
            </button>
          </div>

          {activeSubTab === 'users' && (
            <button
              id="btn-add-new-user"
              onClick={startAddNewUser}
              className="flex items-center gap-2 bg-[#593622] hover:bg-[#402414] text-white font-bold py-2 px-4 rounded-xl shadow transition text-xs cursor-pointer"
            >
              <PlusCircle size={14} />
              <span>Add User</span>
            </button>
          )}
        </div>
      </div>

      {activeSubTab === 'users' ? (
        <>
          {/* KPI Counters row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-xl border border-stone-200/80 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-[10px] text-stone-400 font-bold block uppercase font-mono tracking-wider">Total Registered</span>
                <strong className="text-xl font-bold font-display text-stone-800 tracking-tight mt-0.5 block">{totalUsers}</strong>
              </div>
              <div className="bg-stone-50 text-stone-500 p-2.5 rounded-lg border border-stone-150">
                <Users size={16} />
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-stone-200/80 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-[10px] text-stone-400 font-bold block uppercase font-mono tracking-wider">Active Status</span>
                <strong className="text-xl font-bold font-display text-emerald-700 tracking-tight mt-0.5 block">{activeUsersCount}</strong>
              </div>
              <div className="bg-emerald-50 text-emerald-700 p-2.5 rounded-lg border border-emerald-150">
                <UserCheck size={17} />
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-stone-200/80 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-[10px] text-stone-400 font-bold block uppercase font-mono tracking-wider">Restricted / Inactive</span>
                <strong className="text-xl font-bold font-display text-rose-700 tracking-tight mt-0.5 block">{inactiveUsersCount}</strong>
              </div>
              <div className="bg-rose-50 text-rose-700 p-2.5 rounded-lg border border-rose-150">
                <UserX size={17} />
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-stone-200/80 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-[10px] text-stone-400 font-bold block uppercase font-mono tracking-wider">Active Roles</span>
                <strong className="text-xl font-bold font-display text-amber-900 tracking-tight mt-0.5 block">{rolesCount}</strong>
              </div>
              <div className="bg-[#fcf8f2] text-amber-700 p-2.5 rounded-lg border border-amber-200/40">
                <Shield size={17} />
              </div>
            </div>
          </div>

          {/* Filter Options bar */}
          <div className="bg-white p-4 rounded-2xl border border-stone-200/80 shadow-xs flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3.5 top-3.5 text-stone-400" size={15} />
              <input
                type="text"
                id="search-users-input"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by name, email, or role..."
                className="w-full pl-9 pr-3 py-2 bg-stone-50 border border-stone-200 focus:border-[#593622] rounded-xl text-xs focus:outline-none transition font-semibold"
              />
            </div>

            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
              <select
                id="filter-role-select"
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-semibold text-stone-700 focus:outline-none focus:border-[#593622] transition shrink-0 min-w-[140px]"
              >
                <option value="All Roles">All Roles</option>
                <option value="admin">Admin</option>
                <option value="manager">Manager</option>
                <option value="wood_tab_manager">Wood Tab Manager</option>
                <option value="carpenter">Carpenter</option>
                <option value="polish_person">Polish Person</option>
                <option value="qc_staff">QC Staff</option>
              </select>

              <select
                id="filter-status-select"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-semibold text-stone-700 focus:outline-none focus:border-[#593622] transition shrink-0 min-w-[125px]"
              >
                <option value="All Statuses">All Statuses</option>
                <option value="ACTIVE">ACTIVE</option>
                <option value="INACTIVE">INACTIVE</option>
                <option value="SUSPENDED">SUSPENDED</option>
                <option value="LOCKED">LOCKED</option>
              </select>
            </div>
          </div>

          {/* Users table registry */}
          <div className="bg-white rounded-2xl border border-stone-200/80 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-stone-600 border-collapse">
                <thead>
                  <tr className="bg-stone-50 border-b border-stone-200 font-mono text-[10px] uppercase text-stone-500 font-bold">
                    <th className="py-3 px-4">User</th>
                    <th className="py-3 px-4">Email</th>
                    <th className="py-3 px-4">Role</th>
                    <th className="py-3 px-4 text-center">Initials</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Auth Method</th>
                    <th className="py-3 px-4">Last Seen</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 font-sans">
                  {filteredUsers.map((user) => {
                    const status = user.status || (user.is_active ? 'ACTIVE' : 'INACTIVE');
                    return (
                      <tr key={user.id} className="hover:bg-stone-50/60 transition">
                        <td className="py-3.5 px-4 font-bold text-stone-900">
                          <div className="flex items-center gap-2.5">
                            <div className="h-7 w-7 rounded-full bg-[#fcf8f2] text-amber-950 font-black flex items-center justify-center text-[10px] uppercase tracking-wide shrink-0 border border-amber-300">
                              {user.initials}
                            </div>
                            <div>
                              <span>{user.name}</span>
                              {currentUser.id === user.id && (
                                <span className="ml-1.5 text-[9px] bg-stone-100 text-stone-600 px-1.5 py-0.5 rounded font-mono">
                                  You
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 font-medium text-stone-600">{user.email}</td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`px-2 py-0.5 rounded text-[9px] font-black border uppercase tracking-wider ${
                              user.role === 'admin'
                                ? 'bg-rose-50 text-rose-800 border-rose-200'
                                : user.role === 'manager'
                                ? 'bg-indigo-50 text-indigo-800 border-indigo-200'
                                : user.role === 'wood_tab_manager'
                                ? 'bg-orange-50 text-orange-800 border-orange-200'
                                : user.role === 'carpenter'
                                ? 'bg-amber-50 text-amber-800 border-amber-250'
                                : 'bg-teal-50 text-teal-800 border-teal-200'
                            }`}
                          >
                            {user.role.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-mono font-bold text-stone-800 text-center">{user.initials}</td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider inline-flex items-center gap-1 ${
                              status === 'ACTIVE'
                                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                : status === 'SUSPENDED'
                                ? 'bg-amber-50 text-amber-800 border border-amber-200'
                                : status === 'LOCKED'
                                ? 'bg-purple-50 text-purple-800 border border-purple-200'
                                : 'bg-stone-100 text-stone-600 border border-stone-200'
                            }`}
                          >
                            <span className={`h-1.5 w-1.5 rounded-full ${status === 'ACTIVE' ? 'bg-emerald-600' : 'bg-stone-400'}`} />
                            {status}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          {user.google_linked ? (
                            <span className="text-[10px] text-blue-700 font-bold flex items-center gap-1">
                              <ShieldCheck size={12} /> Google SSO
                            </span>
                          ) : (
                            <span className="text-[10px] text-stone-500 font-medium">Email / Password</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-stone-400 text-[10px]">
                          {user.last_seen || 'Never'}
                        </td>
                        <td className="py-3.5 px-4 text-right shrink-0">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Send password reset link */}
                            <button
                              onClick={() => handleSendPasswordReset(user)}
                              className="bg-stone-100 hover:bg-stone-200 text-stone-700 p-1.5 rounded-lg transition"
                              title="Send Firebase Password Reset Email"
                            >
                              <KeyRound size={13} />
                            </button>

                            {/* Edit user details */}
                            <button
                              onClick={() => handleEditClick(user)}
                              className="bg-stone-100 hover:bg-[#593622] hover:text-white p-1.5 rounded-lg text-stone-700 transition"
                              title="Edit user role & status"
                            >
                              <Edit2 size={13} />
                            </button>

                            {/* Delete user */}
                            {confirmDeleteId === user.id ? (
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => handleDeleteWithAudit(user.id)}
                                  className="bg-rose-600 hover:bg-rose-700 text-white font-mono px-2 py-1 text-[9px] font-bold rounded uppercase shadow-sm cursor-pointer"
                                >
                                  Confirm
                                </button>
                                <button
                                  onClick={() => setConfirmDeleteId(null)}
                                  className="bg-stone-100 hover:bg-stone-200 text-stone-600 px-1.5 py-1 text-[9px] rounded font-semibold"
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => setConfirmDeleteId(user.id)}
                                className="bg-rose-50 hover:bg-rose-600 hover:text-white p-1.5 rounded-lg text-rose-700 transition cursor-pointer"
                                title="Remove User"
                              >
                                <Trash2 size={13} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        /* Immutable Audit Logs Viewer */
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-2xl border border-stone-200/80 shadow-xs flex justify-between items-center flex-wrap gap-3">
            <div>
              <h3 className="text-sm font-bold text-stone-900 flex items-center gap-2">
                <History size={16} className="text-stone-700" />
                <span>Security &amp; Authorization Activity Logs</span>
              </h3>
              <p className="text-[11px] text-stone-500 mt-0.5">
                Real-time record of all logins, access denials, role adjustments, and user state changes
              </p>
            </div>
            <span className="text-[10px] font-mono text-stone-500 bg-stone-100 px-2 py-1 rounded border">
              Total Log Entries: {auditLogs.length}
            </span>
          </div>

          <div className="bg-white rounded-2xl border border-stone-200/80 shadow-xs overflow-hidden">
            {auditLogs.length === 0 ? (
              <div className="p-8 text-center text-stone-400 text-xs">
                No audit events recorded yet. Authentication and modification attempts will appear here in real time.
              </div>
            ) : (
              <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="sticky top-0 bg-stone-50 border-b border-stone-200 text-[10px] font-mono uppercase text-stone-500 font-bold z-10">
                    <tr>
                      <th className="py-3 px-4">Timestamp</th>
                      <th className="py-3 px-4">Event Type</th>
                      <th className="py-3 px-4">Actor</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Activity Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100 font-sans text-stone-700">
                    {auditLogs.slice().reverse().map((log) => {
                      const isDenied = log.action.includes('DENIED') || log.status === 'DENIED';
                      return (
                        <tr key={log.id} className={isDenied ? 'bg-rose-50/40 hover:bg-rose-50/70' : 'hover:bg-stone-50/50'}>
                          <td className="py-3 px-4 font-mono text-[10px] text-stone-500 whitespace-nowrap">
                            {new Date(log.timestamp).toLocaleString()}
                          </td>
                          <td className="py-3 px-4 font-bold">
                            <span 
                              className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase tracking-wider border ${
                                isDenied 
                                  ? 'bg-rose-100 text-rose-800 border-rose-300' 
                                  : 'bg-stone-100 text-stone-800 border-stone-200'
                              }`}
                            >
                              {log.action}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-semibold text-stone-900">{log.actor_name || 'System'}</div>
                            <div className="text-[10px] text-stone-500 font-mono">{log.actor_email}</div>
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                                isDenied
                                  ? 'bg-rose-200/70 text-rose-900'
                                  : 'bg-emerald-100 text-emerald-900'
                              }`}
                            >
                              {log.status || (isDenied ? 'DENIED' : 'SUCCESS')}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-xs leading-relaxed max-w-md">
                            {log.details}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* User Creation and Editing Modal */}
      {(showAddModal || editingUser) && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-stone-200 space-y-4 animate-in fade-in zoom-in-95 duration-200 text-left">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <strong className="text-stone-900 text-sm font-black font-display uppercase tracking-tight">
                {editingUser ? `Edit Authorized User: ${editingUser.name}` : 'Add Pre-Approved Management User'}
              </strong>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setEditingUser(null);
                }}
                className="text-stone-400 hover:text-stone-600"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={editingUser ? handleSaveUserEdit : handleCreateUser} className="space-y-4 text-xs font-sans">
              <div>
                <label className="block text-[10px] font-bold text-stone-600 tracking-wider uppercase mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Yogesh or Suresh"
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 focus:outline-none focus:border-[#593622] rounded-xl font-semibold"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-stone-600 tracking-wider uppercase mb-1">
                  Google / Workspace Email Address *
                </label>
                <input
                  type="email"
                  required
                  value={userEmail}
                  onChange={(e) => setUserEmail(e.target.value)}
                  placeholder="e.g. yogesh@gmail.com"
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 focus:outline-none focus:border-[#593622] rounded-xl font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-stone-600 tracking-wider uppercase mb-1">
                    Role *
                  </label>
                  <select
                    value={userRole}
                    onChange={(e) => setUserRole(e.target.value as UserRole)}
                    className="w-full p-2 bg-stone-50 border border-stone-200 focus:outline-none rounded-xl font-bold text-stone-700"
                  >
                    <option value="manager">Manager</option>
                    <option value="admin">Administrator</option>
                    <option value="wood_tab_manager">Wood Tab Manager</option>
                    <option value="carpenter">Carpenter</option>
                    <option value="polish_person">Polish Person</option>
                    <option value="qc_staff">QC Staff</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-stone-600 tracking-wider uppercase mb-1">
                    Initials (2 chars) *
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={2}
                    value={initials}
                    onChange={(e) => setInitials(e.target.value)}
                    placeholder="YG"
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 focus:outline-none focus:border-[#593622] rounded-xl font-black font-mono tracking-widest text-center"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-stone-600 tracking-wider uppercase mb-1">
                    Account Status *
                  </label>
                  <select
                    value={userStatus}
                    onChange={(e) => setUserStatus(e.target.value as UserStatus)}
                    className="w-full p-2 bg-stone-50 border border-stone-200 focus:outline-none rounded-xl font-bold text-stone-700"
                  >
                    <option value="ACTIVE">ACTIVE (Authorized)</option>
                    <option value="INACTIVE">INACTIVE (Revoked)</option>
                    <option value="SUSPENDED">SUSPENDED</option>
                    <option value="LOCKED">LOCKED</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-stone-600 tracking-wider uppercase mb-1">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="9876543210"
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 focus:outline-none focus:border-[#593622] rounded-xl font-semibold"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2 select-none border-t border-stone-100">
                <input
                  type="checkbox"
                  id="modal-google-linked"
                  checked={isGoogleLinked}
                  onChange={(e) => setIsGoogleLinked(e.target.checked)}
                  className="h-4 w-4 text-amber-600 rounded border-stone-300 focus:ring-amber-500 cursor-pointer"
                />
                <label htmlFor="modal-google-linked" className="font-semibold text-stone-700 cursor-pointer text-xs">
                  Authorize Google Sign-In Single Sign-On for this email
                </label>
              </div>

              <div className="flex gap-2 justify-end pt-3 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setEditingUser(null);
                  }}
                  className="px-4 py-2 rounded-xl border text-stone-600 font-bold hover:bg-stone-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-[#593622] hover:bg-[#402414] text-white font-bold px-4 py-2 rounded-xl shadow-sm cursor-pointer"
                >
                  {editingUser ? 'Save Changes' : 'Add Pre-Approved User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
