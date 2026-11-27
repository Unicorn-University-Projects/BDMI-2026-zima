import React from 'react';
import { Link } from 'react-router-dom';

import iconTime from '../../assets/icon-time.svg';
import { useSportsGround } from '../../providers/SportsGroundProvider';

// Výzva pro sportoviště bez otevírací doby a ceníku (obrazovka 5.1).
export default function SetupCallout() {
  const { sportsGround, pricingUrl } = useSportsGround();

  return (
    <section className="sports-ground-callout">
      <span className="sports-ground-callout-icon">
        <img src={iconTime} alt="" width="22" height="22" />
      </span>

      <div className="sports-ground-callout-text">
        <strong>{sportsGround.name} se zatím sportovcům nenabízí</strong>
        <p>Nastav otevírací dobu a ceník – pak se objeví ve vyhledávání.</p>
      </div>

      <Link to={pricingUrl} className="sports-ground-btn-primary">
        Nastavit otevírací dobu a ceník
      </Link>
    </section>
  );
}
