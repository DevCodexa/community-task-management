import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sidebar } from './Sidebar';
import { NotificationContainer } from '../notifications';
import { UserProfileButton } from './UserProfileButton';
import { useTheme } from '../../context/ThemeContext';
import { Moon, Sparkles, ChevronDown, Sun } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
}

const themeOptions = [
  { value: 'light', label: 'Açık', icon: Sun },
  { value: 'dark', label: 'Karanlık', icon: Moon },
  { value: 'blueMor', label: 'Mor', icon: Sparkles },
  { value: 'iceBlue', label: 'Buz Mavisi', icon: Sun },
] as const;

const ThemeSwitcher: React.FC = () => {
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentOption = themeOptions.find(opt => opt.value === theme);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={dropdownRef} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] px-3 py-2 text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors"
      >
        {currentOption && <currentOption.icon className="h-4 w-4" />}
        <span>{currentOption?.label}</span>
        <ChevronDown className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="absolute right-0 top-full mt-2 w-40 rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] p-1 shadow-xl z-50"
          >
            {themeOptions.map((option) => {
              const Icon = option.icon;
              return (
                <button
                  key={option.value}
                  onClick={() => {
                    setTheme(option.value);
                    setOpen(false);
                  }}
                  className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors ${
                    theme === option.value
                      ? 'bg-[var(--accent)] text-white'
                      : 'text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {option.label}
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: 'var(--bg-primary)' }}>
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />
      <div className="flex-1 relative overflow-hidden">
        <div className="fixed inset-0 mesh-gradient pointer-events-none" />
        
{/* Top Header Bar */}
        <div className="relative flex h-16 items-center justify-end gap-4 border-b px-6" style={{ borderColor: 'var(--border-color)' }}>
          {/* Theme Switcher */}
          <ThemeSwitcher />
          
          {/* Notification Bell */}
          <NotificationContainer />

          {/* User Profile */}
          <UserProfileButton />
        </div>
        
        <div className="relative h-full overflow-auto">
          {children}
        </div>
      </div>
    </div>
  );
};
