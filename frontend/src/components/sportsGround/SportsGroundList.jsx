import React from 'react';
import { Link } from 'react-router-dom';

import Icon from '../Icons';
import { COVER_TYPE_OPTIONS } from '../../utils/sportOptions';

// ==========================================
// SEZNAM SPORTOVIŠŤ AREÁLU
// ==========================================
//
// Sportoviště je pro sportovce viditelné až po nastavení otevírací doby
// a ceníku – dokud se tak nestane, nese odznak „Čeká na nastavení“
// a tlačítko vede rovnou na jeho detail, kde se nastavení dělá.

function coverTypeName(coverType) {
  const option = COVER_TYPE_OPTIONS.find(item => item.code === coverType);
  return option ? option.name : coverType;
}

export default function SportsGroundList({ venueId, sportsGrounds }) {
  return (
    <ul className="sg-list">
      {sportsGrounds.map(item => {
        const needsSetup = item.status !== 'active';

        const meta = [item.sportName, item.surface, coverTypeName(item.coverType)]
          .filter(Boolean)
          .join(' · ');

        return (
          <li key={item.id} className="sg-list-item">
            <div className="sg-list-info">
              <div className="sg-list-top">
                <Link
                  to={`/arealy/${venueId}/sportoviste/${item.id}`}
                  className="sg-list-name"
                >
                  {item.name}
                </Link>

                {needsSetup && (
                  <span className="sg-setup-badge">
                    <Icon name="clock" size={14} />
                    Čeká na nastavení
                  </span>
                )}
              </div>

              <p className="sg-list-meta">{meta}</p>
            </div>

            <Link
              to={`/arealy/${venueId}/sportoviste/${item.id}`}
              className="sg-btn-secondary"
            >
              <Icon name="clock" size={20} />
              {needsSetup
                ? 'Nastavit otevírací dobu a ceník'
                : 'Upravit otevírací dobu a ceník'}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}