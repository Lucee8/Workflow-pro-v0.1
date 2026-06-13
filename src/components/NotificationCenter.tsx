/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Order, User, NotificationItem, OrderStage, StatusLog } from '../types';
import { generateUUID } from '../db/store';
import { 
  Bell, 
  Check, 
  Trash2, 
  X, 
  ChevronRight, 
  ExternalLink,
  Zap,
  Volume2,
  Clock,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

interface NotificationCenterProps {
  orders: Order[];
  currentUser: User;
  users: User[];
  onViewOrder: (orderId: string) => void;
  onUpdateOrder: (updatedOrder: Order, newLog?: StatusLog) => void;
}

// Order stage list for progression validation
const STAGES: OrderStage[] = [
  'Pending',
  'Design',
  'Carpentry',
  'QC Check 1',
  'Polish',
  'QC Check 2',
  'Ready to Dispatch',
  'Dispatched',
];

interface ToastAlert {
  id: string;
  title: string;
  message: string;
  articleNo: string;
  category: string;
  orderId: string;
}

export default function NotificationCenter({
  orders,
  currentUser,
  users,
  onViewOrder,
  onUpdateOrder,
}: NotificationCenterProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [notifications, setNotifications] = React.useState<NotificationItem[]>(() => {
    try {
      const stored = localStorage.getItem('bhise_notifications_list_v1');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const [toasts, setToasts] = React.useState<ToastAlert[]>([]);
  const [autoSimulate, setAutoSimulate] = React.useState(false);

  // Stores the last known stages mapping: orderId -> current_status
  const lastStagesRef = React.useRef<Record<string, OrderStage>>({});

  // Sync notifications array with local storage whenever it changes
  React.useEffect(() => {
    localStorage.setItem('bhise_notifications_list_v1', JSON.stringify(notifications));
  }, [notifications]);

  // Sync initial stages on mount, so we don't alert on pre-existing states upon first load
  React.useEffect(() => {
    const initialStagesMap: Record<string, OrderStage> = {};
    orders.forEach((o) => {
      initialStagesMap[o.id] = o.current_status;
    });
    lastStagesRef.current = initialStagesMap;
  }, []);

  // Soft synth chime generator for notification cues
  const playChime = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      
      osc.type = 'sine';
      // Pleasant dual chime
      osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
      osc.frequency.setValueAtTime(880.00, audioCtx.currentTime + 0.12); // A5
      
      gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.4);
      
      osc.start();
      osc.stop(audioCtx.currentTime + 0.4);
    } catch (e) {
      // browser audio context policies may block
    }
  };

  /**
   * Status change poller effect
   * Periodically checks state array to see if any order's stage has shifted
   */
  React.useEffect(() => {
    const pollInterval = setInterval(() => {
      const currentKnown = { ...lastStagesRef.current };
      let updatedSomething = false;

      orders.forEach((currentOrder) => {
        const orderId = currentOrder.id;
        const lastStage = currentKnown[orderId];

        // If we have a record of this order, and its stage has changed
        if (lastStage && lastStage !== currentOrder.current_status) {
          const oldIndex = STAGES.indexOf(lastStage);
          const newIndex = STAGES.indexOf(currentOrder.current_status);

          // Only trigger if stage changed or progressed
          if (newIndex !== -1 && oldIndex !== -1) {
            // Determine if the order is relevant/assigned to the current user
            const isAdmin = currentUser.role === 'admin';
            const isAssignedToMe =
              currentUser.id === currentOrder.carpenter_id ||
              (currentOrder.polish_person_id && currentUser.id === currentOrder.polish_person_id);

            // We filter for active user assignment as requested in instructions
            if (isAdmin || isAssignedToMe) {
              const modifierName = 'System / Workshop Team';
              
              const newNotification: NotificationItem = {
                id: 'notif_' + Math.random().toString(36).substring(2, 9),
                order_id: currentOrder.id,
                article_no: currentOrder.article_no,
                category: currentOrder.category,
                sub_category: currentOrder.sub_category,
                old_stage: lastStage,
                new_stage: currentOrder.current_status,
                changed_by_name: modifierName,
                timestamp: new Date().toISOString(),
                is_read: false,
              };

              // Prepend to list
              setNotifications((prev) => [newNotification, ...prev]);

              // Handle Toast Alert
              const isAdvance = newIndex > oldIndex;
              const toastTitle = isAdvance ? '🚚 Production Advanced' : '⚠️ Stage Updated';
              const toastMsg = `${currentOrder.sub_category} moved from "${lastStage}" → "${currentOrder.current_status}"`;

              const toastId = 'toast_' + Math.random().toString(36).substring(2, 9);
              setToasts((prev) => [
                ...prev,
                {
                  id: toastId,
                  title: toastTitle,
                  message: toastMsg,
                  articleNo: currentOrder.article_no,
                  category: currentOrder.category,
                  orderId: currentOrder.id,
                },
              ]);

              // Remove toast automatically after 5 seconds
              setTimeout(() => {
                setToasts((prev) => prev.filter((t) => t.id !== toastId));
              }, 5000);

              playChime();
            }
          }
          updatedSomething = true;
        }

        // Always update map to the current status to keep the baseline matched
        currentKnown[orderId] = currentOrder.current_status;
      });

      if (updatedSomething) {
        lastStagesRef.current = currentKnown;
      }
    }, 3000); // Poll fast every 3 seconds for direct testing feel

    return () => clearInterval(pollInterval);
  }, [orders, currentUser]);

  /**
   * Auto simulation effect
   * If enabled, randomly advances one active order every 12 seconds to generate active traffic
   */
  React.useEffect(() => {
    if (!autoSimulate) return;

    const simInterval = setInterval(() => {
      // Find orders that are eligible for advancement (not Dispatched yet)
      const activeOrders = orders.filter((o) => o.current_status !== 'Dispatched');
      if (activeOrders.length === 0) return;

      const randomOrder = activeOrders[Math.floor(Math.random() * activeOrders.length)];
      const currentIdx = STAGES.indexOf(randomOrder.current_status);
      
      if (currentIdx !== -1 && currentIdx < STAGES.length - 1) {
        const nextStage = STAGES[currentIdx + 1];
        
        // Formulate a mock status log
        const logId = 'log_sim_' + Math.random().toString(36).substring(2, 9);
        const log: StatusLog = {
          id: logId,
          order_id: randomOrder.id,
          stage: nextStage,
          changed_by: 'system_simulation',
          changed_by_name: 'Auto Workshop Bot',
          changed_by_role: 'admin',
          timestamp: new Date().toISOString(),
          note: `Auto-simulation: Production line advanced ${randomOrder.sub_category} to ${nextStage}.`,
        };

        const updatedOrder: Order = {
          ...randomOrder,
          current_status: nextStage,
          updated_at: new Date().toISOString(),
        };

        onUpdateOrder(updatedOrder, log);
      }
    }, 12000);

    return () => clearInterval(simInterval);
  }, [orders, autoSimulate, onUpdateOrder]);

  // Forces a mock advancement immediately with a button click to let users review the feature
  const forceTriggerAdvance = () => {
    const activeOrders = orders.filter((o) => o.current_status !== 'Dispatched');
    if (activeOrders.length === 0) {
      alert('All orders are already in Dispatched status. Reset memory or make a new order to test.');
      return;
    }

    // Prefer an order assigned to the current user to trigger their alerts!
    const userAssigned = activeOrders.filter((o) => {
      if (currentUser.role === 'admin') return true;
      return currentUser.id === o.carpenter_id || (o.polish_person_id && currentUser.id === o.polish_person_id);
    });

    const targetList = userAssigned.length > 0 ? userAssigned : activeOrders;
    const randomOrder = targetList[Math.floor(Math.random() * targetList.length)];
    const currentIdx = STAGES.indexOf(randomOrder.current_status);

    if (currentIdx !== -1 && currentIdx < STAGES.length - 1) {
      const nextStage = STAGES[currentIdx + 1];
      const logId = 'log_sim_' + Math.random().toString(36).substring(2, 9);
      const log: StatusLog = {
        id: logId,
        order_id: randomOrder.id,
        stage: nextStage,
        changed_by: 'system_simulation',
        changed_by_name: 'Simulated Colleague',
        changed_by_role: 'carpenter',
        timestamp: new Date().toISOString(),
        note: `Triggered via simulation swapper. ${randomOrder.sub_category} advanced to ${nextStage}.`,
      };

      const updatedOrder: Order = {
        ...randomOrder,
        current_status: nextStage,
        updated_at: new Date().toISOString(),
      };

      onUpdateOrder(updatedOrder, log);
    }
  };

  const markAllasRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
  };

  const clearAllNotifications = () => {
    setNotifications([]);
  };

  const handleNotificationClick = (orderId: string, notifId: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === notifId ? { ...n, is_read: true } : n))
    );
    setIsOpen(false);
    onViewOrder(orderId);
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <>
      {/* Floating Notifications Hub - Top Bar / Sidebar integration */}
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`relative p-2.5 rounded-xl border flex items-center justify-center transition-all ${
            isOpen
              ? 'bg-[#593622] border-[#593622] text-amber-300'
              : 'bg-white border-stone-200 text-stone-600 hover:text-stone-900 shadow-xs'
          }`}
          title="Workshop Alert Notifications"
          id="notif_bell_btn"
        >
          <Bell className={unreadCount > 0 ? 'animate-bounce' : ''} size={18} />
          
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-600 font-mono font-black text-[10px] text-white h-5 w-5 rounded-full flex items-center justify-center shadow-md animate-pulse ring-2 ring-white">
              {unreadCount}
            </span>
          )}
        </button>

        {/* Dropdown Menu Tray */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: 15, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 15, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 mt-2.5 w-80 md:w-96 bg-white border border-stone-200 rounded-2xl shadow-xl z-50 overflow-hidden font-sans"
              id="notif_dropdown_panel"
            >
              {/* Header */}
              <div className="bg-stone-50 px-4 py-3.5 border-b border-stone-150 flex items-center justify-between">
                <div>
                  <h3 className="font-extrabold text-stone-900 text-xs uppercase tracking-wider font-display flex items-center gap-1.5">
                    <span>Workshop Alerts</span>
                    {unreadCount > 0 && (
                      <span className="bg-amber-100 text-amber-800 text-[9px] px-1.5 py-0.5 rounded-full font-black">
                        {unreadCount} NEW
                      </span>
                    )}
                  </h3>
                  <p className="text-[10px] text-stone-500 mt-0.5">
                    Stage updates regarding your assigned tasks
                  </p>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1 hover:bg-stone-200/60 rounded-lg text-stone-400 hover:text-stone-700 transition"
                >
                  <X size={15} />
                </button>
              </div>

              {/* Action Toolbar */}
              <div className="px-4 py-2 border-b border-stone-100 bg-stone-50/50 flex items-center justify-between text-[11px]">
                <button
                  onClick={markAllasRead}
                  disabled={notifications.length === 0}
                  className="text-[#593622] hover:text-[#402414] font-bold disabled:opacity-40 flex items-center gap-1"
                >
                  <Check size={12} />
                  Mark read
                </button>
                <button
                  onClick={clearAllNotifications}
                  disabled={notifications.length === 0}
                  className="text-stone-500 hover:text-red-600 font-bold disabled:opacity-40 flex items-center gap-1"
                >
                  <Trash2 size={12} />
                  Clear all
                </button>
              </div>

              {/* Notification List Panel */}
              <div className="max-h-[300px] overflow-y-auto divide-y divide-stone-100 scrollbar-thin">
                {notifications.length === 0 ? (
                  <div className="p-8 text-center text-stone-400">
                    <Clock size={28} className="mx-auto opacity-30 mb-2" />
                    <p className="text-xs font-semibold">No alerts registered yet.</p>
                    <p className="text-[10px] mt-1 text-stone-400">
                      Changes made by colleagues will appear here live.
                    </p>
                  </div>
                ) : (
                  notifications.map((notif) => {
                    const timeAgo = new Date(notif.timestamp).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    });
                    
                    return (
                      <div
                        key={notif.id}
                        onClick={() => handleNotificationClick(notif.order_id, notif.id)}
                        className={`p-3.5 text-left cursor-pointer transition duration-150 hover:bg-amber-50/15 flex items-start gap-3 relative ${
                          !notif.is_read ? 'bg-amber-500/[0.04] border-l-2 border-amber-500' : ''
                        }`}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="font-mono text-[10px] font-bold text-stone-850">
                              {notif.article_no}
                            </span>
                            <span className="text-[9px] text-stone-400 font-mono">
                              {timeAgo}
                            </span>
                          </div>
                          
                          <p className="text-stone-800 text-[11px] leading-relaxed mt-1 font-medium">
                            {notif.category} {notif.sub_category} advanced to{' '}
                            <span className="text-[#593622] font-extrabold">
                              {notif.new_stage}
                            </span>
                          </p>

                          <div className="flex items-center gap-1 mt-1.5 text-[9px] text-stone-450">
                            <span className="font-semibold text-stone-500">From:</span>
                            <span className="line-through">{notif.old_stage}</span>
                            <ChevronRight size={10} className="text-stone-400" />
                            <span className="bg-[#593622]/5 text-[#593622] px-1 rounded font-bold">
                              {notif.new_stage}
                            </span>
                          </div>
                        </div>

                        <div className="self-center text-stone-400">
                          <ExternalLink size={12} className="hover:text-stone-600" />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Simulator Action Drawer Panel */}
              <div className="bg-stone-50 p-3.5 border-t border-stone-150 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-stone-600 uppercase tracking-wider font-mono flex items-center gap-1.5">
                    <Zap size={11} className="text-amber-500 fill-amber-500" />
                    Testing Simulator
                  </span>
                  <label className="flex items-center gap-1.5 cursor-pointer text-[10px]">
                    <input
                      type="checkbox"
                      checked={autoSimulate}
                      onChange={(e) => setAutoSimulate(e.target.checked)}
                      className="rounded border-stone-300 text-amber-600 focus:ring-amber-500 h-3.5 w-3.5"
                    />
                    <span className="text-stone-500 font-bold select-none">Auto-Advance (12s)</span>
                  </label>
                </div>

                <div className="grid grid-cols-1 gap-1.5">
                  <button
                    onClick={forceTriggerAdvance}
                    className="w-full bg-amber-500 hover:bg-amber-600 text-stone-950 font-bold text-[11px] py-1.5 px-3 rounded-lg flex items-center justify-center gap-1.5 transition active:scale-[0.98] shadow-xs"
                  >
                    <Zap size={12} />
                    Simulate Stage Advance Now
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Floating Canvas Real-time Toasts Layer */}
      <div className="fixed bottom-16 sm:bottom-6 right-4 sm:right-6 z-50 flex flex-col gap-2 w-full max-w-[320px] md:max-w-sm pointer-events-none">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 30, scale: 0.9, x: 20 }}
              animate={{ opacity: 1, y: 0, scale: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.85, transition: { duration: 0.15 } }}
              className="bg-stone-900 border border-stone-800 text-white p-4 rounded-xl shadow-2xl pointer-events-auto flex gap-3 items-start relative select-none w-full cursor-pointer hover:bg-stone-850 transition"
              onClick={() => {
                setToasts((prev) => prev.filter((t) => t.id !== toast.id));
                onViewOrder(toast.orderId);
              }}
            >
              <div className="bg-[#593622] text-amber-300 p-2 rounded-lg shrink-0 mt-0.5 shadow border border-amber-500/10">
                <Bell size={15} className="animate-swing" />
              </div>

              <div className="flex-1 min-w-0 pr-4">
                <span className="font-mono text-[9px] font-black text-amber-400 block tracking-wider uppercase">
                  {toast.articleNo}
                </span>
                <strong className="text-stone-100 font-bold text-xs block mt-0.5">
                  {toast.title}
                </strong>
                <p className="text-stone-300 text-[11px] leading-relaxed mt-1 font-medium">
                  {toast.message}
                </p>
                <span className="text-[10px] text-amber-500/90 font-bold hover:underline inline-flex items-center gap-1 mt-2">
                  Verify specs sheet →
                </span>
              </div>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setToasts((prev) => prev.filter((t) => t.id !== toast.id));
                }}
                className="absolute top-2.5 right-2.5 text-stone-500 hover:text-white p-1 hover:bg-stone-800 rounded-lg transition"
              >
                <X size={14} />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </>
  );
}
