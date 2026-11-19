import React from 'react';

import Icon from '../Icons';
import { SORT_OPTIONS } from '../../utils/sportOptions';
import { formatFoundCount } from '../../utils/searchParams';

// ==========================================
// LIŠTA NAD VÝSLEDKY (1.2)
// ==========================================

export default function ResultsToolbar({ total, sort, onSortChange }) {
  const [verb, ...rest] = formatFoundCount(total).split(' ');

  return (
    <div className="search-toolbar">
      <p className="search-count">
        {verb} <strong>{rest[0]}</strong> {rest.slice(1).join(' ')} s volným termínem
      </p>

      <label className="search-sort">
        Řadit:
        <span className="search-input">
          <select
            value={sort}
            onChange={event => onSortChange(event.target.value)}
            aria-label="Řazení výsledků"
          >
            {SORT_OPTIONS.map(option => (
              <option key={option.code} value={option.code}>{option.name}</option>
            ))}
          </select>
          <Icon name="chevronDown" size={16} />
        </span>
      </label>
    </div>
  );
}