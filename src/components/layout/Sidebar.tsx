import React, { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation, Link } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Link2,
  Settings,
  ChevronRight,
  ChevronLeft,
  User,
  LogOut,
  ExternalLink,
  Mic,
  Cake,
  Calendar,
  Puzzle,
  Megaphone,
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

const menuItems = [
  { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
  { label: 'Üye Yönetimi', path: '/uyeler', icon: Users },
  { label: 'Görev Zinciri', path: '/gorev-zinciri', icon: Link2 },
  { label: 'Linkler', path: '/linkler', icon: ExternalLink },
  { label: 'Konuşmacılar', path: '/konusmacilar', icon: Mic },
  { label: 'Etkinlikler', path: '/etkinlikler', icon: Calendar },
  { label: 'Doğum Günleri', path: '/dogum-gunleri', icon: Cake },
  { label: 'Bölümler', path: '/organizasyon/bolumler', icon: Puzzle },

  { label: 'Duyurular', path: '/ayarlar', icon: Megaphone },
  { label: 'Topluluk Ayarları', path: '/topluluk-ayarlar', icon: Settings },
];


export const Sidebar: React.FC<SidebarProps> = ({ collapsed, onToggle }) => {
  const location = useLocation();
  const navRef = useRef<HTMLDivElement>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [menuHover, setMenuHover] = useState(false);

  // Track mouse position relative to sidebar for glow effect
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!navRef.current) return;
    const rect = navRef.current.getBoundingClientRect();
    setMousePos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  }, []);

