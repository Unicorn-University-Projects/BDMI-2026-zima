import React from 'react';

import KeyValueRow from '../common/KeyValueRow';
import { useSportsGround } from '../../providers/SportsGroundProvider';

// Neměnné údaje o sportovišti. Řádky sdílí komponentu KeyValueRow
// se souhrnem rezervace – v návrhu je to jedna komponenta „Key value“.
export default function SportsGroundFacts() {
  const { sportsGround } = useSportsGround();

  return (
    <section className="sports-ground-facts">
      <h2>Údaje sportoviště</h2>

      <dl>
        <KeyValueRow label="Druh sportu" value={sportsGround.sportName ?? '—'} />
        <KeyValueRow label="Povrch" value={sportsGround.surface || '—'} />
        <KeyValueRow
          label="Typ"
          value={sportsGround.coverType === 'indoor' ? 'Kryté' : 'Venkovní'}
        />
      </dl>
    </section>
  );
}
