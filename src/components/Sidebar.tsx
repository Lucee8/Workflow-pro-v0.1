/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { User } from '../types';
import { motion } from 'motion/react';
import {
  LayoutDashboard,
  ClipboardList,
  PlusSquare,
  Calendar,
  Users,
  LineChart,
  Settings,
  HelpCircle,
  LogOut,
  Bell,
  HardHat,
  Menu,
  X,
  Contact,
  FileText,
  Boxes,
  ArrowUpRight,
  ChevronDown,
  ChevronUp,
  Sparkles,
} from 'lucide-react';
import React from 'react';

interface SidebarProps {
  currentUser: User;
  currentTab: string;
  onTabChange: (tab: string) => void;
  onLogout: () => void;
  notificationsCount?: number;
}

export default function Sidebar({
  currentUser,
  currentTab,
  onTabChange,
  onLogout,
  notificationsCount = 3,
}: SidebarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const [confirmLogout, setConfirmLogout] = React.useState(false);
  const [switcherExpanded, setSwitcherExpanded] = React.useState(true);
  const isAdmin = currentUser.role === 'admin';
  const isManager = currentUser.role === 'manager';

  // Auto-reset logout confirmation banner after 3.5 seconds
  React.useEffect(() => {
    if (confirmLogout) {
      const timer = setTimeout(() => setConfirmLogout(false), 3500);
      return () => clearTimeout(timer);
    }
  }, [confirmLogout]);

  // Define nav links per role
  const navItems = (isAdmin || isManager)
    ? [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'crm', label: 'CRM', icon: Contact },
        { id: 'orders', label: 'Orders', icon: ClipboardList },
        { id: 'customers', label: 'Customers', icon: Contact },
        { id: 'create_order', label: 'Work Order', icon: HardHat },
        { id: 'calendar', label: 'Calendar', icon: Calendar },
        { id: 'users', label: 'Users', icon: Users },
        { id: 'reports', label: 'Reports', icon: LineChart },
        { id: 'settings', label: 'Settings', icon: Settings },
        { id: 'detail_order_form', label: 'Detail Order Form', icon: FileText },
        { id: 'mrp', label: 'Material Planning (MRP)', icon: Boxes },
      ]
    : [
        { id: 'my_orders', label: 'My Orders', icon: ClipboardList },
        { id: 'profile', label: 'Profile', icon: Users },
      ];

  const handleLinkClick = (tabId: string) => {
    onTabChange(tabId);
    setMobileMenuOpen(false);
  };

  return (
    <>
      {/* Top Header Bar for Mobile viewports */}
      <header className="lg:hidden h-14 bg-stone-900 border-b border-stone-800 px-4 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-2">
          {/* Logo icon */}
          <img 
            src="/logo.png" 
            alt="Logo" 
            className="w-8 h-8 rounded-lg object-contain bg-amber-500 p-1 shadow"
            onError={(e) => {
              // If logo.png is not present yet, show text fallback
              e.currentTarget.style.display = 'none';
              const fallback = document.getElementById('logo-fallback-mobile');
              if (fallback) fallback.classList.remove('hidden');
            }}
            referrerPolicy="no-referrer"
          />
          <div id="logo-fallback-mobile" className="hidden bg-amber-500 text-stone-950 px-2 py-1 rounded font-bold text-sm shadow">
            Bh
          </div>
          <div>
            <span className="font-display font-black text-amber-400 text-xs uppercase tracking-wider block">
              Bhise'z
            </span>
            <span className="text-[8px] tracking-widest text-stone-400 uppercase -mt-1 block">
              Order Tracker
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Mobile Notification Badge */}
          <button className="relative p-1 text-stone-400 hover:text-white" onClick={() => alert("Notification center: 3 new staging updates require QA check.")}>
            <Bell size={18} />
            {notificationsCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-rose-600 text-white font-mono text-[9px] font-bold h-4 w-4 rounded-full flex items-center justify-center">
                {notificationsCount}
              </span>
            )}
          </button>

          {/* Hamburger toggle */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-1.5 text-stone-300 hover:text-white border border-stone-800 rounded-lg"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </header>

      {/* sliding mobile sidebar drawer overlay */}
      {mobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 z-30 bg-black/60 backdrop-blur-xs"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Primary Left Sidebar for Desktop. Animated/drawer on mobile. */}
      <aside
        className={`fixed lg:sticky top-14 lg:top-0 left-0 bottom-0 z-30 lg:z-10 w-64 bg-[#1a110a] text-stone-300 flex flex-col justify-between border-r border-stone-900/40 transition-transform duration-300 lg:translate-x-0 ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        } ${mobileMenuOpen ? 'h-[calc(100vh-56px)]' : 'h-screen'}`}
      >
        {/* Sidebar Brand Header (Desktop only) */}
        <div className="p-6 border-b border-stone-900/30 hidden lg:block">
          <div className="flex items-center gap-3">
            <img 
              src="/logo.png" 
              alt="Logo" 
              className="w-11 h-11 rounded-xl object-contain bg-amber-500 p-1.5 shadow-lg border border-amber-400"
              onError={(e) => {
                // If logo.png is not present yet, show text fallback
                e.currentTarget.style.display = 'none';
                const fallback = document.getElementById('logo-fallback-desktop');
                if (fallback) fallback.classList.remove('hidden');
              }}
              referrerPolicy="no-referrer"
            />
            <div id="logo-fallback-desktop" className="hidden bg-amber-500 text-stone-950 p-2.5 rounded-xl font-black text-lg shadow-lg border border-amber-400">
              Bh
            </div>
            <div>
              <span className="font-display font-black text-amber-500 text-sm xl:text-base uppercase tracking-wider block">
                Bhise'z Workshop
              </span>
              <span className="text-[9px] font-mono tracking-widest text-[#a8a29e] uppercase block -mt-1">
                ORDER TRACKER
              </span>
            </div>
          </div>
        </div>

        {/* User context profile card inside sidebar */}
        <div className="px-4 py-4 bg-[#23170e]/80 border-b border-stone-900/20 lg:block">
          <div className="flex items-center gap-3">
            {/* Simple User Initials Avatar with custom background */}
            <div className="h-10 w-10 rounded-xl bg-[#593622] text-amber-300 font-bold flex items-center justify-center text-xs shadow border border-stone-800">
              {currentUser.initials}
            </div>
            <div className="flex-1 min-w-0">
              <span className="font-bold text-stone-100 text-xs block truncate">
                {currentUser.name} {currentUser.id === 'user_admin' ? '(You)' : ''}
              </span>
              <span className="text-[10px] text-stone-400 font-medium block uppercase tracking-wider">
                {currentUser.role.replace('_', ' ')}
              </span>
            </div>
          </div>
        </div>

        {/* Scaled Interactive Menu Navigation Links */}
        <nav className="flex-1 px-3 py-6 space-y-1.5 overflow-y-auto">
          {navItems.map((item) => {
            const IconComponent = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleLinkClick(item.id)}
                className="w-full relative flex items-center gap-3.5 px-3.5 py-3 rounded-xl text-xs font-semibold tracking-wide transition-colors group outline-none"
                style={{ contentVisibility: 'auto' }}
              >
                {isActive && (
                  <motion.div
                    layoutId="desktopActiveTabIndicator"
                    className="absolute inset-0 bg-[#593622] rounded-xl border-l-4 border-amber-500 z-0 shadow-sm"
                    transition={{ type: 'spring', stiffness: 350, damping: 28 }}
                  />
                )}
                <span className="relative z-10 flex items-center gap-3.5 w-full">
                  <IconComponent
                    size={16}
                    className={isActive ? 'text-amber-400 font-extrabold' : 'text-stone-500 group-hover:text-stone-300 transition-colors'}
                  />
                  <span className={isActive ? 'text-amber-300 font-extrabold' : 'text-stone-450 group-hover:text-stone-200 transition-colors'}>
                    {item.label}
                  </span>
                </span>
              </button>
            );
          })}
        </nav>

        {/* Workspace Switcher / Admin Panels (Visible to Admins only) */}
        {isAdmin && (
          <div className="px-3 py-3 mx-3 mb-3 rounded-xl bg-[#23170e]/40 border border-stone-900/60 font-sans shadow-inner">
            <button
              onClick={() => setSwitcherExpanded(!switcherExpanded)}
              className="w-full flex items-center justify-between text-[10px] font-black tracking-wider text-amber-500/80 uppercase group hover:text-amber-400 transition"
            >
              <span className="flex items-center gap-1.5">
                <Boxes size={12} className="text-amber-500 animate-pulse" />
                Workspace Switcher
              </span>
              <span className="text-[10px] text-stone-500 group-hover:text-stone-300 transition-colors">
                {switcherExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              </span>
            </button>
            
            {switcherExpanded && (
              <div className="mt-2.5 space-y-1.5">
                <a
                  href="https://bhisez-furniture.vercel.app/?view=admin"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between px-3 py-2 rounded-lg text-stone-300 hover:text-white bg-stone-950/40 hover:bg-[#593622]/40 border border-stone-900/50 hover:border-amber-500/30 text-[11px] font-bold transition group"
                >
                  <span className="flex items-center gap-2">
                    <span className="text-[13px] shrink-0">🪑</span>
                    <span className="truncate">Furniture Admin</span>
                  </span>
                  <ArrowUpRight size={11} className="text-stone-500 group-hover:text-amber-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all shrink-0" />
                </a>

                <a
                  href="https://geetas-s-masale-v0-1.onrender.com/admin"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between px-3 py-2 rounded-lg text-stone-300 hover:text-white bg-stone-950/40 hover:bg-[#593622]/40 border border-stone-900/50 hover:border-amber-500/30 text-[11px] font-bold transition group"
                >
                  <span className="flex items-center gap-2">
                    <span className="text-[13px] shrink-0">🌶️</span>
                    <span className="truncate">Masale Admin</span>
                  </span>
                  <ArrowUpRight size={11} className="text-stone-500 group-hover:text-amber-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all shrink-0" />
                </a>
              </div>
            )}
          </div>
        )}

        {/* Dedicated Support & Actions block */}
        <div className="p-4 border-t border-stone-900/30 space-y-1">
          <button
            onClick={() => {
              alert(
                'Help & Staging Guidelines:\n- Admin creates orders and authorizes Dispatches.\n- Carpenters logs Carpentry status along with real photographic uploads.\n- Polish staff tracks and marks Quality passes.'
              );
            }}
            className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-stone-400 hover:text-stone-100 hover:bg-stone-800/30 text-xs font-semibold tracking-wide transition"
          >
            <HelpCircle size={15} className="text-stone-500" />
            Help Guide
          </button>

          <button
            onClick={() => {
              if (confirmLogout) {
                onLogout();
                setConfirmLogout(false);
              } else {
                setConfirmLogout(true);
              }
            }}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs font-semibold tracking-wide transition-all ${
              confirmLogout
                ? 'bg-rose-600 text-white shadow-md animate-pulse'
                : 'text-rose-400 hover:text-rose-300 hover:bg-rose-950/25'
            }`}
          >
            <LogOut size={15} className={confirmLogout ? 'text-white font-bold' : 'text-rose-500'} />
            <span>{confirmLogout ? 'Click again to Sign Out' : 'Logout'}</span>
          </button>
        </div>
      </aside>

      {/* High-fidelity Mobile Bottom Tab Bar (Only matches phone viewports) */}
      <nav className="lg:hidden fixed bottom-y-0 bottom-0 left-0 right-0 bg-stone-950 border-t border-stone-900 z-40 flex justify-around items-center h-14 px-2 shadow-xl safe-bottom">
        {navItems.slice(0, 4).map((item) => {
          const IconComponent = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`flex flex-col items-center justify-center flex-1 h-full font-sans max-w-[80px] ${
                isActive ? 'text-amber-400' : 'text-stone-500'
              }`}
            >
              <IconComponent size={18} className={isActive ? 'text-amber-400' : 'text-stone-500'} />
              <span className="text-[9px] mt-1 font-bold truncate max-w-full">{item.label}</span>
            </button>
          );
        })}

        {/* Plus Order / drawer fallback button */}
        <button
          onClick={() => {
            if (isAdmin) {
              onTabChange('crm');
            } else {
              setMobileMenuOpen(true);
            }
          }}
          className="flex flex-col items-center justify-center flex-1 h-full text-stone-500"
        >
          {isAdmin ? (
            <div className="bg-amber-500 text-stone-950 p-2 rounded-full -mt-5 shadow-lg border border-stone-900">
              <PlusSquare size={16} />
            </div>
          ) : (
            <Menu size={18} />
          )}
          <span className="text-[9px] mt-1 font-bold">{isAdmin ? 'Add via CRM' : 'More...'}</span>
        </button>
      </nav>
    </>
  );
}