const { isIceBlue } = useTheme();

  return (
    <motion.aside
      layout
      initial={false}
      animate={{ width: collapsed ? 64 : 220 }}
      transition={{ type: 'spring', stiffness: 250, damping: 25 }}
      className={`relative h-screen shrink-0 overflow-hidden border-r ${
        isIceBlue 
          ? 'bg-white border-iceBlue-200 shadow-ice-blue' 
          : 'bg-coal-800 border-white/[0.15]'
      }`}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setMenuHover(true)}
      onMouseLeave={() => setMenuHover(false)}
    >
      {/* ═══════════════════════════════════════
          GLOBAL GLOW: moving radial gradient
          that follows the cursor behind nav items
         ═══════════════════════════════════════ */}
      <div
        className="pointer-events-none absolute inset-0 opacity-50"
        style={{
          background: `radial-gradient(400px circle at ${mousePos.x}px ${mousePos.y}px, rgba(170, 32, 60, 0.06), transparent 60%)`,
        }}
      />

      {/* ── Header / Brand ───────────────────────────── */}
      <div className="relative z-10 px-5 pt-7 pb-6 flex items-center justify-between">
        <motion.div
          layout
          className="flex items-center gap-3 overflow-hidden"
        >
          {/* Logo mark */}
          <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.04] shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]">
            <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-ice-500/10 to-transparent" />
            <span className="relative z-10 text-sm font-bold text-white">T</span>

          </div>

          {/* Brand text */}
          <AnimatePresence>
            {!collapsed && (
              <motion.div
                initial={{ opacity: 0, x: -10, scale: 0.95 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: -10, scale: 0.95 }}
                transition={{ type: 'spring', stiffness: 300, damping: 28 }}
                className="whitespace-nowrap"
              >
<h2 className="font-display text-sm font-bold tracking-tight leading-tight"
                  style={{ color: 'var(--text-primary)' }}
                >

                  Topluluk
                </h2>
                <p className="text-[10px] leading-tight"
                  style={{ color: 'var(--text-muted)' }}
                >

                  Görev Yönetimi
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Collapse toggle */}
        <motion.button
          layout
          whileHover={{ scale: 1.1, rotate: collapsed ? 180 : 0 }}
          whileTap={{ scale: 0.9 }}
          onClick={onToggle}
          className="flex h-5 w-5 items-center justify-center rounded-lg border border-white/[0.06] bg-white/[0.03] text-white/80 hover:text-white/90 hover:border-white/[0.12] transition-colors"

        >
          {collapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
        </motion.button>
      </div>

      {/* ── Navigation ────────────────────────────────── */}
      <nav ref={navRef} className="relative z-10 flex flex-1 flex-col px-2.5 space-y-1 overflow-visible">
        {menuItems.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;

          return (
            <Link
                key={item.path}
                to={item.path}
                title={collapsed ? item.label : undefined}
                className="group relative block overflow-visible"
              >
                {/* Per-item hover glow */}
                <div className="pointer-events-none absolute inset-0 rounded-xl opacity-0 transition-opacity duration-500 group-hover:opacity-100"
                  style={{
                    background: `radial-gradient(120px circle at center, rgba(116,192,252,0.10), transparent 70%)`,
                  }}
                />

                <motion.div
                  layout
                  className={`relative flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors duration-300 overflow-visible ${
                    isActive
                      ? 'bg-white/[0.06] shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]'
                      : 'hover:bg-white/[0.03]'
                  }`}
                  style={{ color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)' }}
                >
                  {/* Active indicator bar */}
                {isActive && (
                  <motion.div
                    layoutId="activeIndicator"
                    className="absolute left-0 top-1/1 h-5 w-[2.5px] -translate-y-1/2 rounded-full bg-gradient-to-b from-ice-400 to-ice-600"
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}

                {/* Icon with 3D spring animation */}
                <motion.div
                  whileHover={{ scale: 1.15, rotate: 12, transition: { type: 'spring', stiffness: 400, damping: 15 } }}
                  className="relative flex h-4 w-4 shrink-0 items-center justify-center rounded-full transition-all duration-200"
                >
                  <Icon className={`h-4 w-4 transition-colors duration-200 ${
                    isActive
                      ? 'text-ice-300 drop-shadow-[0_0_12px_rgba(116,192,252,0.45)]'
                      : menuHover
                      ? 'text-ice-300 drop-shadow-[0_0_10px_rgba(116,192,252,0.25)]'
                      : 'text-silver-400'
                  }`} />
                  {!isActive && (
                    <span className={`pointer-events-none absolute inset-0 rounded-full transition-all duration-200 ${menuHover ? 'opacity-100' : 'opacity-0'}`} style={{ boxShadow: '0 0 20px rgba(56,189,248,0.16)' }} />
                  )}
                </motion.div>

                {/* Label with spring text reveal */}
                <AnimatePresence initial={false}>
                  {!collapsed && (
                    <motion.span
                      initial={{ opacity: 0, x: -12, filter: 'blur(4px)' }}
                      animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
                      exit={{ opacity: 0, x: -12, filter: 'blur(4px)' }}
                      transition={{ type: 'spring', stiffness: 300, damping: 26 }}
                      className="flex-1 whitespace-nowrap text-xs font-medium"
                    >
                      {item.label}
                    </motion.span>
                  )}
                </AnimatePresence>

                {/* Hover chevron */}
                <AnimatePresence>
                  {!collapsed && (
<motion.div
                      initial={{ opacity: 0, x: 8 }}
                      whileHover={{ x: 2 }}
                      className="shrink-0 transition-all duration-300 opacity-0 group-hover:opacity-100"
                      style={{ color: isActive ? 'var(--text-secondary)' : 'var(--text-muted)' }}
                    >
                      <ChevronRight className="h-3.5 w-3.5" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            </Link>
          );
        })}
      </nav>

      {/* ── User Profile Card ─────────────────────────── */}
      <div className="relative z-10 mt-auto border-t border-white/[0.05] px-3 pt-4 pb-5">
        <div
          className={`group relative flex items-center gap-3 rounded-xl p-2.5 transition-colors hover:bg-white/[0.03] ${
            collapsed ? 'justify-center' : ''
          }`}
        >
          {/* Avatar */}
          <div className="relative shrink-0">
            <div className="flex h-10 w-10 items-center justify-center rounded-full border border-white/[0.08] bg-gradient-to-br from-coal-700 to-coal-800 shadow-lg">
              <User className="h-3 w-3 text-white/80" />

            </div>
            {/* Online status indicator */}
            <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-coal-800 bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.5)]" />

          </div>

          {/* User info */}
          <AnimatePresence>
            {!collapsed && (
<motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ type: 'spring', stiffness: 300, damping: 28 }}
                className="min-w-0 flex-1"
              >
                <p className="truncate text-sm font-semibold"
                  style={{ color: 'var(--text-primary)' }}
                >

                  Admin Kullanıcı
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-ice-500 shadow-[0_0_6px_rgba(116,192,252,0.6)]" />
                  <p className="truncate text-xs" style={{ color: 'var(--text-muted)' }}>Yönetici</p>

                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Logout icon */}
          {!collapsed && (
            <motion.button
              whileHover={{ scale: 1.2, rotate: 8 }}
              whileTap={{ scale: 0.9 }}
              className="p-1.5 rounded-md text-white/70 hover:text-red-400 hover:bg-red-500/10 transition-colors"

            >
              <LogOut className="h-4 w-4" />
            </motion.button>
          )}
        </div>
      </div>
    </motion.aside>
  );
};
