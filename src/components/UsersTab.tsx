/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { User, UserRole } from '../types';
import { generateUUID } from '../db/store';
import { 
  Users, 
  Filter, 
  PlusCircle, 
  Search, 
  Edit2, 
  ShieldAlert, 
  Power, 
  Check, 
  X,
  ShieldCheck,
  Key,
  Mail,
  Lock,
  Compass,
  CheckCircle2,
  Trash2
} from 'lucide-react';

interface UsersTabProps {
  users: User[];
  onAddUser: (user: User) => void;
  onUpdateUser: (updatedUser: User) => void;
  onDeleteUser: (userId: string) => void;
  currentUser: User;
}

export default function UsersTab({ users, onAddUser, onUpdateUser, onDeleteUser, currentUser }: UsersTabProps) {
  const [searchTerm, setSearchTerm] = React.useState('');
  const [roleFilter, setRoleFilter] = React.useState<string>('All Roles');
  const [statusFilter, setStatusFilter] = React.useState<string>('All Statuses');
  const [confirmDeleteId, setConfirmDeleteId] = React.useState<string | null>(null);

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
  const [isActive, setIsActive] = React.useState(true);
  const [userPassword, setUserPassword] = React.useState('admin');
  const [isGoogleLinked, setIsGoogleLinked] = React.useState(false);

  // Compute metric cards
  const totalUsers = users.length;
  const activeUsersCount = users.filter((u) => u.is_active).length;
  const inactiveUsersCount = users.filter((u) => !u.is_active).length;
  const rolesCount = 3; // admin, carpenter, polish_person

  // Filter lists
  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesRole = roleFilter === 'All Roles' || user.role === roleFilter.toLowerCase().replace(' ', '_');

    let matchesStatus = true;
    if (statusFilter !== 'All Statuses') {
      if (statusFilter === 'Active') matchesStatus = user.is_active;
      else if (statusFilter === 'Inactive') matchesStatus = !user.is_active;
    }

    return matchesSearch && matchesRole && matchesStatus;
  });

  const handleEditClick = (u: User) => {
    setEditingUser(u);
    setFullName(u.name);
    setUserEmail(u.email);
    setUserRole(u.role);
    setInitials(u.initials);
    setIsActive(u.is_active);
    setUserPassword(u.password || 'admin');
    setIsGoogleLinked(u.google_linked || false);
    setShowAddModal(false);
  };

  const startAddNewUser = () => {
    setEditingUser(null);
    setFullName('');
    setUserEmail('');
    setUserRole('carpenter');
    setInitials('');
    setIsActive(true);
    setUserPassword('admin');
    setIsGoogleLinked(false);
    setShowAddModal(true);
  };

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !userEmail || !initials) {
      alert('Required: Name, Email and 2-Character initials are mandatory.');
      return;
    }

    if (initials.length !== 2) {
      alert('Initials must be exactly 2-characters in length (uppercase).');
      return;
    }

    const newUser: User = {
      id: 'user_' + generateUUID().split('-')[0],
      name: fullName,
      email: userEmail.trim().toLowerCase(),
      role: userRole,
      initials: initials.trim().toUpperCase(),
      is_active: true,
      last_seen: 'Never active yet',
      created_at: new Date().toISOString(),
      created_by: currentUser.id,
      password: userPassword.trim() || 'admin',
      google_linked: isGoogleLinked || userEmail.trim().toLowerCase().endsWith('@gmail.com'),
    };

    onAddUser(newUser);
    setShowAddModal(false);
    alert(`Success: User account created for "${fullName}". Initials configured: ${initials.toUpperCase()}`);
  };

  const handleSaveUserEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    if (!fullName || !userEmail || !initials) {
      alert('Required: Name, Email and 2-Character initials are mandatory.');
      return;
    }

    const updated: User = {
      ...editingUser,
      name: fullName,
      email: userEmail.trim().toLowerCase(),
      role: userRole,
      initials: initials.trim().toUpperCase(),
      is_active: isActive,
      password: userPassword.trim() || 'admin',
      google_linked: isGoogleLinked || userEmail.trim().toLowerCase().endsWith('@gmail.com'),
    };

    onUpdateUser(updated);
    setEditingUser(null);
    alert(`Success: Profile settings saved for ${fullName}.`);
  };

  return (
    <div className="space-y-6">
      {/* Page Title header */}
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-black font-display text-stone-900 tracking-tight">Users Management</h1>
          <p className="text-stone-500 text-xs mt-1">Manage workshop staff directory, account active levels and role authorizations</p>
        </div>
        <button
          onClick={startAddNewUser}
          className="flex items-center gap-2 bg-[#593622] hover:bg-[#402414] text-white font-bold py-2.5 px-4 rounded-xl shadow transition text-xs"
        >
          <PlusCircle size={15} />
          Add New User
        </button>
      </div>

      {/* KPI Counters row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4" style={{ contentVisibility: 'auto' }}>
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
            <span className="text-[10px] text-stone-400 font-bold block uppercase font-mono tracking-wider">Active Users</span>
            <strong className="text-xl font-bold font-display text-stone-800 tracking-tight mt-0.5 block text-green-700">{activeUsersCount}</strong>
          </div>
          <div className="bg-green-50 text-green-700 p-2.5 rounded-lg border border-green-150">
            <Users size={17} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-stone-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] text-stone-400 font-bold block uppercase font-mono tracking-wider">Inactive Users</span>
            <strong className="text-xl font-bold font-display text-stone-800 tracking-tight mt-0.5 block text-rose-700">{inactiveUsersCount}</strong>
          </div>
          <div className="bg-rose-50 text-rose-700 p-2.5 rounded-lg border border-rose-150">
            <Users size={17} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-stone-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] text-stone-400 font-bold block uppercase font-mono tracking-wider">Roles Active</span>
            <strong className="text-xl font-bold font-display text-stone-800 tracking-tight mt-0.5 block">{rolesCount}</strong>
          </div>
          <div className="bg-[#fcf8f2] text-amber-700 p-2.5 rounded-lg border border-amber-200/40">
            <Users size={17} />
          </div>
        </div>
      </div>

      {/* Filter Options bar */}
      <div className="bg-white p-4 rounded-2xl border border-stone-200/80 shadow-xs flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3.5 top-3.5 text-stone-400" size={15} />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by name, email, or role badge..."
            className="w-full pl-9 pr-3 py-2.5 bg-stone-50 border border-stone-200 focus:border-[#593622] rounded-xl text-xs focus:outline-none transition font-semibold"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-semibold text-stone-700 focus:outline-none focus:border-[#593622] transition shrink-0 min-w-[125px]"
          >
            <option>All Roles</option>
            <option>Admin</option>
            <option>Carpenter</option>
            <option>Polish Person</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-semibold text-stone-700 focus:outline-none focus:border-[#593622] transition shrink-0 min-w-[125px]"
          >
            <option>All Statuses</option>
            <option>Active</option>
            <option>Inactive</option>
          </select>

          <button onClick={() => alert('Search filters reset.')} className="px-3 py-2.5 border border-stone-250 text-stone-600 hover:text-stone-900 rounded-xl text-xs font-bold transition flex items-center gap-1 shrink-0">
            <Filter size={12} /> Filter
          </button>
        </div>
      </div>

      {/* Users table registry */}
      <div className="bg-white rounded-2xl border border-stone-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-stone-600 border-collapse" style={{ contentVisibility: 'auto' }}>
            <thead>
              <tr className="bg-stone-50 border-b border-stone-100 font-mono text-[10px] uppercase text-stone-400 font-black">
                <th className="py-3 px-4">Name</th>
                <th className="py-3 px-4">Email Address</th>
                <th className="py-3 px-4">Role Designation</th>
                <th className="py-3 px-4 text-center">Serials Initials</th>
                <th className="py-3 px-4 text-center">Password / Passcode</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Last Seen</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 font-sans">
              {filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-stone-50/50 transition">
                  <td className="py-3.5 px-4 font-bold text-stone-900">
                    <div className="flex items-center gap-2.5">
                      <div className="h-6 w-6 rounded-full bg-[#fcf8f2] text-amber-900 font-black flex items-center justify-center text-[10px] uppercase tracking-wide shrink-0 border border-amber-200">
                        {user.initials}
                      </div>
                      <span>
                        {user.name} {currentUser.id === user.id ? '(You)' : ''}
                      </span>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 font-medium text-stone-550">{user.email}</td>
                  <td className="py-3.5 px-4">
                    <span
                      className={`px-2 py-0.5 rounded text-[9px] font-black border uppercase tracking-wider ${
                        user.role === 'admin'
                          ? 'bg-rose-50 text-rose-700 border-rose-200'
                          : user.role === 'carpenter'
                          ? 'bg-amber-50 text-amber-800 border-amber-250'
                          : 'bg-teal-50 text-teal-800 border-teal-200'
                      }`}
                    >
                      {user.role.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 font-mono font-bold text-stone-800 text-center">{user.initials}</td>
                  <td className="py-3.5 px-4 text-center">
                    <span className="bg-amber-50/60 font-mono text-amber-900 px-2 py-1 rounded font-bold text-[11px] select-all border border-amber-200/45 shadow-3xs hover:border-[#593622] transition">
                      {user.password || 'admin'}
                    </span>
                  </td>
                  <td className="py-3.5 px-4">
                    {user.is_active ? (
                      <span className="text-green-700 font-bold inline-flex items-center gap-1 text-[11px]">
                        <span className="h-1.5 w-1.5 bg-green-600 rounded-full" /> Active
                      </span>
                    ) : (
                      <span className="text-stone-400 font-bold inline-flex items-center gap-1 text-[11px]">
                        <span className="h-1.5 w-1.5 bg-stone-300 rounded-full" /> Inactive
                      </span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 font-mono text-stone-400 text-[10px]">{user.last_seen || 'Not logged recently'}</td>
                  <td className="py-3.5 px-4 text-right shrink-0">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => handleEditClick(user)}
                        className="bg-stone-100 hover:bg-[#593622] hover:text-white p-1.5 rounded-lg text-stone-600 transition"
                        title="Edit Profile specifications"
                      >
                        <Edit2 size={12} strokeWidth={2.5} />
                      </button>

                      {confirmDeleteId === user.id ? (
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => {
                              onDeleteUser(user.id);
                              setConfirmDeleteId(null);
                            }}
                            className="bg-rose-600 hover:bg-rose-700 text-white font-mono px-2 py-1 text-[9px] font-black rounded uppercase shadow-sm cursor-pointer transition whitespace-nowrap"
                            title="Confirm delete account credentials"
                          >
                            Delete
                          </button>
                          <button
                            onClick={() => setConfirmDeleteId(null)}
                            className="bg-stone-100 hover:bg-stone-200 text-stone-600 px-2 py-1 text-[9px] font-bold rounded uppercase cursor-pointer transition whitespace-nowrap"
                          >
                            No
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmDeleteId(user.id)}
                          className="bg-rose-50 hover:bg-rose-600 hover:text-white p-1.5 rounded-lg text-rose-600 transition cursor-pointer"
                          title="Delete User Credentials"
                        >
                          <Trash2 size={12} strokeWidth={2.5} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Users Creation and Edits Modular Dialog */}
      {(showAddModal || editingUser) && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-stone-200 space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-stone-100 pb-2">
              <strong className="text-stone-900 text-sm font-black font-display uppercase tracking-tight">
                {editingUser ? 'Edit User Credentials' : 'Add New Workshop User Account'}
              </strong>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setEditingUser(null);
                }}
                className="text-stone-400 hover:text-stone-600"
              >
                <X size={15} />
              </button>
            </div>

            <form onSubmit={editingUser ? handleSaveUserEdit : handleCreateUser} className="space-y-4 text-xs font-sans">
              <div>
                <label className="block text-[10px] font-bold text-stone-600 tracking-wider uppercase mb-1.5 font-sans">Full Name *</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Bhavesh Patel"
                  className="w-full px-3 py-2.5 bg-stone-50 border border-stone-250 focus:outline-none focus:border-[#593622] rounded-xl font-semibold"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-stone-600 tracking-wider uppercase mb-1.5 font-sans">Email Address (Google Account email) *</label>
                <input
                  type="email"
                  required
                  value={userEmail}
                  onChange={(e) => setUserEmail(e.target.value)}
                  placeholder="bhavesh@bhisesworkshop.com"
                  className="w-full px-3 py-2.5 bg-stone-50 border border-stone-250 focus:outline-none focus:border-[#593622] rounded-xl font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-stone-600 tracking-wider uppercase mb-1.5 font-sans">Role *</label>
                  <select
                    value={userRole}
                    onChange={(e) => setUserRole(e.target.value as any)}
                    className="w-full p-2.5 bg-stone-50 border border-stone-250 focus:outline-none rounded-xl font-bold text-stone-700"
                  >
                    <option value="admin">Administrator</option>
                    <option value="carpenter">Carpenter</option>
                    <option value="polish_person">Polish Person</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-stone-600 tracking-wider uppercase mb-1.5 font-sans">Initials (2 chars) *</label>
                  <input
                    type="text"
                    required
                    maxLength={2}
                    value={initials}
                    onChange={(e) => setInitials(e.target.value)}
                    placeholder="BH"
                    className="w-full px-3 py-2.5 bg-stone-50 border border-stone-250 focus:outline-none focus:border-[#593622] rounded-xl font-black font-mono tracking-widest text-center"
                  />
                </div>
              </div>

              {/* Added Passcode input and Google-link checkbox fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 border-t border-stone-100 pt-3">
                <div>
                  <label className="block text-[10px] font-bold text-stone-600 tracking-wider uppercase mb-1 font-sans">Workshop Passcode / Pass *</label>
                  <input
                    type="text"
                    required
                    value={userPassword}
                    onChange={(e) => setUserPassword(e.target.value)}
                    placeholder="e.g. carpenter123"
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-250 focus:outline-none focus:border-[#593622] rounded-xl font-semibold"
                  />
                </div>

                <div className="flex items-center gap-1.5 select-none pt-4">
                  <input
                    type="checkbox"
                    id="isGoogleLinkedToggle"
                    checked={isGoogleLinked}
                    onChange={() => setIsGoogleLinked(!isGoogleLinked)}
                    className="h-4 w-4 text-amber-600 rounded border-stone-300 focus:ring-amber-500 cursor-pointer"
                  />
                  <label htmlFor="isGoogleLinkedToggle" className="font-bold text-stone-600 font-sans cursor-pointer text-[11px] leading-tight select-none">
                    Google SSO Linked Account
                  </label>
                </div>
              </div>

              {editingUser && (
                <div className="flex items-center gap-2 select-none border-t border-stone-100 pt-3">
                  <input
                    type="checkbox"
                    id="isActiveToggle"
                    checked={isActive}
                    onChange={() => setIsActive(!isActive)}
                    className="h-4 w-4 text-amber-600 rounded border-stone-300 focus:ring-amber-500"
                  />
                  <label htmlFor="isActiveToggle" className="font-bold text-stone-700 font-sans cursor-pointer text-xs">
                    This account is Active (Unchecking denies login access)
                  </label>
                </div>
              )}

              <div className="flex gap-2 justify-end pt-2">
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
                  className="bg-[#593622] hover:bg-[#402414] text-white font-bold px-4 py-2 rounded-xl shadow-sm"
                >
                  {editingUser ? 'Save Settings' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* NEW SUB-SECTION: ADMIN MANAGES GOOGLE AC OR LOGINS OF CARPENTERS, POLISH PERSONS & WORKERS */}
      <div className="bg-white rounded-2xl border border-stone-200/80 shadow-xs p-6 space-y-6 text-left" style={{ contentVisibility: 'auto' }}>
        <div className="flex justify-between items-center flex-wrap gap-2 border-b border-stone-100 pb-3">
          <div>
            <h3 className="text-sm font-black uppercase tracking-wider text-stone-900 flex items-center gap-1.5">
              <ShieldCheck className="text-green-700 shrink-0" size={16} />
              <span>Google SSO &amp; Artisan Credentials alignment</span>
            </h3>
            <p className="text-[11px] text-stone-500 mt-0.5">Configure authorized Google Mail accounts and specific passcodes for carpenters, polish persons and other workers.</p>
          </div>

          <span className="bg-green-50 text-green-700 font-mono text-[9px] font-black uppercase px-2 py-0.5 rounded border border-green-200">
            Secure Auth Sync
          </span>
        </div>

        {/* Dynamic credential mappings grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          
          {/* Mapped Admin Row */}
          <div className="bg-[#fbfcfa] border border-stone-200 rounded-xl p-4 space-y-3 shadow-3xs hover:border-[#593622] transition">
            <div className="flex justify-between items-start">
              <span className="bg-rose-50 text-rose-700 border border-rose-200/50 px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider">
                Admin Managers
              </span>
              <span className="text-[10px] text-stone-400 font-mono">Mapped: {users.filter(u => u.role === 'admin').length}</span>
            </div>

            <div className="space-y-1 text-xs">
              <div className="flex justify-between text-stone-500">
                <span>Core Login Email:</span>
                <strong className="text-stone-850 truncate max-w-[130px]" title="admin@bhises@gmail.com">admin@bhises@gmail.com</strong>
              </div>
              <div className="flex justify-between text-stone-500">
                <span>Default Passcode:</span>
                <strong className="text-stone-850 font-mono">admin123</strong>
              </div>
              <div className="flex justify-between text-stone-500">
                <span>Google Link Status:</span>
                <span className="text-green-700 font-bold flex items-center gap-0.5 text-[10px]">
                  <CheckCircle2 size={10} /> Enabled
                </span>
              </div>
            </div>

            <button 
              type="button"
              onClick={() => {
                const adminUser = users.find(u => u.email === 'admin@bhises@gmail.com');
                if (adminUser) {
                  handleEditClick(adminUser);
                } else {
                  startAddNewUser();
                  setUserEmail('admin@bhises@gmail.com');
                  setUserRole('admin');
                  setInitials('BA');
                  setUserPassword('admin123');
                  setIsGoogleLinked(true);
                }
              }}
              className="w-full bg-stone-100 hover:bg-stone-200 text-stone-700 py-2 rounded-lg font-bold text-[10px] uppercase tracking-wider text-center transition"
            >
              {users.some(u => u.email === 'admin@bhises@gmail.com') ? 'Edit Admin Identity' : 'Seed Example Identity'}
            </button>
          </div>

          {/* Mapped Carpenters Row */}
          <div className="bg-[#fbfcfa] border border-stone-200 rounded-xl p-4 space-y-3 shadow-3xs hover:border-[#593622] transition">
            <div className="flex justify-between items-start">
              <span className="bg-amber-50 text-amber-800 border border-amber-200/50 px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider">
                artisan carpenters
              </span>
              <span className="text-[10px] text-stone-400 font-mono">Mapped: {users.filter(u => u.role === 'carpenter').length}</span>
            </div>

            <div className="space-y-1 text-xs">
              <div className="flex justify-between text-stone-500">
                <span>Core Login Email:</span>
                <strong className="text-stone-850 truncate max-w-[130px]" title="amit@gmail.com">amit@gmail.com</strong>
              </div>
              <div className="flex justify-between text-stone-500">
                <span>Default Passcode:</span>
                <strong className="text-stone-850 font-mono">carpenter123</strong>
              </div>
              <div className="flex justify-between text-stone-500">
                <span>Google Link Status:</span>
                <span className="text-green-700 font-bold flex items-center gap-0.5 text-[10px]">
                  <CheckCircle2 size={10} /> Enabled
                </span>
              </div>
            </div>

            <button 
              type="button"
              onClick={() => {
                const carpUser = users.find(u => u.email === 'amit@gmail.com');
                if (carpUser) {
                  handleEditClick(carpUser);
                } else {
                  startAddNewUser();
                  setUserEmail('amit@gmail.com');
                  setUserRole('carpenter');
                  setInitials('AK');
                  setUserPassword('carpenter123');
                  setIsGoogleLinked(true);
                }
              }}
              className="w-full bg-stone-100 hover:bg-stone-200 text-stone-700 py-2 rounded-lg font-bold text-[10px] uppercase tracking-wider text-center transition"
            >
              {users.some(u => u.email === 'amit@gmail.com') ? 'Edit Carpenter Identity' : 'Seed Example Identity'}
            </button>
          </div>

          {/* Mapped Polish Persons Row */}
          <div className="bg-[#fbfcfa] border border-stone-200 rounded-xl p-4 space-y-3 shadow-3xs hover:border-[#593622] transition">
            <div className="flex justify-between items-start">
              <span className="bg-teal-50 text-teal-800 border border-teal-200/50 px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider">
                polish persons
              </span>
              <span className="text-[10px] text-stone-400 font-mono">Mapped: {users.filter(u => u.role === 'polish_person').length}</span>
            </div>

            <div className="space-y-1 text-xs">
              <div className="flex justify-between text-stone-500">
                <span>Core Login Email:</span>
                <strong className="text-stone-850 truncate max-w-[130px]" title="mahesh@gmail.com">mahesh@gmail.com</strong>
              </div>
              <div className="flex justify-between text-stone-500">
                <span>Default Passcode:</span>
                <strong className="text-stone-850 font-mono">polishperson123</strong>
              </div>
              <div className="flex justify-between text-stone-500">
                <span>Google Link Status:</span>
                <span className="text-green-700 font-bold flex items-center gap-0.5 text-[10px]">
                  <CheckCircle2 size={10} /> Enabled
                </span>
              </div>
            </div>

            <button 
              type="button"
              onClick={() => {
                const polishUser = users.find(u => u.email === 'mahesh@gmail.com');
                if (polishUser) {
                  handleEditClick(polishUser);
                } else {
                  startAddNewUser();
                  setUserEmail('mahesh@gmail.com');
                  setUserRole('polish_person');
                  setInitials('MK');
                  setUserPassword('polishperson123');
                  setIsGoogleLinked(true);
                }
              }}
              className="w-full bg-stone-100 hover:bg-stone-200 text-stone-700 py-2 rounded-lg font-bold text-[10px] uppercase tracking-wider text-center transition"
            >
              {users.some(u => u.email === 'mahesh@gmail.com') ? 'Edit Polish Identity' : 'Seed Example Identity'}
            </button>
          </div>

        </div>

        {/* Dynamic mappings checklist log of all accounts with passwords defined to give transparency */}
        <div className="bg-stone-50 border border-stone-200 rounded-xl p-4 space-y-3">
          <span className="text-[10px] font-black text-stone-400 uppercase tracking-widest block font-mono">
            active credentials &amp; google login directory
          </span>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5">
            {users.map((u) => (
              <div 
                key={u.id}
                className="bg-white border border-stone-200/70 rounded-lg p-2.5 flex items-center justify-between gap-2.5"
              >
                <div className="min-w-0">
                  <span className="font-extrabold text-[11px] text-stone-850 block truncate leading-none">
                    {u.name}
                  </span>
                  <span className="text-[9px] text-stone-400 font-mono truncate block mt-0.5">
                    {u.email}
                  </span>
                </div>
                <div className="shrink-0 flex items-center gap-1">
                  <span className="px-1 text-[8px] font-bold tracking-tight bg-stone-100 text-stone-600 rounded">
                    {u.password || 'admin'}
                  </span>
                  {u.google_linked && (
                    <span className="h-2 w-2 rounded-full bg-blue-600 border" title="Linked to Google sign-in" />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
