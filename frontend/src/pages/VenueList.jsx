//seznam areálů
/*
Zobrazuje všechny areály uložené pro demo provozovatele. Pokud žádný neexistuje, zobrazí prázdný stav s tlačítkem „Vytvořit areál“.

Pokud už areály existují, zobrazí je jako karty s názvem, adresou a odkazem na detail. Umožňuje také vyhledávání podle názvu, města nebo ulice.

Využívá funkci listVenues() ze složky services.
*/


import React from 'react';
import { Link } from 'react-router-dom';

import Icon from '../components/Icons';
import { listVenues } from '../services/venues';

// ==========================================
// SEZNAM AREÁLŮ
// ==========================================

export default function VenueList() {

  // Načtení areálů z localStorage
  const venues = listVenues();

  return (
    <div className="venues-page">

      {/* NADPIS A TLAČÍTKO */}

      <div className="venues-heading">

        <h1>Moje areály</h1>

        {venues.length > 0 && (
          <Link
            to="/arealy/novy"
            className="venues-create-button"
          >
            <Icon name="plus" size={18} />
            Vytvořit areál
          </Link>
        )}

      </div>

      {/* PRÁZDNÝ SEZNAM */}

      {venues.length === 0 ? (

        <section className="venues-empty">

          <div className="venues-empty-icon">
            <Icon name="venueForm" size={26} />
          </div>

          <h2>Zatím nemáš žádný areál</h2>

          <p>
            Založ areál a přidej do něj sportoviště,
            která si sportovci budou rezervovat.
          </p>

          <Link
            to="/arealy/novy"
            className="venues-create-button"
          >
            <Icon name="plus" size={16} />
            Vytvořit areál
          </Link>

        </section>

      ) : (

        /* SEZNAM VYTVOŘENÝCH AREÁLŮ */

        <div className="venues-list">

          {venues.map((venue) => (

            <article
              key={venue.id}
              className="venues-list-card"
            >

              {/* IKONA AREÁLU */}

              <div className="venues-list-icon">
                <Icon name="building" size={26} />
              </div>

              {/* NÁZEV A ADRESA */}

              <div className="venues-list-info">

                <h2>{venue.name}</h2>

                <div className="venues-list-address">

                  <Icon name="pin" size={18} />

                  <span>
                    {venue.street} {venue.streetNumber},
                    {' '}{venue.city}
                  </span>

                </div>

              </div>

              {/* SPRÁVA SPORTOVIŠŤ */}

              <Link
                to={`/arealy/${venue.id}`}
                className="venues-manage-button"
              >
                <Icon name="calendar" size={19} />
                Spravovat sportoviště
              </Link>

            </article>

          ))}

        </div>

      )}

    </div>
  );
}
