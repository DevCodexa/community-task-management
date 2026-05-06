import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Cake, Calendar, Loader2, Gift } from 'lucide-react';
import { CustomConfetti } from '../components/ui/Confetti';
import { BirthdayCard } from '../components/birthdays/BirthdayCard';
import { FullMember } from '../types/member';
import { getMembers } from '../lib/supabaseMembers';

type TabType = 'all' | 'month' | 'today';

const MONTHS = [
  'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
];

export const BirthdaysPage: React.FC = () => {
  const [members, setMembers] = useState<FullMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('today');

  // Get current date info
  const today = new Date();
  const currentDay = today.getDate();
  const currentMonth = today.getMonth() + 1;

  // Fetch members
  const fetchMembers = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await getMembers({ limit: 100 });
      setMembers(response.data);
    } catch (err: any) {
      setError(err.message || 'Üyeler yüklenirken bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, []);

  // Filter members for each tab
  const { allBirthdays, thisMonthBirthdays, todayBirthdays } = useMemo(() => {
    const sorted = [...members].sort((a, b) => {
      // Sort by month, then by day
      if (a.birth_month !== b.birth_month) {
        return a.birth_month - b.birth_month;
      }
      return a.birth_day - b.birth_day;
    });

    const month = members.filter(m => m.birth_month === currentMonth);
    const today = members.filter(m => 
      m.birth_month === currentMonth && m.birth_day === currentDay
    );

    return {
      allBirthdays: sorted,
      thisMonthBirthdays: month,
      todayBirthdays: today
    };
  }, [members, currentDay, currentMonth]);

  // Get current tab data
  const getCurrentTabData = () => {
    switch (activeTab) {
      case 'month':
        return thisMonthBirthdays;
      case 'today':
        return todayBirthdays;
      default:
        return allBirthdays;
    }
  };

  const currentMembers = getCurrentTabData();
  const monthName = MONTHS[currentMonth - 1];

  // Tabs configuration
  const tabs = [
    { 
      id: 'today' as TabType, 
      label: 'Bugün Doğanlar', 
      icon: Gift,
      count: todayBirthdays.length,
      highlight: todayBirthdays.length > 0
    },
    { 
      id: 'month' as TabType, 
      label: `Bu Ay Doğanlar`, 
      icon: Calendar,
      count: thisMonthBirthdays.length
    },
    { 
      id: 'all' as TabType, 
      label: 'Tüm Doğum Günleri', 
      icon: Cake,
      count: allBirthdays.length
    },
  ];

  const hasBirthdaysToday = todayBirthdays.length > 0;

  return (
    <div className="relative mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
{/* Confetti for today's birthdays */}
      {hasBirthdaysToday && (
        <CustomConfetti active={hasBirthdaysToday} pieceCount={100} />
      )}

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3">
          <h1 className="font-display text-2xl font-bold tracking-tight text-silver-100 sm:text-3xl">
            Doğum Günleri
          </h1>
          {hasBirthdaysToday && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-gradient-to-r from-ice-500 to-purple-500 text-white shadow-lg shadow-ice-500/30 animate-pulse">
              <Gift className="h-4 w-4" />
              Bugün Doğum Günü!
            </span>
          )}
        </div>
        <p className="mt-1 text-sm text-silver-600">
          Topluluk üyelerinin doğum günlerini görüntüleyin
        </p>
      </div>

      {/* Today's Birthday Message Banner */}
      <AnimatePresence>
        {hasBirthdaysToday && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="mb-6 relative overflow-hidden rounded-2xl bg-gradient-to-r from-ice-500/20 via-purple-500/20 to-ice-500/20 border border-ice-500/30 p-6"
          >
            {/* Animated background particles */}
            <div className="absolute inset-0 overflow-hidden">
              {[...Array(20)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute h-2 w-2 rounded-full"
                  style={{
                    backgroundColor: ['#74C0FC', '#E879F9', '#FFD43B'][i % 3],
                    left: `${Math.random() * 100}%`,
                    top: `${Math.random() * 100}%`,
                  }}
                  animate={{
                    y: [0, -100],
                    opacity: [1, 0],
                    x: [0, Math.random() * 50 - 25],
                  }}
                  transition={{
                    duration: 2 + Math.random() * 2,
                    repeat: Infinity,
                    delay: Math.random() * 2,
                  }}
                />
              ))}
            </div>
            
            <div className="relative z-10 text-center">
              <motion.h2 
                className="font-display text-2xl font-bold text-white mb-2"
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 15 }}
              >
                🎉 Yaşamayı Kutlayın! 🎉
              </motion.h2>
              <p className="text-lg text-ice-200 mb-3">
                Bugün doğum günü olan {todayBirthdays.length} üyemizi kutluyoruz! 
                {todayBirthdays.map(m => m.name).join(', ')} 
                {' '} - Doğum gününüz kutlu olsun! 🎂🎁
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                {todayBirthdays.map((member, index) => (
                  <motion.span
                    key={member.id}
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.1 + 0.3 }}
                    className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-white/20 text-white font-medium"
                  >
                    <span>🎂</span>
                    {member.name}
                  </motion.span>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tabs */}
      <div className="mb-6 flex flex-wrap gap-2 border-b border-white/10 pb-4">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`relative flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? 'bg-ice-500/20 text-ice-300 border border-ice-500/30'
                  : 'text-silver-500 hover:text-silver-300 hover:bg-white/[0.03] border border-transparent'
              } ${tab.highlight ? 'animate-pulse' : ''}`}
            >
              <Icon className={`h-4 w-4 ${tab.highlight ? 'text-ice-400' : ''}`} />
              <span>{tab.label}</span>
              <span className={`ml-1 rounded-full px-2 py-0.5 text-xs ${
                isActive 
                  ? 'bg-ice-500/30 text-ice-300' 
                  : 'bg-white/10 text-silver-500'
              }`}>
                {tab.count}
              </span>
              
              {/* Active indicator */}
              {isActive && (
                <motion.div
                  layoutId="birthdayTabIndicator"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-ice-400 to-purple-400 rounded-full"
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        {loading ? (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="py-16 flex flex-col items-center justify-center"
          >
            <Loader2 className="h-8 w-8 text-silver-600 animate-spin mb-3" />
            <p className="text-sm text-silver-500">Doğum günleri yükleniyor...</p>
          </motion.div>
        ) : error ? (
          <motion.div
            key="error"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="py-16 text-center"
          >
            <p className="text-red-400 mb-2">Bir hata oluştu</p>
            <p className="text-sm text-silver-500">{error}</p>
          </motion.div>
        ) : currentMembers.length === 0 ? (
          <motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="py-16 text-center"
          >
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white/5">
              <Cake className="h-8 w-8 text-silver-600" />
            </div>
            <p className="text-lg font-medium text-silver-400 mb-1">
              {activeTab === 'today' 
                ? 'Bugün doğum günü olan kimse yok' 
                : activeTab === 'month' 
                  ? `Bu ay (${monthName}) doğan kimse yok`
                  : 'Doğum günü kayıtlı üye yok'
              }
            </p>
            <p className="text-sm text-silver-500">
              {activeTab === 'today' 
                ? 'Diğer günlerde doğum günleri olabilir!' 
                : 'Üyelerin doğum günlerini ekleyebilirsiniz'
              }
            </p>
          </motion.div>
        ) : (
          <motion.div
            key="content"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
          >
            {currentMembers.map((member, index) => (
              <motion.div
                key={member.id}
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ delay: index * 0.05 }}
              >
                <BirthdayCard 
                  member={member} 
                  isToday={
                    member.birth_month === currentMonth && 
                    member.birth_day === currentDay
                  }
                />
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tab-specific helper text */}
      {!loading && !error && currentMembers.length > 0 && (
        <div className="mt-6 text-center text-sm text-silver-600">
          {activeTab === 'all' && (
            <p>Toplam {allBirthdays.length} üyenin doğum günü kayıtlı</p>
          )}
          {activeTab === 'month' && (
            <p>{monthName} ayında {thisMonthBirthdays.length} üyenin doğum günü var</p>
          )}
          {activeTab === 'today' && (
            <p>Bugün {todayBirthdays.length} üyenin doğum günü!</p>
          )}
        </div>
      )}
    </div>
  );
};
