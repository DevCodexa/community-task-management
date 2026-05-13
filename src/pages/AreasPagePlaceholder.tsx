import React from 'react';

export const AreasPagePlaceholder: React.FC = () => {
  return (
    <div className="relative mx-auto max-w-4xl px-4 py-10">
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
        <h1 className="font-display text-2xl font-bold tracking-tight text-silver-100">
          Alanlar
        </h1>
        <p className="mt-2 text-sm text-silver-600">
          Bu sayfa geçici şablondur. DepartmentsPage üzerinden bölüme tıkladığınızda gösterilecek.
        </p>
      </div>
    </div>
  );
};

