import React, { useEffect, useRef, useState } from 'react';

import Calendar from './Calendar';
import Icon from '../Icons';
import { formatPickerLabel } from '../../utils/searchParams';

// ==========================================
// POLE S DATEM
// ==========================================
//
// Vypadá jako ostatní pole formuláře, po kliknutí rozbalí kalendář.
// Zavře se výběrem dne, klávesou Escape nebo kliknutím mimo.

export default function DateField({ id, label, value, onChange }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    function handleOutside(event) {
      if (wrapRef.current && !wrapRef.current.contains(event.target)) {
        setOpen(false);
      }
    }

    function handleKey(event) {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    }

    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('keydown', handleKey);
    };
  }, [open]);

  return (
    <div className="search-field" ref={wrapRef}>
      <label htmlFor={id}>
        {label} <span className="required">*</span>
      </label>

      <div className="date-field">
        <button
          type="button"
          id={id}
          className="search-input date-field-trigger"
          onClick={() => setOpen(previous => !previous)}
          aria-haspopup="dialog"
          aria-expanded={open}
        >
          <Icon name="calendar" size={20} />
          <span className="date-field-value">{formatPickerLabel(value)}</span>
          <Icon name="chevronDown" size={20} />
        </button>

        {open && (
          <div className="date-field-popover" role="dialog" aria-label="Výběr data">
            <Calendar
              value={value}
              onSelect={iso => {
                onChange(iso);
                setOpen(false);
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}