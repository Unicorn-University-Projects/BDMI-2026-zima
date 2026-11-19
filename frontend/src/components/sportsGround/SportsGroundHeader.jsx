import React from 'react';

import Icon from '../Icons';
import { useSportsGround } from '../../providers/SportsGroundProvider';

// Název sportoviště, stav nabízení a vstup do úpravy.
export default function SportsGroundHeader({ onEdit }) {
  const { sportsGround, isActive } = useSportsGround();

  return (
    <div className="sports-ground-header">
      <div className="sports-ground-title">
        <h1>{sportsGround.name}</h1>

        <span className={`sports-ground-badge ${isActive ? 'active' : 'inactive'}`}>
          <span className="sports-ground-badge-dot" />
          {isActive ? 'Nabízí se' : 'Nenabízí se'}
        </span>
      </div>

      <button type="button" className="sports-ground-btn-outline" onClick={onEdit}>
        <Icon name="edit" size={20} />
        Upravit sportoviště
      </button>
    </div>
  );
}
