import React, { useState, useEffect } from 'react';
import { Users, Calendar, TrendingUp, ListTodo } from 'lucide-react';
import { 
  getDashboardStats, 
  getTaskDistribution, 
  getLatestCompletedTasks,
  TaskDistributionItem,
  CompletedTask 
} from '../lib/supabaseTasks';
import { Mic } from 'lucide-react';

import { getRecentMembers, RecentMember } from '../lib/supabaseMembers';
import { getRecentSpeakers, RecentSpeaker } from '../lib/supabaseSpeakers';
import { KPICard } from './dashboard/KPICard';
import { TaskDonutChart } from './dashboard/TaskDonutChart';
import { RecentMembersTable } from './dashboard/RecentMembersTable';
import { RecentSpeakersTable } from './dashboard/RecentSpeakersTable';
import { RecentTasksTable } from './dashboard/RecentTasksTable';

interface DashboardStats {
  totalMembers: number;
  completionRate: number;
  totalEvents: number;
  totalTasks: number;
  totalSpeakers: number;
}


export const Dashboard: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [taskDistribution, setTaskDistribution] = useState<TaskDistributionItem[]>([]);
  const [recentMembers, setRecentMembers] = useState<RecentMember[]>([]);
  const [recentSpeakers, setRecentSpeakers] = useState<RecentSpeaker[]>([]);
  const [recentTasks, setRecentTasks] = useState<CompletedTask[]>([]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        const [statsData, distributionData, membersData, speakersData, tasksData] = await Promise.all([
          getDashboardStats(),
          getTaskDistribution(),
          getRecentMembers(5),
          getRecentSpeakers(5),
          getLatestCompletedTasks(5)
        ]);
        
        setStats(statsData);
        setTaskDistribution(distributionData);
        setRecentMembers(membersData);
        setRecentSpeakers(speakersData);
        setRecentTasks(tasksData);
      } catch (error) {
        console.error('Dashboard veri çekme hatası:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const formatNumber = (num: number) => num.toLocaleString('tr-TR');

  if (loading) {
    return (
      <div className="relative mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header Skeleton */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <div className="h-9 w-48 animate-pulse rounded-lg bg-coal-700/50" />
            <div className="mt-2 h-5 w-64 animate-pulse rounded bg-coal-700/30" />
          </div>
        </div>

        {/* KPI Cards Skeleton */}
        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-32 animate-pulse rounded-2xl border border-wood-600/20 bg-wood-700/30" />
          ))}
        </div>


        {/* Chart Skeleton */}
        <div className="mb-8 h-96 animate-pulse rounded-2xl border border-wood-600/20 bg-wood-700/30" />

        {/* Tables Skeleton */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="h-64 animate-pulse rounded-2xl border border-wood-600/20 bg-wood-700/30" />
          <div className="h-64 animate-pulse rounded-2xl border border-wood-600/20 bg-wood-700/30" />
        </div>
      </div>
    );
  }

  return (
    <div className="relative mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold tracking--tight text-silver-100 sm:text-3xl">
            Dashboard
          </h1>
          <p className="mt-1 text-sm text-silver-600">
            Topluluk görev yönetimine genel bakış
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <KPICard

          title="Toplam Üye"
          value={formatNumber(stats?.totalMembers || 0)}
          icon={Users}
          gradient="from-emerald-400/10 to-emerald-500/5"
        />
        <KPICard
          title="Toplam Konuşmacı"
          value={formatNumber(stats?.totalSpeakers || 0)}
          icon={Mic}
          gradient="from-blue-400/10 to-blue-500/5"
        />
        <KPICard
          title="Toplam Etkinlik/Duyuru"
          value={formatNumber(stats?.totalEvents || 0)}
          icon={Calendar}
          gradient="from-pink-400/10 to-pink-500/5"
        />
        <KPICard
          title="Toplam Görev"
          value={formatNumber(stats?.totalTasks || 0)}
          icon={ListTodo}
          gradient="from-orange-400/10 to-orange-500/5"
        />
        <KPICard
          title="Görev Tamamlama Oranı"
          value={stats?.completionRate || 0}
          suffix="%"
          icon={TrendingUp}
          gradient="from-violet-400/10 to-violet-500/5"
        />

      </div>


      {/* Chart + Recent Tasks Side-by-Side */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 mb-8">
        <div>
          <TaskDonutChart data={taskDistribution} />
        </div>
        <RecentTasksTable tasks={recentTasks} />
      </div>

      {/* Recent Members + Speakers */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <RecentMembersTable members={recentMembers} />
        <RecentSpeakersTable speakers={recentSpeakers} />
      </div>
    </div>
  );
};
