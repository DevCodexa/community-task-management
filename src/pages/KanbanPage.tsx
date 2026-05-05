import React from 'react';
import { KanbanBoard } from '../components/kanban/KanbanBoard';

export const KanbanPage: React.FC = () => {
  return (
    <div className="relative mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold tracking-tight text-silver-100">
          Görev Zinciri - Kanban
        </h1>
        <p className="mt-2 text-xl text-silver-500">
          Sürükle-bırak ile görev durumunu güncelleyin
        </p>
      </div>
      <KanbanBoard />
    </div>
  );
};

