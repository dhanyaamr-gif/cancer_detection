"use client";

import { Bell, Settings2, UserCircle2, Menu, X, Check, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useSidebar } from '@/components/layout/sidebar-context';
import { notificationsAPI, getDoctorData } from '@/lib/api';
import { connectSocket, onSocketEvent, SOCKET_EVENTS } from '@/lib/socket';

const pageTitles: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/patients': 'Patients',
  '/analysis-history': 'Analysis History',
  '/reports': 'Reports',
  '/settings': 'Settings',
  '/profile': 'Profile',
  '/login': 'Login',
};

function timeAgo(date: string) {
  const now = new Date();
  const then = new Date(date);
  const diffMs = now.getTime() - then.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
}

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const title = pageTitles[pathname] ?? 'NovaDx';
  const [unreadCount, setUnreadCount] = useState(0);
  const [doctorName, setDoctorName] = useState('Dr. Elena Marquez');
  const [doctorSpecialization, setDoctorSpecialization] = useState('Radiologist');
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const notificationsRef = useRef<HTMLDivElement | null>(null);

  const { collapsed, setCollapsed, drawerOpen, setDrawerOpen } = useSidebar();

  useEffect(() => {
    // Load doctor info
    const doctorData = getDoctorData();
    if (doctorData) {
      setDoctorName(doctorData.name || 'Dr. Elena Marquez');
      setDoctorSpecialization(doctorData.specialization || 'Radiologist');
    }

    // Fetch notifications
    const fetchNotifications = async () => {
      try {
        const res = await notificationsAPI.getAll({ limit: 20 });
        setNotifications(res.notifications || []);
        setUnreadCount(res.unreadCount || 0);
      } catch {
        // ignore
      }
    };
    fetchNotifications();

    // Listen for new notifications via socket
    connectSocket();
    const unsubscribe = onSocketEvent(SOCKET_EVENTS.NOTIFICATION_NEW, () => {
      fetchNotifications();
    });

    return () => {
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!notificationsOpen) return;
    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (notificationsRef.current?.contains(target)) return;
      setNotificationsOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [notificationsOpen]);

  const handleMenuClick = () => {
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      setDrawerOpen(!drawerOpen);
    } else {
      setCollapsed(!collapsed);
    }
  };

  const handleBellClick = () => {
    setNotificationsOpen(!notificationsOpen);
  };

  const markAsRead = async (id: string) => {
    try {
      await notificationsAPI.markAsRead(id);
      setNotifications(prev => prev.map(n => n._id === id ? { ...n, read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch {
      // ignore
    }
  };

  const markAllAsRead = async () => {
    try {
      await notificationsAPI.markAllAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch {
      // ignore
    }
  };

  const clearAll = () => {
    setNotifications([]);
    setUnreadCount(0);
  };

  return (
    <header className="sticky top-0 z-20 flex items-center justify-between border-b border-white/10 bg-[#070B16]/80 px-6 py-4 backdrop-blur-xl">
      <div className="flex items-center gap-4">
        <button
          onClick={handleMenuClick}
          aria-label="Toggle sidebar"
          className="flex h-10 w-10 items-center justify-center rounded-[12px] bg-transparent text-white hover:bg-[rgba(124,58,237,0.15)] transition"
          style={{ color: '#FFFFFF' }}
        >
          <Menu size={18} />
        </button>
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Clinical Operations</p>
          <h1 className="text-2xl font-semibold text-white">{title}</h1>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative">
          <button
            onClick={handleBellClick}
            className="relative rounded-2xl border border-white/10 bg-white/5 p-2 text-slate-300 hover:bg-white/10 transition"
          >
            <Bell size={18} />
            {unreadCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-danger text-[10px] font-bold text-white">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          <AnimatePresence>
            {notificationsOpen && (
              <motion.div
                ref={notificationsRef}
                initial={{ opacity: 0, y: -10, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.98 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                className="absolute right-0 top-full z-30 mt-2 w-80 max-h-96 overflow-y-auto rounded-[18px] border border-white/10 bg-[#0A1020] shadow-2xl shadow-black/40"
              >
                <div className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-medium text-white">Notifications</h3>
                    <div className="flex gap-2">
                      {unreadCount > 0 && (
                        <button
                          onClick={markAllAsRead}
                          className="text-xs text-primary hover:text-primary/80 transition"
                        >
                          Mark all read
                        </button>
                      )}
                      <button
                        onClick={clearAll}
                        className="text-xs text-slate-400 hover:text-white transition"
                      >
                        Clear all
                      </button>
                    </div>
                  </div>

                  {notifications.length === 0 ? (
                    <div className="text-center py-8 text-slate-400">
                      <p className="text-sm">No notifications</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {notifications.map((notification) => (
                        <div
                          key={notification._id}
                          className={`rounded-2xl border border-white/10 p-3 ${!notification.read ? 'bg-primary/10' : 'bg-white/5'}`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1">
                              <p className="text-sm text-white">{notification.message}</p>
                              <p className="text-xs text-slate-400 mt-1">{timeAgo(notification.createdAt)}</p>
                            </div>
                            {!notification.read && (
                              <button
                                onClick={() => markAsRead(notification._id)}
                                className="text-primary hover:text-primary/80 transition"
                                title="Mark as read"
                              >
                                <Check size={14} />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-3 py-2">
          <UserCircle2 size={28} className="text-primary" />
          <div className="hidden md:block">
            <p className="text-sm font-medium text-white">{doctorName}</p>
            <p className="text-xs text-slate-400">{doctorSpecialization}</p>
          </div>
          <Settings2 size={16} className="text-slate-400" />
        </div>
      </div>
    </header>
  );
}