import React, { useState, useRef, useEffect } from 'react';
import { X, ChevronDown, Search } from 'lucide-react';

interface Option {
  id: string;
  name: string;
}

interface MultiSelectInputProps {
  options: Option[];
  selectedIds: string[];
  onChange: (selectedIds: string[]) => void;
  placeholder?: string;
  label?: string;
  className?: string;
}

export const MultiSelectInput: React.FC<MultiSelectInputProps> = ({
  options,
  selectedIds,
  onChange,
  placeholder = 'Seçenek ara...',
  label,
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearch('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOptions = options.filter(opt => selectedIds.includes(opt.id));
  const availableOptions = options.filter(opt => !selectedIds.includes(opt.id));
  
  const filteredOptions = availableOptions.filter(opt =>
    opt.name.toLowerCase().includes(search.toLowerCase())
  );

  const removeSelected = (id: string) => {
    onChange(selectedIds.filter(sId => sId !== id));
  };

  const toggleOption = (id: string) => {
    onChange([...selectedIds, id]);
    setSearch('');
  };

  const chips = selectedIds.length > 0 && (
    <div className="flex flex-wrap gap-2 mb-3 p-1">
      {selectedOptions.map(option => (
        <div
          key={option.id}
          className="inline-flex items-center gap-1 px-3 py-1.5 bg-white/10 backdrop-blur-sm rounded-full text-sm font-medium text-silver-100 border border-white/20 hover:bg-white/20 transition-all group"
        >
          {option.name}
          <button
            type="button"
            onClick={() => removeSelected(option.id)}
            className="ml-1 p-0.5 -mr-1 rounded-full text-silver-400 hover:text-silver-200 hover:bg-white/20 group-hover:bg-white/30 transition-all"
            aria-label={`Remove ${option.name}`}
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      ))}
    </div>
  );

  return (
    <div className={`space-y-2 ${className}`} ref={dropdownRef}>
      {label && (
        <label className="block text-sm font-semibold text-silver-300">
          {label} ({selectedIds.length} seçildi)
        </label>
      )}
      
      <div className="relative">
        {/* Chips */}
        {chips}

        {/* Input / Dropdown Trigger */}
        <div
          className={`relative w-full px-4 py-3 pr-10 rounded-xl bg-white/5 border border-white/20 text-silver-100 placeholder-silver-600 focus-within:ring-2 focus-within:ring-ice-500/30 focus-within:border-white/50 transition-all cursor-pointer hover:bg-white/10 ${
            selectedIds.length === 0 ? 'text-silver-500' : ''
          }`}
          onClick={() => setIsOpen(!isOpen)}
        >
          {selectedIds.length === 0 ? (
            <span className="flex items-center gap-2 text-silver-500">
              <Search className="h-4 w-4" />
              {placeholder}
            </span>
          ) : (
            <span className="truncate">
              {selectedOptions.length} seçili, {availableOptions.length} mevcut
            </span>
          )}
          <ChevronDown className={`h-4 w-4 ml-auto transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </div>

        {/* Dropdown */}
        {isOpen && filteredOptions.length > 0 && (
          <div className="absolute z-20 w-full mt-1 bg-white/5 backdrop-blur-sm border border-white/20 rounded-2xl shadow-2xl max-h-60 overflow-auto">
            {/* Search Input */}
            <div className="p-3 border-b border-white/10 sticky top-0 bg-white/10 backdrop-blur-sm">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-silver-500" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/20 rounded-xl text-silver-100 placeholder-silver-600 focus:ring-2 focus:ring-ice-500/50 focus:border-white/50 transition-all"
                  placeholder="Konuşmacı ara..."
                />
              </div>
            </div>

            {/* Options List */}
            <div className="p-2 max-h-48 overflow-y-auto">
              {filteredOptions.map(option => (
                <div
                  key={option.id}
                  className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/10 cursor-pointer transition-all group"
                  onClick={() => toggleOption(option.id)}
                >
                  {option.name}
                  <div className="ml-auto text-xs text-silver-500 group-hover:text-silver-300">
                    Ekle
                  </div>
                </div>
              ))}
              {filteredOptions.length === 0 && (
                <div className="px-4 py-8 text-center text-sm text-silver-500">
                  Eşleşen seçenek bulunamadı
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

