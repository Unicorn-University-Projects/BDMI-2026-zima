//seznam areálů
/*
Zobrazuje všechny areály uložené pro demo provozovatele. Pokud žádný neexistuje, zobrazí prázdný stav s tlačítkem „Vytvořit areál“.

Pokud už areály existují, zobrazí je jako karty s názvem, adresou a odkazem na detail. Umožňuje také vyhledávání podle názvu, města nebo ulice.

Využívá funkci listVenues() ze složky services.
*/

import React, { useState } from 'react';
import { Link } from 'react-router-dom';

import Icon from '../components/Icons';
import { listVenues } from '../services/venues';

export default function VenueList() {
  const [search, setSearch] = useState('');

  // Načtení areálů přihlášeného provozovatele
  const venues = listVenues();

  // Vyhledávání podle názvu a adresy
  const filteredVenues = venues.filter((venue) => {
    const value = [
      venue.name,
      venue.street,
      venue.streetNumber,
      venue.city
    ]
      .join(' ')
      .toLocaleLowerCase('cs');

    return value.includes(
      search.trim().toLocaleLowerCase('cs')
    );
  });

  return (
    <div className="venues-page">

      {/* NADPIS */}

      <div className="venues-heading">
        <div>
          <h1>Moje areály</h1>

          {venues.length > 0 && (
            <p>
              Spravujte své sportovní areály
              na jednom místě.
            </p>
          )}
        </div>

        {venues.length > 0 && (
          <Link
            to="/arealy/novy"
            className="venues-create-button"
          >
            <Icon name="plus" size={16} />
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
        <>
          {/* VYHLEDÁVÁNÍ */}

          <div className="venues-search">
            <Icon name="search" size={19} />

            <input
              type="search"
              placeholder="Hledat podle názvu nebo města..."
              aria-label="Hledat areál"
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
            />
          </div>

          {/* KARTY AREÁLŮ */}

          {filteredVenues.length > 0 ? (
            <div className="venues-grid">

              {filteredVenues.map((venue) => (
                <Link
                  key={venue.id}
                  to={`/arealy/${venue.id}`}
                  className="venues-card"
                >
                  <div className="venues-card-icon">
                    <Icon name="building" size={24} />
                  </div>

                  <h2>{venue.name}</h2>

                  <div className="venues-card-address">
                    <Icon name="pin" size={18} />

                    <span>
                      {venue.street} {venue.streetNumber},
                      {' '}{venue.city}
                    </span>
                  </div>

                  <div className="venues-card-footer">
                    <span className="venues-status">
                      {venue.sportsFieldsCount > 0
                        ? `${venue.sportsFieldsCount} sportovišť`
                        : 'Bez sportovišť'}
                    </span>

                    <span className="venues-detail-link">
                      Detail →
                    </span>
                  </div>
                </Link>
              ))}

            </div>
          ) : (
            <div className="venues-no-results">
              <Icon name="search" size={26} />
              <h2>Žádný areál nenalezen</h2>
              <p>Zkuste upravit hledaný výraz.</p>
            </div>
          )}
        </>
      )}

    </div>
  );
}
