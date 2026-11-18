import React from 'react';

import Icon from '../Icons';
import { formatPrice } from '../../utils/openingHours';

// ==========================================
// KARTA SPORTOVIŠTĚ VE VÝSLEDCÍCH (1.2)
// ==========================================
//
// Karta je zatím bez prokliku – detail sportoviště pro sportovce
// (obrazovka 1.3) je samostatné zadání.

export default function SportsGroundResultCard({ item }) {
  const address = [
    [item.venue?.street, item.venue?.streetNumber].filter(Boolean).join(' '),
    item.venue?.cityPart || item.venue?.city
  ]
    .filter(Boolean)
    .join(', ');

  const average = item.rating?.average?.toLocaleString('cs-CZ', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1
  });

  return (
    <li className="search-result-card">

      {/* Fotky backend neumí, proto zástupná plocha */}
      <div className="search-result-photo">
        <Icon name="image" size={32} />
      </div>

      <div className="search-result-info">
        <h3>{item.name}</h3>

        <span className="search-result-venue">{item.venue?.name}</span>
        <span className="search-result-address">{address}</span>

        <div className="search-result-footer">
          <span className="search-result-price">
            od {formatPrice(item.regularPrice)}/h
          </span>

          {item.rating && (
            <span className="search-result-rating">
              <Icon name="star" size={15} fill="currentColor" />
              {average}
              <span>({item.rating.count})</span>
            </span>
          )}
        </div>
      </div>

    </li>
  );
}