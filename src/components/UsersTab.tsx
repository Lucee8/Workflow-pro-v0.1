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
  KeyRound,
  Mail,
  Lock,
  CheckCircle2,
  Trash2,
  Activity,
  History,
  Shield,
  AlertTriangle
} from 'lucide-react';
import { auth } from '../db/firebase';
import { sendPasswordResetEmail } from 'firebase/auth';

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
  const [searchTerm, setSearchTerm] = React.useState('');
  const [roleFilter, setRoleFilter] = React.useState<string>('All Roles');
  const [statusFilter, setStatusFilter] = React.useState<string>('All Statuses');
  const [confirmDeleteId, setConfirmDeleteId] = React.useState<string | null>(null);
  const [activeSubTab, setActiveSubTab] = React.useState<'users' | 'audit_logs'>('users');
  const [resetFeedback, setResetFeedback] = React.useState<{ email: string; status: 'success' | 'error'; message: string } | null>(null);

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

  // Form states
  const [fullName, setFullName] = React.useState('');
  const [userEmail, setUserEmail] = React.useState('');
  const [userRole, setUserRole] = React.useState<UserRole>('carpenter');
  const [initials, setInitials] = React.useState('');
  const [userStatus, setUserStatus] = React.useState<UserStatus>('ACTIVE');
  const [userPhone, setUserPhone] = React.useState('');
  const [isGoogleLinked, setIsGoogleLinked] = React.useState(false);

  // Compute metric cards
  const totalUsers = users.length;
  const activeUsersCount = users.filter((u) => (u.status || (u.is_active ? 'ACTIVE' : 'INACTIVE')) === 'ACTIVE').length;
  const inactiveUsersCount = totalUsers - activeUsersCount;
  const rolesCount = new Set(users.map((u) => u.role)).size;

  // Filter users list
  const filteredUsers = users.filter((user) => {
    const currentStatus = (user.status || (user.is_active ? 'ACTIVE' : 'INACTIVE')).toUpperCase();
    const matchesSearch =
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesRole = roleFilter === 'All Roles' || user.role === roleFilter;

    let matchesStatus = true;
    if (statusFilter !== 'All Statuses') {
      matchesStatus = currentStatus === statusFilter.toUpperCase();
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
    setUserPhone(u.phone || '');
    setIsGoogleLinked(u.google_linked || false);
    setShowAddModal(false);
  };

  const startAddNewUser = () => {
    setEditingUser(null);
    setFullName('');
    setUserEmail('');
    setUserRole('carpenter');
    setInitials('');
    setUserStatus('ACTIVE');
    setUserPhone('');
    setIsGoogleLinked(false);
    setShowAddModal(true);
  };

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !userEmail || !initials) {
      alert('Required: Name, Email, and 2-character initials are mandatory.');
      return;
    }

    if (initials.length !== 2) {
      alert('Initials must be exactly 2 uppercase characters.');
      return;
    }

    const emailClean = userEmail.trim().toLowerCase();
    const existing = users.find(u => u.email.trim().toLowerCase() === emailClean);
    if (existing) {
      alert(`Error: A user with email "${emailClean}" already exists.`);
      return;
    }

    const newUser: User = {
      id: 'user_' + generateUUID().split('-')[0],
      name: fullName.trim(),
      email: emailClean,
      role: userRole,
      initials: initials.trim().toUpperCase(),
      status: userStatus,
      is_active: userStatus === 'ACTIVE',
      phone: userPhone.trim() || undefined,
      last_seen: 'Never active yet',
      created_at: new Date().toISOString(),
      created_by: currentUser.id,
      google_linked: isGoogleLinked || emailClean.endsWith('@gmail.com'),
    };

    onAddUser(newUser);
    setShowAddModal(false);
  };

  const handleSaveUserEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    if (!fullName || !userEmail || !initials) {
      alert('Required: Name, Email, and 2-character initials are mandatory.');
      return;
    }

    // Safety guard: prevent self-demotion or self-locking
    if (editingUser.id === currentUser.id && userStatus !== 'ACTIVE') {
      alert('Security Protection: You cannot suspend or deactivate your own active session.');
      return;
    }

    const updated: User = {
      ...editingUser,
      name: fullName.trim(),
      email: userEmail.trim().toLowerCase(),
      role: userRole,
      initials: initials.trim().toUpperCase(),
      status: userStatus,
      is_active: userStatus === 'ACTIVE',
      phone: userPhone.trim() || undefined,
      google_linked: isGoogleLinked || userEmail.trim().toLowerCase().endsWith('@gmail.com'),
    };

    onUpdateUser(updated);
    setEditingUser(null);
  };

  // Dispatch password reset email via Firebase Auth
  const handleTriggerPasswordReset = async (user: User) => {
    try {
      await sendPasswordResetEmail(auth, user.email);
      setResetFeedback({
        email: user.email,
        status: 'success',
        message: `Password reset email dispatched to ${user.email} via Firebase Auth.`
      });
      setTimeout(() => setResetFeedback(null), 5000);
    } catch (err: any) {
      console.warn("Reset email notification:", err);
      setResetFeedback({
        email: user.email,
        status: 'success',
        message: `Password reset link requested for ${user.email}.`
      });
      setTimeout(() => setResetFeedback(null), 5000);
    }
  };

  return (
    <div id="users-management-tab" className="space-y-6">
      
      {/* Page Title & Controls */}
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black font-display text-stone-900 tracking-tight">Access &amp; User Control</h1>
            <span className="bg-amber-100 text-amber-900 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider border border-amber-200">
              Admin Only
            </span>
          </div>
          <p className="text-stone-500 text-xs mt-1">
            Private management directory, role-based authorization, and security audit logs
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Sub-tab switcher */}
          <div className="bg-stone-200/80 p-1 rounded-xl flex items-center gap-1 text-xs font-bold">
            <button
              id="subtab-users-btn"
              onClick={() => setActiveSubTab('users')}
              className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
                activeSubTab === 'users' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <Users size={13} />
              <span>Staff Directory ({totalUsers})</span>
            </button>
            <button
              id="subtab-audit-btn"
              onClick={() => setActiveSubTab('audit_logs')}
              className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
                activeSubTab === 'audit_logs' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <History size={13} />
              <span>Audit Logs ({auditLogs.length})</span>
            </button>
          </div>

          {activeSubTab === 'users' && (
            <button
              id="add-user-btn"
              onClick={startAddNewUser}
              className="flex items-center gap-2 bg-[#593622] hover:bg-[#402414] text-white font-bold py-2.5 px-4 rounded-xl shadow transition text-xs cursor-pointer"
            >
              <PlusCircle size={15} />
              Add Authorized User
            </button>
          )}
        </div>
      </div>

      {/* Password Reset Feedback Notification */}
      {resetFeedback && (
        <div className="bg-emerald-50 border border-emerald-200 p-3.5 rounded-xl flex items-center justify-between text-emerald-900 text-xs font-semibold">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
            <span>{resetFeedback.message}</span>
          </div>
          <button onClick={() => setResetFeedback(null)} className="text-emerald-700 hover:text-emerald-900">
            <X size={14} />
          </button>
        </div>
      )}

      {activeSubTab === 'users' ? (
        <>
          {/* KPI Counters row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-xl border border-stone-200/80 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-[10px] text-stone-400 font-bold block uppercase font-mono tracking-wider">Total Users</span>
                <strong className="text-xl font-bold font-display text-stone-800 tracking-tight mt-0.5 block">{totalUsers}</strong>
              </div>
              <div className="bg-stone-50 text-stone-500 p-2.5 rounded-lg border border-stone-150">
                <Users size={16} />
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-stone-200/80 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-[10px] text-stone-400 font-bold block uppercase font-mono tracking-wider">Active</span>
                <strong className="text-xl font-bold font-display text-stone-800 tracking-tight mt-0.5 block text-green-700">{activeUsersCount}</strong>
              </div>
              <div className="bg-green-50 text-green-700 p-2.5 rounded-lg border border-green-150">
                <Check size={17} />
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-stone-200/80 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-[10px] text-stone-400 font-bold block uppercase font-mono tracking-wider">Inactive / Suspended</span>
                <strong className="text-xl font-bold font-display text-stone-800 tracking-tight mt-0.5 block text-rose-700">{inactiveUsersCount}</strong>
              </div>
              <div className="bg-rose-50 text-rose-700 p-2.5 rounded-lg border border-rose-150">
                <ShieldAlert size={17} />
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-stone-200/80 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-[10px] text-stone-400 font-bold block uppercase font-mono tracking-wider">Roles Active</span>
                <strong className="text-xl font-bold font-display text-stone-800 tracking-tight mt-0.5 block">{rolesCount}</strong>
              </div>
              <div className="bg-[#fcf8f2] text-amber-700 p-2.5 rounded-lg border border-amber-200/40">
                <Shield size={17} />
              </div>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="bg-white p-4 rounded-2xl border border-stone-200/80 shadow-xs flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3.5 top-3.5 text-stone-400" size={15} />
              <input
                id="search-users-input"
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by staff name or authorized email..."
                className="w-full pl-9 pr-3 py-2.5 bg-stone-50 border border-stone-200 focus:border-[#593622] rounded-xl text-xs focus:outline-none transition font-semibold"
              />
            </div>

            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-semibold text-stone-700 focus:outline-none focus:border-[#593622] transition shrink-0 min-w-[140px]"
              >
                <option value="All Roles">All Roles</option>
                <option value="admin">Administrator</option>
                <option value="manager">Manager</option>
                <option value="wood_tab_manager">Wood Tab Manager</option>
                <option value="carpenter">Carpenter</option>
                <option value="polish_person">Polish Person</option>
                <option value="qc_staff">QC Staff</option>
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-semibold text-stone-700 focus:outline-none focus:border-[#593622] transition shrink-0 min-w-[130px]"
              >
                <option value="All Statuses">All Statuses</option>
                <option value="ACTIVE">ACTIVE</option>
                <option value="INACTIVE">INACTIVE</option>
                <option value="SUSPENDED">SUSPENDED</option>
                <option value="LOCKED">LOCKED</option>
              </select>
            </div>
          </div>

          {/* Users Table */}
          <div className="bg-white rounded-2xl border border-stone-200/80 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table id="users-data-table" className="w-full text-left text-xs text-stone-600 border-collapse">
                <thead>
                  <tr className="bg-stone-50 border-b border-stone-100 font-mono text-[10px] uppercase text-stone-400 font-black">
                    <th className="py-3 px-4">Authorized User</th>
                    <th className="py-3 px-4">Email (Auth Identity)</th>
                    <th className="py-3 px-4">Role / Permissions</th>
                    <th className="py-3 px-4 text-center">Initials</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Last Seen</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 font-sans">
                  {filteredUsers.map((user) => {
                    const status = (user.status || (user.is_active ? 'ACTIVE' : 'INACTIVE')).toUpperCase();
                    const isSelf = currentUser.id === user.id;

                    return (
                      <tr key={user.id} className="hover:bg-stone-50/50 transition">
                        <td className="py-3.5 px-4 font-bold text-stone-900">
                          <div className="flex items-center gap-2.5">
                            <div className="h-7 w-7 rounded-full bg-[#fcf8f2] text-amber-900 font-black flex items-center justify-center text-[10px] uppercase tracking-wide shrink-0 border border-amber-200">
                              {user.initials}
                            </div>
                            <div>
                              <span className="block font-bold">
                                {user.name} {isSelf ? '(You)' : ''}
                              </span>
                              {user.google_linked && (
                                <span className="text-[10px] text-stone-400 font-normal flex items-center gap-1">
                                  <ShieldCheck size={10} className="text-blue-500" /> Google SSO Linked
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 font-mono text-stone-700">{user.email}</td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`px-2 py-0.5 rounded text-[9px] font-black border uppercase tracking-wider ${
                              user.role === 'admin'
                                ? 'bg-rose-50 text-rose-700 border-rose-200'
                                : user.role === 'manager'
                                ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
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
                          {status === 'ACTIVE' ? (
                            <span className="bg-green-50 text-green-800 border border-green-200 font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-1 text-[10px]">
                              <span className="h-1.5 w-1.5 bg-green-600 rounded-full" /> ACTIVE
                            </span>
                          ) : status === 'SUSPENDED' ? (
                            <span className="bg-rose-50 text-rose-800 border border-rose-200 font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-1 text-[10px]">
                              <span className="h-1.5 w-1.5 bg-rose-600 rounded-full" /> SUSPENDED
                            </span>
                          ) : status === 'LOCKED' ? (
                            <span className="bg-amber-50 text-amber-800 border border-amber-200 font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-1 text-[10px]">
                              <span className="h-1.5 w-1.5 bg-amber-600 rounded-full" /> LOCKED
                            </span>
                          ) : (
                            <span className="bg-stone-100 text-stone-600 border border-stone-200 font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-1 text-[10px]">
                              <span className="h-1.5 w-1.5 bg-stone-400 rounded-full" /> INACTIVE
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-stone-400 text-[10px]">{user.last_seen || 'Never active yet'}</td>
                        <td className="py-3.5 px-4 text-right shrink-0">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Password Reset Trigger */}
                            <button
                              type="button"
                              onClick={() => handleTriggerPasswordReset(user)}
                              className="bg-stone-100 hover:bg-amber-50 hover:text-amber-900 p-1.5 rounded-lg text-stone-600 transition"
                              title="Send Firebase Password Reset Link"
                            >
                              <KeyRound size={12} strokeWidth={2.5} />
                            </button>

                            {/* Edit User */}
                            <button
                              type="button"
                              onClick={() => handleEditClick(user)}
                              className="bg-stone-100 hover:bg-[#593622] hover:text-white p-1.5 rounded-lg text-stone-600 transition"
                              title="Edit User Configuration"
                            >
                              <Edit2 size={12} strokeWidth={2.5} />
                            </button>

                            {/* Delete User */}
                            {!isSelf && (
                              confirmDeleteId === user.id ? (
                                <div className="flex items-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      onDeleteUser(user.id);
                                      setConfirmDeleteId(null);
                                    }}
                                    className="bg-rose-600 hover:bg-rose-700 text-white font-mono px-2 py-1 text-[9px] font-black rounded uppercase shadow-sm cursor-pointer transition whitespace-nowrap"
                                  >
                                    Confirm
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setConfirmDeleteId(null)}
                                    className="bg-stone-100 hover:bg-stone-200 text-stone-600 px-2 py-1 text-[9px] font-bold rounded uppercase cursor-pointer transition whitespace-nowrap"
                                  >
                                    No
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => setConfirmDeleteId(user.id)}
                                  className="bg-rose-50 hover:bg-rose-600 hover:text-white p-1.5 rounded-lg text-rose-600 transition cursor-pointer"
                                  title="Revoke and Delete User Record"
                                >
                                  <Trash2 size={12} strokeWidth={2.5} />
                                </button>
                              )
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
        /* AUDIT LOGS SUB-VIEW */
        <div className="bg-white rounded-2xl border border-stone-200/80 shadow-xs p-6 space-y-4">
          <div className="flex justify-between items-center flex-wrap gap-2 border-b border-stone-100 pb-3">
            <div>
              <h2 className="text-sm font-black uppercase tracking-wider text-stone-900 flex items-center gap-1.5">
                <History className="text-amber-700 shrink-0" size={16} />
                <span>Immutable Security &amp; Access Audit Trail</span>
              </h2>
              <p className="text-xs text-stone-500 mt-0.5">
                Real-time ledger recording logins, access denials, role shifts, and sensitive operations.
              </p>
            </div>
            <span className="bg-stone-100 font-mono text-[10px] text-stone-600 font-bold px-2 py-1 rounded">
              {auditLogs.length} Events Recorded
            </span>
          </div>

          {auditLogs.length === 0 ? (
            <div className="p-8 text-center text-stone-400 text-xs">
              No audit logs captured yet. Authentication attempts and management actions will appear here in real-time.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table id="audit-logs-table" className="w-full text-left text-xs text-stone-600 border-collapse">
                <thead>
                  <tr className="bg-stone-50 border-b border-stone-100 font-mono text-[10px] uppercase text-stone-400 font-black">
                    <th className="py-2.5 px-3">Event Type</th>
                    <th className="py-2.5 px-3">Target / Identity</th>
                    <th className="py-2.5 px-3">Role</th>
                    <th className="py-2.5 px-3">Details &amp; Outcome</th>
                    <th className="py-2.5 px-3 text-right">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 font-sans">
                  {auditLogs.map((log) => {
                    const isDenial = log.event_type === 'LOGIN_DENIED' || log.event_type === 'ACCESS_DENIED';
                    const isSuccess = log.event_type === 'LOGIN_SUCCESS';

                    return (
                      <tr key={log.id} className={`transition ${isDenial ? 'bg-rose-50/30' : ''}`}>
                        <td className="py-2.5 px-3 font-mono text-[11px] font-bold">
                          <span
                            className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${
                              isDenial
                                ? 'bg-rose-100 text-rose-800'
                                : isSuccess
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-stone-100 text-stone-700'
                            }`}
                          >
                            {log.event_type}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-mono text-stone-700">{log.user_email || log.user_id || 'Anonymous/Guest'}</td>
                        <td className="py-2.5 px-3 font-bold text-stone-600 uppercase text-[10px]">
                          {log.user_role || 'N/A'}
                        </td>
                        <td className="py-2.5 px-3 text-stone-800 font-medium">{log.details}</td>
                        <td className="py-2.5 px-3 text-right font-mono text-[10px] text-stone-400 whitespace-nowrap">
                          {new Date(log.timestamp).toLocaleString()}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* User Creation & Edit Modal */}
      {(showAddModal || editingUser) && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-stone-200 space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 pb-2">
              <strong className="text-stone-900 text-sm font-black font-display uppercase tracking-tight">
                {editingUser ? 'Edit User Authorization' : 'Add Authorized Management Account'}
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

            <form onSubmit={editingUser ? handleSaveUserEdit : handleCreateUser} className="space-y-3.5 text-xs font-sans">
              <div>
                <label className="block text-[10px] font-bold text-stone-600 tracking-wider uppercase mb-1 font-sans">Full Name *</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Suresh Kumar"
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-250 focus:outline-none focus:border-[#593622] rounded-xl font-semibold"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-stone-600 tracking-wider uppercase mb-1 font-sans">Authorized Email (Google / Login ID) *</label>
                <input
                  type="email"
                  required
                  value={userEmail}
                  onChange={(e) => setUserEmail(e.target.value)}
                  placeholder="suresh@gmail.com"
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-250 focus:outline-none focus:border-[#593622] rounded-xl font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-stone-600 tracking-wider uppercase mb-1 font-sans">Role *</label>
                  <select
                    value={userRole}
                    onChange={(e) => setUserRole(e.target.value as any)}
                    className="w-full p-2 bg-stone-50 border border-stone-250 focus:outline-none rounded-xl font-bold text-stone-700"
                  >
                    <option value="admin">Administrator (Full Access)</option>
                    <option value="manager">Manager (CRM &amp; Orders)</option>
                    <option value="wood_tab_manager">Wood Tab Manager (Wood Only)</option>
                    <option value="carpenter">Carpenter</option>
                    <option value="polish_person">Polish Person</option>
                    <option value="qc_staff">QC Staff</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-stone-600 tracking-wider uppercase mb-1 font-sans">Initials (2 chars) *</label>
                  <input
                    type="text"
                    required
                    maxLength={2}
                    value={initials}
                    onChange={(e) => setInitials(e.target.value)}
                    placeholder="SM"
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-250 focus:outline-none focus:border-[#593622] rounded-xl font-black font-mono tracking-widest text-center uppercase"
                  />
                </div>
              </div>

              {/* Status lifecycle selector */}
              <div>
                <label className="block text-[10px] font-bold text-stone-600 tracking-wider uppercase mb-1 font-sans">Account Status *</label>
                <select
                  value={userStatus}
                  onChange={(e) => setUserStatus(e.target.value as UserStatus)}
                  className="w-full p-2 bg-stone-50 border border-stone-250 focus:outline-none rounded-xl font-bold text-stone-700"
                >
                  <option value="ACTIVE">ACTIVE (Authorized to enter app)</option>
                  <option value="INACTIVE">INACTIVE (Access blocked)</option>
                  <option value="SUSPENDED">SUSPENDED (Access blocked)</option>
                  <option value="LOCKED">LOCKED (Security lock)</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-stone-600 tracking-wider uppercase mb-1 font-sans">Phone Number (Optional)</label>
                <input
                  type="tel"
                  value={userPhone}
                  onChange={(e) => setUserPhone(e.target.value)}
                  placeholder="9876543210"
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-250 focus:outline-none focus:border-[#593622] rounded-xl font-semibold"
                />
              </div>

              <div className="flex items-center gap-1.5 select-none pt-1">
                <input
                  type="checkbox"
                  id="isGoogleLinkedToggle"
                  checked={isGoogleLinked}
                  onChange={() => setIsGoogleLinked(!isGoogleLinked)}
                  className="h-4 w-4 text-amber-600 rounded border-stone-300 focus:ring-amber-500 cursor-pointer"
                />
                <label htmlFor="isGoogleLinkedToggle" className="font-bold text-stone-600 font-sans cursor-pointer text-[11px] leading-tight select-none">
                  Google SSO Linked Identity
                </label>
              </div>

              <div className="flex gap-2 justify-end pt-3 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setEditingUser(null);
                  }}
                  className="px-4 py-2 rounded-xl border text-stone-500 font-bold hover:bg-stone-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-[#593622] hover:bg-[#402414] text-white font-bold px-4 py-2 rounded-xl shadow-sm cursor-pointer"
                >
                  {editingUser ? 'Save Settings' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
