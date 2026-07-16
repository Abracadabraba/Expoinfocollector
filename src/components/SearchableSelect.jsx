import React, { useEffect, useRef, useState } from 'react';

// options: [{ value, label, sublabel? }]
export default function SearchableSelect({ options, value, onChange, placeholder }) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  const selected = options.find((o) => o.value === value);

  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
        setQuery('');
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, []);

  const filtered = query
    ? options.filter(
        (o) =>
          o.label.toLowerCase().includes(query.toLowerCase()) ||
          (o.sublabel && o.sublabel.toLowerCase().includes(query.toLowerCase()))
      )
    : options;

  return (
    <div className="searchable-select" ref={containerRef}>
      <input
        type="text"
        value={open ? query : selected?.label || ''}
        placeholder={placeholder || '点击选择 / Tap to select...'}
        onFocus={() => {
          setOpen(true);
          setQuery('');
        }}
        onChange={(e) => setQuery(e.target.value)}
      />
      {open && (
        <div className="searchable-select-list">
          {filtered.length === 0 && <div className="searchable-select-empty">无匹配结果</div>}
          {filtered.map((o) => (
            <div
              key={o.value}
              className={'searchable-select-item' + (o.value === value ? ' active' : '')}
              onMouseDown={(e) => {
                e.preventDefault();
                onChange(o.value);
                setOpen(false);
                setQuery('');
              }}
            >
              {o.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
