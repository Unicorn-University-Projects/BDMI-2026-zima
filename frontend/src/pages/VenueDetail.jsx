import React, { useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';

import Icon from '../components/Icons';
import {
  createSportsGround,
  getVenue,
  listSportsGrounds
} from '../services/venues';

const emptySportsGroundForm = {
  name: '',
  sportCode: 'tennis',
  surface: '',
  coverType: 'outdoor'
};

export default function VenueDetail() {
  const { id } = useParams();
  const location = useLocation();

  const [venue, setVenue] = useState(null);
  const [sportsGrounds, setSportsGrounds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptySportsGroundForm);
  const [formErrors, setFormErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [saving, setSaving] = useState(false);
  const isCreated = location.state?.created === true;

  async function load() {
    const item = await getVenue(id);
    const grounds = await listSportsGrounds(id);
    setVenue(item);
    setSportsGrounds(grounds);
    setError('');
  }

  useEffect(() => {
    let cancelled = false;

    async function run() {
      try {
        await load();
      } catch (e) {
        if (!cancelled) {
          setError(e.message || 'Detail areálu se nepodařilo načíst.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [id]);

  function handleChange(event) {
    const { name, value } = event.target;
    setForm(previous => ({ ...previous, [name]: value }));
    setFormErrors(previous => ({ ...previous, [name]: '' }));
    setSubmitError('');
  }

  function validateForm() {
    const newErrors = {};
    if (!form.name.trim()) {
      newErrors.name = 'Vyplň název sportoviště.';
    }
    if (!form.sportCode.trim()) {
      newErrors.sportCode = 'Vyber typ sportu.';
    }
    if (!form.coverType) {
      newErrors.coverType = 'Vyber krytí.';
    }
    if (!form.surface.trim()) {
      newErrors.surface = 'Vyplň povrch.';
    }
    return newErrors;
  }

  async function handleCreateSportsGround(event) {
    event.preventDefault();
    const newErrors = validateForm();
    setFormErrors(newErrors);
    if (Object.keys(newErrors).length > 0) {
      return;
    }

    setSaving(true);
    try {
      await createSportsGround({
        venueId: id,
        name: form.name.trim(),
        sportCode: form.sportCode.trim(),
        surface: form.surface.trim(),
        coverType: form.coverType
      });
      setForm(emptySportsGroundForm);
      setShowForm(false);
      await load();
    } catch (e) {
      setSubmitError(e.message || 'Sportoviště se nepodařilo vytvořit.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="venue-detail-page">
        <p>Načítám areál…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="venue-detail-page">
        <h1>Chyba</h1>
        <div className="venue-submit-error" role="alert">
          {error}
        </div>
        <Link to="/arealy" className="back">
          <Icon name="arrow" size={17} />
          Zpět na moje areály
        </Link>
      </div>
    );
  }

  if (!venue) {
    return (
      <div className="venue-detail-page">
        <h1>Areál nebyl nalezen</h1>

        <Link to="/arealy" className="back">
          <Icon name="arrow" size={17} />
          Zpět na moje areály
        </Link>
      </div>
    );
  }

  const address = [
    [venue.street, venue.streetNumber].filter(Boolean).join(' '),
    venue.city
  ]
    .filter(Boolean)
    .join(', ');

  return (
    <div className="venue-detail-page">
      <Link to="/arealy" className="venue-detail-back">
        <Icon name="arrow" size={16} />
        Moje areály
      </Link>

      <div className="venue-detail-header">
        <div className="venue-detail-heading">
          <h1>{venue.name}</h1>

          <div className="venue-detail-contact">
            <span>
              <Icon name="pin" size={15} />
              {address}
            </span>

            {venue.phoneNumber && (
              <span>
                <Icon name="phone" size={15} />
                {venue.phoneNumber}
              </span>
            )}

            {venue.emailAddress && (
              <span>
                <Icon name="mail" size={15} />
                {venue.emailAddress}
              </span>
            )}
          </div>
        </div>

        <button
          type="button"
          className="venue-detail-edit"
          disabled
          title="Úprava areálu bude doplněna"
        >
          <Icon name="edit" size={17} />
          Upravit areál
        </button>
      </div>

      {isCreated && (
        <div className="venue-created-success" role="status">
          <Icon name="check" size={20} />

          <div>
            <strong>Areál byl úspěšně vytvořen.</strong>
            <p>
              Teď přidej sportoviště, která chceš
              nabízet k rezervaci.
            </p>
          </div>
        </div>
      )}

      <section className="venue-sports-section">
        <div className="venue-sports-header">
          <h2>Sportoviště ({sportsGrounds.length})</h2>

          <button
            type="button"
            className="venue-add-sport"
            onClick={() => setShowForm(previous => !previous)}
          >
            <Icon name="plus" size={18} />
            Přidat sportoviště
          </button>
        </div>

        {showForm && (
          <form className="venue-sport-form" onSubmit={handleCreateSportsGround} noValidate>
            <div className="venue-field">
              <label htmlFor="sport-name">
                Název <span className="required">*</span>
              </label>
              <input
                id="sport-name"
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="Kurt 1"
              />
              {formErrors.name && <small className="venue-error">{formErrors.name}</small>}
            </div>

            <div className="venue-field">
              <label htmlFor="sport-code">
                Typ sportu <span className="required">*</span>
              </label>
              <select
                id="sport-code"
                name="sportCode"
                value={form.sportCode}
                onChange={handleChange}
              >
                <option value="tennis">Tenis</option>
                <option value="badminton">Badminton</option>
                <option value="squash">Squash</option>
                <option value="volleyball">Volejbal</option>
                <option value="table_tennis">Stolní tenis</option>
              </select>
              {formErrors.sportCode && (
                <small className="venue-error">{formErrors.sportCode}</small>
              )}
            </div>

            <div className="venue-field">
              <label htmlFor="sport-cover">
                Krytí <span className="required">*</span>
              </label>
              <select
                id="sport-cover"
                name="coverType"
                value={form.coverType}
                onChange={handleChange}
              >
                <option value="outdoor">Venkovní</option>
                <option value="indoor">Kryté</option>
              </select>
              {formErrors.coverType && (
                <small className="venue-error">{formErrors.coverType}</small>
              )}
            </div>

            <div className="venue-field">
              <label htmlFor="sport-surface">
                Povrch <span className="required">*</span>
              </label>
              <input
                id="sport-surface"
                name="surface"
                value={form.surface}
                onChange={handleChange}
                placeholder="antuka"
              />
              {formErrors.surface && (
                <small className="venue-error">{formErrors.surface}</small>
              )}
            </div>

            {submitError && (
              <div className="venue-submit-error" role="alert">
                {submitError}
              </div>
            )}

            <div className="venue-form-actions">
              <button
                type="button"
                className="venue-btn-cancel"
                onClick={() => {
                  setShowForm(false);
                  setForm(emptySportsGroundForm);
                  setFormErrors({});
                  setSubmitError('');
                }}
              >
                Zrušit
              </button>
              <button type="submit" className="venue-btn-submit" disabled={saving}>
                {saving ? 'Ukládám…' : 'Uložit sportoviště'}
              </button>
            </div>
          </form>
        )}

        {sportsGrounds.length === 0 ? (
          <div className="venue-sports-empty">
            <div className="venue-sports-empty-icon">
              <Icon name="grid" size={30} />
            </div>

            <h3>Zatím tu není žádné sportoviště</h3>

            <p>
              Přidej kurty, hřiště nebo haly. Pak jim
              nastavíš otevírací dobu a ceník.
            </p>
          </div>
        ) : (
          <ul className="venue-sports-list">
            {sportsGrounds.map(item => (
              <li key={item.id} className="venue-sports-item">
                <Link to={`/arealy/${id}/sportoviste/${item.id}`} className="venue-sports-link">
                  <div>
                    <strong>{item.name}</strong>
                    <span>
                      {item.sportName}
                      {item.surface ? ` · ${item.surface}` : ''}
                      {` · ${item.coverType === 'indoor' ? 'kryté' : 'venkovní'}`}
                    </span>
                  </div>
                  <div className="venue-sports-meta">
                    {item.regularPrice != null && <span>{item.regularPrice} Kč/h</span>}
                    <span>{item.status === 'active' ? 'Aktivní' : 'Neaktivní – doplň otevírací dobu a ceník'}</span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
