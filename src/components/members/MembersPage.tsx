import React, { useState, useEffect, useMemo } from 'react';
import {
  Search,
  UserPlus,
  Loader2,
  AlertCircle,
  Trash2,
  AlertTriangle,
} from 'lucide-react';
import { MemberTable } from './MemberTable';
import { MemberModal } from './MemberModal';
import { FullMember } from '../../types/member';
import {
  getMembers,
  deleteMember,
} from '../../lib/supabaseMembers';

export const MembersPage: React.FC = () => {
  const [members, setMembers] = useState<FullMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<FullMember | null>(null);

const [deleteConfirm, setDeleteConfirm] = useState<{
    open: boolean;
    member: FullMember | null;
  }>({ open: false, member: null });

  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState<FullMember | null>(null);

  const fetchMembers = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await getMembers();
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

  const filteredMembers = useMemo(() => {
    if (!searchQuery.trim()) return members;
    const q = searchQuery.toLowerCase();
    return members.filter((m) =>
      m.name.toLowerCase().includes(q) ||
      m.email.toLowerCase().includes(q) ||
      m.company.toLowerCase().includes(q) ||
      m.comm_title.toLowerCase().includes(q)
    );
  }, [members, searchQuery]);

  const handleEdit = (member: FullMember) => {
    setEditingMember(member);
    setIsFormOpen(true);
  };

  const handleAdd = () => {
    setEditingMember(null);
    setIsFormOpen(true);
  };

  const handleFormSuccess = () => {
    fetchMembers();
  };

  const handleDetail = (member: FullMember) => {
    setShowDetailModal(true);
    setSelectedMember(member);
  };

  const onCloseDetail = () => {
    setShowDetailModal(false);
    setSelectedMember(null);
  };

  const promptDelete = (id: string) => {
    const member = members.find((m) => m.id === id);
    if (member) {
      setDeleteConfirm({ open: true, member });
    }
  };

  const confirmDelete = async () => {
    if (!deleteConfirm.member) return;
    try {
      await deleteMember(deleteConfirm.member.id);
      setDeleteConfirm({ open: false, member: null });
      fetchMembers();
    } catch (err: any) {
      setError(err.message || 'Silme işlemi başarısız oldu.');
      setDeleteConfirm({ open: false, member: null });
    }
  };

  return (
    <div className="relative mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="font-display text-2xl font-bold tracking-tight text-silver-100 sm:text-3xl">
              Üye Yönetimi
            </h1>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-ice-500/10 text-ice-400 border border-ice-500/20">
              {members.length} üye
            </span>
          </div>
          <p className="mt-1 text-sm text-silver-600">
            Topluluk üyelerini görüntüleyin, düzenleyin ve yönetin
          </p>
        </div>
        <button
          onClick={handleAdd}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium bg-ice-500/10 text-ice-400 border border-ice-500/20 hover:bg-ice-500/20 hover:text-ice-300 transition-all shrink-0"
        >
          <UserPlus className="h-4 w-4" />
          Yeni Üye
        </button>
      </div>

      {/* Search */}
      <div className="mb-6 relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-silver-600" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="İsim, e-posta, şirket veya ünvan ara..."
          className="w-full sm:max-w-md pl-10 pr-4 py-2.5 rounded-lg bg-white/[0.03] border border-white/10 text-silver-100 text-sm placeholder:text-silver-700 focus:outline-none focus:border-ice-500/50 focus:ring-1 focus:ring-ice-500/20 transition-all"
        />
      </div>

      {/* Error Banner */}
      {error && (
        <div className="mb-6 p-4 rounded-lg bg-red-500/10 border border-red-500/20 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-red-400">Bir hata oluştu</p>
            <p className="text-xs text-red-300/80 mt-0.5">{error}</p>
          </div>
          <button
            onClick={() => setError(null)}
            className="text-xs text-red-400 hover:text-red-300 underline"
          >
            Kapat
          </button>
        </div>
      )}

      {/* Table Card */}
      <div className="glass-card rounded-2xl p-1">
        {loading ? (
          <div className="py-16 flex flex-col items-center justify-center">
            <Loader2 className="h-8 w-8 text-silver-600 animate-spin mb-3" />
            <p className="text-sm text-silver-500">Üyeler yükleniyor...</p>
          </div>
        ) : (
          <MemberTable
            members={filteredMembers}
            onEdit={handleEdit}
            onDelete={promptDelete}
            onDetail={handleDetail}
          />
        )}
      </div>

      {/* Create / Edit Modal */}
      <MemberModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        member={editingMember}
        onSuccess={handleFormSuccess}
      />

      {/* Delete Confirmation Dialog */}
      {deleteConfirm.open && deleteConfirm.member && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-xl"
            onClick={() => setDeleteConfirm({ open: false, member: null })}
          />
          <div className="relative w-full max-w-sm rounded-2xl border border-white/10 bg-coal-800/90 shadow-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-red-500/10">
                <Trash2 className="h-5 w-5 text-red-400" />
              </div>
              <h3 className="text-lg font-bold text-silver-100">Üyeyi Sil</h3>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-lg bg-red-500/10 border border-red-500/20 mb-6">
              <AlertTriangle className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
              <p className="text-sm text-red-300/90">
                <strong className="text-red-400">{deleteConfirm.member.name}</strong>{' '}
                isimli üyeyi silmek istediğinize emin misiniz? Bu işlem geri alınamaz.
              </p>
            </div>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setDeleteConfirm({ open: false, member: null })}
                className="px-4 py-2.5 rounded-lg text-sm font-medium text-silver-400 hover:text-silver-200 hover:bg-white/[0.05] transition-colors"
              >
                İptal
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2.5 rounded-lg text-sm font-medium bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 hover:text-red-300 transition-all"
              >
                Evet, Sil
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      <DetailModal
        isOpen={showDetailModal}
        onClose={onCloseDetail}
        member={selectedMember}
      />
    </div>
  );
};

import { DetailModal } from './DetailModal';
