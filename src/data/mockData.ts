export interface KPIData {
  totalMembers: number;
  totalSpeakers: number;
  totalEvents: number;
  completionRate: number;
}

export interface TaskDistribution {
  name: string;
  value: number;
  color: string;
}

export interface Member {
  id: string;
  name: string;
  avatar: string;
  role: 'Üye' | 'Konuşmacı';
  birth_day: number;
  birth_month: number;
  joinDate: string;
}

export interface RecentTask {
  id: string;
  name: string;
  assigneeAvatar: string;
  assigneeName: string;
  completedAt: string;
}

export const kpiData: KPIData = {
  totalMembers: 1248,
  totalSpeakers: 86,
  totalEvents: 42,
  completionRate: 78.5,
};

export const taskDistributionData: TaskDistribution[] = [
  { name: 'Bekleyen Görevler', value: 124, color: '#4dabf7' },
  { name: 'Tamamlanan Görevler', value: 342, color: '#40c057' },
  { name: 'Devam Edenler', value: 89, color: '#fd7e14' },
  { name: 'Başlanan/Zincir Bekleyenler', value: 67, color: '#6c757d' },
];

export const recentMembers: Member[] = [
  {
    id: '1',
    name: 'Ali Yılmaz',
    avatar: 'https://i.pravatar.cc/150?u=1',
    role: 'Üye',
    birth_day: 15,
    birth_month: 3,
    joinDate: '2024-01-20',
  },
  {
    id: '2',
    name: 'Zeynep Kaya',
    avatar: 'https://i.pravatar.cc/150?u=2',
    role: 'Konuşmacı',
    birth_day: 22,
    birth_month: 7,
    joinDate: '2024-01-18',
  },
  {
    id: '3',
    name: 'Mehmet Demir',
    avatar: 'https://i.pravatar.cc/150?u=3',
    role: 'Üye',
    birth_day: 8,
    birth_month: 11,
    joinDate: '2024-01-15',
  },
  {
    id: '4',
    name: 'Elif Şahin',
    avatar: 'https://i.pravatar.cc/150?u=4',
    role: 'Konuşmacı',
    birth_day: 3,
    birth_month: 5,
    joinDate: '2024-01-12',
  },
  {
    id: '5',
    name: 'Burak Özdemir',
    avatar: 'https://i.pravatar.cc/150?u=5',
    role: 'Üye',
    birth_day: 19,
    birth_month: 9,
    joinDate: '2024-01-10',
  },
];

export const recentTasks: RecentTask[] = [
  {
    id: '1',
    name: 'Podcast kayıt altyapısı kurulumu',
    assigneeAvatar: 'https://i.pravatar.cc/150?u=10',
    assigneeName: 'Cem Yılmaz',
    completedAt: '2024-01-22',
  },
  {
    id: '2',
    name: 'Topluluk kuralları dokümantasyonu',
    assigneeAvatar: 'https://i.pravatar.cc/150?u=11',
    assigneeName: 'Ayşe Doğan',
    completedAt: '2024-01-21',
  },
  {
    id: '3',
    name: 'Sosyal medya içerik takvimi',
    assigneeAvatar: 'https://i.pravatar.cc/150?u=12',
    assigneeName: 'Kerem Çelik',
    completedAt: '2024-01-20',
  },
  {
    id: '4',
    name: 'Mailchimp entegrasyonu',
    assigneeAvatar: 'https://i.pravatar.cc/150?u=13',
    assigneeName: 'Selin Aydın',
    completedAt: '2024-01-19',
  },
  {
    id: '5',
    name: 'Önümüzdeki etkinlik mekan araştırması',
    assigneeAvatar: 'https://i.pravatar.cc/150?u=14',
    assigneeName: 'Emre Can',
    completedAt: '2024-01-18',
  },
];

export const getTotalTasks = (): number => {
  return taskDistributionData.reduce((sum, item) => sum + item.value, 0);
};

