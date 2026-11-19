import React from 'react';

import Icon from '../Icons';
import { useSportsGround } from '../../providers/SportsGroundProvider';
import { formatPrice, summarizeOpeningHours, summarizePeak } from '../../utils/openingHours';

// Souhrn otevírací doby a ceníku (obrazovka 5.3).
export default function SettingsSummary() {
  const { openingHours, priceList } = useSportsGround();

  return (
    <section className="sports-ground-summary">
      <div className="sports-ground-summary-item">
        <span className="sports-ground-summary-label">Otevírací doba</span>
        <strong>{summarizeOpeningHours(openingHours)}</strong>
      </div>

      <div className="sports-ground-summary-item">
        <span className="sports-ground-summary-label">Běžná cena</span>
        <strong>{formatPrice(priceList.regularPrice)} / hod</strong>
      </div>

      <div className="sports-ground-summary-item">
        <span className="sports-ground-summary-label">Špička</span>
        <strong>{summarizePeak(priceList)}</strong>
      </div>

      {/* Vede na formulář 5.2, který zatím neexistuje. */}
      <button type="button" className="sports-ground-btn-ghost">
        <Icon name="edit" size={20} />
        Upravit
      </button>
    </section>
  );
}
