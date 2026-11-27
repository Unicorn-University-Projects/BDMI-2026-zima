import React from 'react';
import { Link } from 'react-router-dom';

import playspotLogo from '../../assets/playspot-logo.png';
import Icon from '../Icons';
import { useCurrentUser } from '../../providers/CurrentUserProvider';

// ==========================================
// HORNÍ LIŠTA SPORTOVCE
// ==========================================
//
// Sportovec má podle návrhu horní lištu (provozovatel boční panel).
// Stejnou lištu bude mít i úvodní obrazovka, až se sjednotí s App.jsx.

export default function AthleteTopBar({ active = 'hledat' }) {
  const { initials, fullName } = useCurrentUser();

  return (
    <header className="athlete-topbar">
      <div className="athlete-topbar-left">
        <Link to="/hledat" className="athlete-topbar-logo">
          <img src={playspotLogo} alt="PLAY SPOT" />
        </Link>

        <nav className="athlete-topbar-tabs" aria-label="Hlavní navigace">
          <Link
            to="/hledat"
            className={`athlete-topbar-tab ${active === 'hledat' ? 'active' : ''}`}
          >
            Hledat
          </Link>

          <span
            className="athlete-topbar-tab disabled"
            title="Moje rezervace budou doplněny"
          >
            Moje rezervace
          </span>
        </nav>
      </div>

      <div className="athlete-topbar-right">
        <button
          type="button"
          className="athlete-topbar-bell"
          aria-label="Oznámení"
          title="Oznámení budou doplněna"
        >
          <Icon name="bell" size={20} />
        </button>

        <span className="athlete-topbar-avatar" title={fullName}>
          {initials}
        </span>
      </div>
    </header>
  );
}
