import React from 'react';

/**
 * CharCount — reusable character count indicator for admin form fields.
 *
 * Usage:
 *   <CharCount current={value.length} min={5} max={60} />
 *
 * Props:
 *   current  {number}  — current character count
 *   min      {number}  — minimum required characters (optional)
 *   max      {number}  — maximum allowed characters
 *   label    {string}  — optional label text (default: "characters")
 */
const CharCount = ({ current = 0, min = 0, max, label = 'characters' }) => {
  if (!max) return null;

  const pct = current / max;
  const tooShort = min > 0 && current > 0 && current < min;
  const atLimit = current >= max;
  const nearLimit = !atLimit && pct >= 0.8;

  const color = atLimit ? '#dc2626' : nearLimit ? '#d97706' : tooShort ? '#d97706' : '#6b7280';
  const bgColor = atLimit ? '#fef2f2' : nearLimit ? '#fffbeb' : 'transparent';

  return (
    <div
      className="char-count-hint"
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: '4px',
        fontSize: '11.5px',
        fontFamily: "'Poppins', sans-serif",
        color,
        background: bgColor,
        borderRadius: '4px',
        padding: bgColor !== 'transparent' ? '2px 6px' : '0',
        transition: 'color 0.2s, background 0.2s',
        lineHeight: 1.4,
      }}
    >
      <span>
        {min > 0 && (
          <span style={{ marginRight: 6, opacity: 0.75 }}>
            Min {min}
          </span>
        )}
      </span>
      <span style={{ fontWeight: 600 }}>
        {current} / {max} {label}
        {atLimit && <span style={{ marginLeft: 5 }}>⚠ Limit reached</span>}
        {tooShort && <span style={{ marginLeft: 5, opacity: 0.8 }}>(need {min - current} more)</span>}
      </span>
    </div>
  );
};

export default CharCount;
