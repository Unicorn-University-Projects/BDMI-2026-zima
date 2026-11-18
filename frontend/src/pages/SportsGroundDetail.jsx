import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import Icon from '../components/Icons';
import SportsGroundForm from '../components/SportsGroundForm';
import iconTime from '../assets/icon-time.svg';

import {
  getSportsGround,
  getVenue,
  updateSportsGround
} from '../services/venues';

import {
  buildSlots,
  findPreviewDate,
  formatPreviewDate,
  formatPrice,
  summarizeOpeningHours,
  summarizePeak
} from '../utils/openingHours';

// ==========================================
// DETAIL SPORTOVIŠTĚ (BUC-08, obrazovky 5.1 a 5.3)
// ==========================================
//
// Dokud nemá sportoviště otevírací dobu a ceník, je neaktivní a sportovcům se
// nenabízí – pak se místo slotů ukazuje výzva k nastavení.

export default function SportsGroundDetail() {
  const { id, sportsGroundId } = useParams();

  const [venue, setVenue] = useState(null);
  const [sportsGround, setSportsGround] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showEdit, setShowEdit] = useState(false);

  // Úprava používá stejný formulář jako vytvoření sportoviště v detailu
  // areálu – backend u obou příkazů čeká stejná pole.
  async function handleUpdate(values) {
    const updated = await updateSportsGround(sportsGroundId, values);
    setSportsGround(updated);
    setShowEdit(false);
  }

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [item, parent] = await Promise.all([
          getSportsGround(sportsGroundId),
          getVenue(id)
        ]);

        if (!cancelled) {
          setSportsGround(item);
          setVenue(parent);
          setError('');
        }
      } catch (e) {
        if (!cancelled) {
          setError(e.message || 'Detail sportoviště se nepodařilo načíst.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [id, sportsGroundId]);

  const openingHours = sportsGround?.openingHours ?? [];
  const priceList = sportsGround?.priceList ?? null;
  const isActive = sportsGround?.status === 'active' && Boolean(priceList);

  const previewDate = useMemo(
    () => (isActive ? findPreviewDate(openingHours) : null),
    [isActive, openingHours]
  );

  const slots = useMemo(
    () => (isActive ? buildSlots(openingHours, priceList, previewDate) : []),
    [isActive, openingHours, priceList, previewDate]
  );

  if (loading) {
    return (
      <div className="sports-ground-page">
        <p>Načítám sportoviště…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="sports-ground-page">
        <h1>Chyba</h1>
        <div className="venue-submit-error" role="alert">
          {error}
        </div>
        <Link to={`/arealy/${id}`} className="back">
          <Icon name="arrow" size={17} />
          Zpět na areál
        </Link>
      </div>
    );
  }

  if (!sportsGround) {
    return (
      <div className="sports-ground-page">
        <h1>Sportoviště nebylo nalezeno</h1>
        <Link to={`/arealy/${id}`} className="back">
          <Icon name="arrow" size={17} />
          Zpět na areál
        </Link>
      </div>
    );
  }

  return (
    <div className="sports-ground-page">
      <div className="sports-ground-content">

        {/* ZPĚT NA AREÁL */}

        <Link to={`/arealy/${id}`} className="sports-ground-back">
          <Icon name="arrow" size={18} />
          {venue?.name ?? 'Zpět na areál'}
        </Link>

        {/* NADPIS A STAV */}

        <div className="sports-ground-header">
          <div className="sports-ground-title">
            <h1>{sportsGround.name}</h1>

            <span className={`sports-ground-badge ${isActive ? 'active' : 'inactive'}`}>
              <span className="sports-ground-badge-dot" />
              {isActive ? 'Nabízí se' : 'Nenabízí se'}
            </span>
          </div>

          <button
            type="button"
            className="sports-ground-btn-outline"
            onClick={() => setShowEdit(true)}
          >
            <Icon name="edit" size={20} />
            Upravit sportoviště
          </button>
        </div>

        {/* ÚPRAVA SPORTOVIŠTĚ (5.4) */}

        {showEdit && (
          <div
            className="sports-ground-modal-scrim"
            role="presentation"
            onClick={event => {
              if (event.target === event.currentTarget) {
                setShowEdit(false);
              }
            }}
          >
            <div className="sports-ground-modal" role="dialog" aria-modal="true" aria-label="Upravit sportoviště">
              <div className="sports-ground-modal-header">
                <div>
                  <h2>Upravit sportoviště</h2>
                  {venue?.name && <p>{venue.name}</p>}
                </div>

                <button
                  type="button"
                  className="sports-ground-modal-close"
                  onClick={() => setShowEdit(false)}
                  aria-label="Zavřít"
                >
                  ×
                </button>
              </div>

              <SportsGroundForm
                initialValues={{
                  name: sportsGround.name,
                  sportCode: sportsGround.sportCode ?? 'tennis',
                  surface: sportsGround.surface,
                  coverType: sportsGround.coverType
                }}
                submitLabel="Uložit změny"
                errorMessage="Sportoviště se nepodařilo upravit."
                onSubmit={handleUpdate}
                onCancel={() => setShowEdit(false)}
              />
            </div>
          </div>
        )}

        {/* NEAKTIVNÍ – VÝZVA K NASTAVENÍ (5.1) */}

        {!isActive && (
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
        )}

        {/* AKTIVNÍ – SOUHRN NASTAVENÍ A NÁHLED SLOTŮ (5.3) */}

        {isActive && (
          <>
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

              <button type="button" className="sports-ground-btn-ghost">
                <Icon name="edit" size={20} />
                Upravit
              </button>
            </section>

            <section className="sports-ground-preview">
              <h2>Náhled pro sportovce · {formatPreviewDate(previewDate)}</h2>

              {slots.length === 0 ? (
                <p className="sports-ground-preview-empty">
                  V nejbližších dnech je zavřeno.
                </p>
              ) : (
                <ul className="sports-ground-slots">
                  {slots.map(slot => (
                    <li key={slot.hour} className="sports-ground-slot">
                      <span className="sports-ground-slot-time">{slot.time}</span>
                      <span className="sports-ground-slot-price">{formatPrice(slot.price)}</span>

                      {slot.isPeak && (
                        <span
                          className="sports-ground-slot-peak"
                          title="Cena ve špičce"
                        />
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        )}

        {/* ÚDAJE SPORTOVIŠTĚ */}

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

      </div>
    </div>
  );
}