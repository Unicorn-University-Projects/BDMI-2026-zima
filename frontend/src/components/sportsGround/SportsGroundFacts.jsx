import React from 'react';

import { useSportsGround } from '../../providers/SportsGroundProvider';

// Neměnné údaje o sportovišti.
export default function SportsGroundFacts() {
  const { sportsGround } = useSportsGround();

  return (
    <section className="sports-ground-facts">
      <h2>Údaje sportoviště</h2>

      <dl>
        <div className="sports-ground-fact">
          <dt>Druh sportu</dt>
          <dd>{sportsGround.sportName ?? '—'}</dd>
        </div>

        <div className="sports-ground-fact">
          <dt>Povrch</dt>
          <dd>{sportsGround.surface || '—'}</dd>
        </div>

        <div className="sports-ground-fact last">
          <dt>Typ</dt>
          <dd>{sportsGround.coverType === 'indoor' ? 'Kryté' : 'Venkovní'}</dd>
        </div>
      </dl>
    </section>
  );
}
