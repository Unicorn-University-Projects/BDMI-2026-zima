//seznam areálů
/*
Zobrazuje všechny areály uložené pro demo provozovatele. Pokud žádný neexistuje, zobrazí prázdný stav s tlačítkem „Vytvořit areál“.

Pokud už areály existují, zobrazí je jako karty s názvem, adresou a odkazem na detail. Umožňuje také vyhledávání podle názvu, města nebo ulice.

Využívá funkci listVenues() ze složky services.
*/

import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import Icon from '../components/Icons';
import { listVenues } from '../services/venues';

export default function VenueList() {

  // ==========================================
  // 1. STAV A NAČÍTÁNÍ DAT
  // ==========================================

  // Text zadaný do vyhledávacího pole
  const [search, setSearch] = useState('');

  // Načtení seznamu areálů
  const [venues, setVenues] = useState(() => listVenues());

  // ==========================================
  // 2. FILTROVÁNÍ AREÁLŮ
  // ==========================================

  const filtered = venues.filter((venue) => {

    const searchableText = (
      venue.name + ' ' +
      venue.city + ' ' +
      venue.street
    ).toLocaleLowerCase('cs');

    return searchableText.includes(
      search.toLocaleLowerCase('cs')
    );
  });

  // ==========================================
  // 3. VYKRESLENÍ STRÁNKY
  // ==========================================

  return (
    <>

      {/* Nadpis stránky */}

      <div className="page-heading">

        <div>
          <div className="eyebrow">
            SPRÁVA AREÁLŮ
          </div>

          <h1>Moje areály</h1>

          <p>
            Spravujte své sportovní areály na jednom místě.
          </p>
        </div>

        {/* Tlačítko pro vytvoření areálu */}

        {venues.length > 0 && (
          <Link
            className="btn primary"
            to="/arealy/novy"
          >
            <Icon name="plus" size={18} />
            Vytvořit areál
          </Link>
        )}

      </div>

      {/* ======================================
          4. PRÁZDNÝ SEZNAM AREÁLŮ
      ====================================== */}

      {venues.length === 0 ? (

        
<section className="empty-card">

  <div className="empty-icon">
    <Icon name="building" size={30} />
  </div>

  <h2>Zatím nemáš žádný areál</h2>

  <p>
    Založ areál a přidej do něj sportoviště,
    která si sportovci budou rezervovat.
  </p>

  <Link
    className="btn primary"
    to="/arealy/novy"
  >
    <Icon name="plus" size={16} />
    Vytvořit areál
  </Link>

</section>


      ) : (

        <>

          {/* ==================================
              5. VYHLEDÁVÁNÍ AREÁLŮ
          ================================== */}

          <div className="list-tools">

            <div className="search">

              <Icon name="search" />

              <input
                type="text"
                aria-label="Hledat areál"
                placeholder="Hledat podle názvu nebo města..."
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                }}
              />

            </div>

            <span>
              {filtered.length}
              {' '}
              {filtered.length === 1 ? 'areál' : 'areálů'}
            </span>

          </div>

          {/* ==================================
              6. KARTY JEDNOTLIVÝCH AREÁLŮ
          ================================== */}

          <div className="venue-grid">

            {filtered.map((venue) => (

              <Link
                className="venue-card"
                key={venue.id}
                to={`/arealy/${venue.id}`}
              >

                {/* Ikona areálu */}

                <div className="venue-card-icon">
                  <Icon name="building" size={25} />
                </div>

                {/* Název */}

                <h2>{venue.name}</h2>

                {/* Adresa */}

                <p>
                  <Icon name="pin" size={16} />

                  {venue.street} {venue.streetNumber},
                  {' '}
                  {venue.city}
                </p>

                {/* Spodní část karty */}

                <div className="venue-card-bottom">

                  <span className="status">
                    Bez sportovišť
                  </span>

                  <span className="detail-link">
                    Detail →
                  </span>

                </div>

              </Link>

            ))}

          </div>

          {/* Žádný výsledek vyhledávání */}

          {filtered.length === 0 && (
            <p>
              Žádný areál neodpovídá hledání.
            </p>
          )}

        </>

      )}

    </>
  );
}
