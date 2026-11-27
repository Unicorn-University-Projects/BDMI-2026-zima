import React from 'react';

import { useSportsGround } from '../../providers/SportsGroundProvider';
import { formatPreviewDate, formatPrice } from '../../utils/openingHours';

// Hodinové sloty tak, jak je uvidí sportovec (obrazovka 5.3).
export default function SlotPreview() {
  const { slots, previewDate } = useSportsGround();

  return (
    <section className="sports-ground-preview">
      <h2>Náhled pro sportovce · {formatPreviewDate(previewDate)}</h2>

      {slots.length === 0 ? (
        <p className="sports-ground-preview-empty">V nejbližších dnech je zavřeno.</p>
      ) : (
        <ul className="sports-ground-slots">
          {slots.map(slot => (
            <li key={slot.hour} className="sports-ground-slot">
              <span className="sports-ground-slot-time">{slot.time}</span>
              <span className="sports-ground-slot-price">{formatPrice(slot.price)}</span>

              {slot.isPeak && (
                <span className="sports-ground-slot-peak" title="Cena ve špičce" />
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
