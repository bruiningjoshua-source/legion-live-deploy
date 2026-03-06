import React, { useRef, useEffect } from 'react';

const CATEGORIES = [
  { value: 'all', label: 'All' },
  { value: 'gaming', label: 'Gaming' },
  { value: 'music', label: 'Music' },
  { value: 'entertainment', label: 'Entertainment' },
  { value: 'education', label: 'Education' },
  { value: 'howto', label: 'How-to' },
  { value: 'sports', label: 'Sports' },
  { value: 'comedy', label: 'Comedy' },
  { value: 'tech', label: 'Tech' },
  { value: 'travel', label: 'Travel' },
  { value: 'food', label: 'Food' },
  { value: 'fitness', label: 'Fitness' },
  { value: 'vlogs', label: 'Vlogs' },
  { value: 'live', label: 'Live' },
  { value: 'shorts', label: 'Shorts' },
  { value: 'recently_uploaded', label: 'New to you' },
];

export default function CategoryChips({ selected, onChange }) {
  const scrollRef = useRef(null);
  const activeRef = useRef(null);

  useEffect(() => {
    if (activeRef.current && scrollRef.current) {
      activeRef.current.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }
  }, [selected]);

  return (
    <div className="sticky top-[64px] z-20 bg-stone-950/95 backdrop-blur-md border-b border-white/5 -mx-4 px-4 py-2.5">
      <div ref={scrollRef} className="flex gap-2 overflow-x-auto scrollbar-hide">
        {CATEGORIES.map(cat => (
          <button
            key={cat.value}
            ref={selected === cat.value ? activeRef : null}
            onClick={() => onChange(cat.value)}
            className={`px-3 py-1.5 rounded-lg text-sm whitespace-nowrap transition-all ${
              selected === cat.value
                ? 'bg-white text-stone-900 font-medium'
                : 'bg-stone-800 text-stone-300 hover:bg-stone-700'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>
    </div>
  );
}