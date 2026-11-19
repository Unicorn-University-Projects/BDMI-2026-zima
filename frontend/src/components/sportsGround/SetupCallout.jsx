import React from 'react';

import iconTime from '../../assets/icon-time.svg';
import { useSportsGround } from '../../providers/SportsGroundProvider';

// Výzva pro sportoviště bez otevírací doby a ceníku (obrazovka 5.1).
export default function SetupCallout() {
  const { sportsGround } = useSportsGround();

  return (
    <section className="sports-ground-callout">
      <span className="sports-ground-callout-icon">
        <img src={iconTime} alt="" width="22" height="22" />
      </span>

      <div className="sports-ground-callout-text">
        <strong>{sportsGround.name} se zatím sportovcům nenabízí</strong>
        <p>Nastav otevírací dobu a ceník – pak se objeví ve vyhledávání.</p>
      </div>

      {/* Formulář otevírací doby a ceníku (5.2) zatím neexistuje,
          tlačítko je proto bez akce. */}
      <button type="button" className="sports-ground-btn-primary">
        Nastavit otevírací dobu a ceník
      </button>
    </section>
  );
}
