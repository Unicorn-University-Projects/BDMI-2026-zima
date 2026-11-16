
import React, { useEffect, useState } from 'react';
import {
  Link,
  useNavigate,
  useParams
} from 'react-router-dom';

import Icon from '../components/Icons';

import {
  getVenue,
  createVenue,
  updateVenue
} from '../services/venues';

// ==========================================
// VÝCHOZÍ HODNOTY FORMULÁŘE
// ==========================================

const initialForm = {
  name: '',
  street: '',
  streetNumber: '',
  city: '',
  phoneNumber: '',
  emailAddress: '',
  operatorNote: ''
};

// ==========================================
// FORMULÁŘ AREÁLU
// ==========================================

export default function VenueForm() {

  const navigate = useNavigate();
  const { id } = useParams();

  // Rozlišení vytvoření a editace
  const isEditing = Boolean(id);

  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(isEditing);
  const [notFound, setNotFound] = useState(false);

  // Načtení existujícího areálu při editaci
  useEffect(() => {
    if (!isEditing) return;
    let cancelled = false;

    getVenue(id)
      .then(venue => {
        if (cancelled) return;
        setForm(Object.fromEntries(
          Object.keys(initialForm).map(key => [key, venue[key] ?? ''])
        ));
      })
      .catch(() => {
        if (!cancelled) setNotFound(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id, isEditing]);

  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState('');

  // ========================================
  // ZMĚNA HODNOTY POLE
  // ========================================

  function handleChange(event) {
    const { name, value } = event.target;

    setForm(previous => ({
      ...previous,
      [name]: value
    }));

    setErrors(previous => ({
      ...previous,
      [name]: ''
    }));

    setSubmitError('');
  }

  function isValidEmail(value) {
    if (/[^\x00-\x7F]/.test(value)) {
      return false;
    }
    if (value.includes('..')) {
      return false;
    }
    return /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(value);
  }

  function validate() {
    const newErrors = {};

    if (!form.name.trim()) {
      newErrors.name = 'Vyplň název areálu.';
    }

    if (!form.street.trim()) {
      newErrors.street = 'Vyplň ulici.';
    }

    if (!form.streetNumber.trim()) {
      newErrors.streetNumber = 'Vyplň číslo popisné.';
    }

    if (!form.city.trim()) {
      newErrors.city = 'Vyplň město nebo část města.';
    }

    if (!form.phoneNumber.trim()) {
      newErrors.phoneNumber = 'Vyplň telefon.';
    } else if (
      !/^\+?[\d\s()-]{9,20}$/.test(form.phoneNumber.trim()) ||
      form.phoneNumber.replace(/\D/g, '').length < 9
    ) {
      newErrors.phoneNumber = 'Zadej platné telefonní číslo.';
    }

    if (!form.emailAddress.trim()) {
      newErrors.emailAddress = 'Vyplň e-mail.';
    } else if (!isValidEmail(form.emailAddress.trim())) {
      newErrors.emailAddress =
        'Zadej platný e-mail bez diakritiky, např. info@sportparklipa.cz';
    }

    return newErrors;
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const newErrors = validate();
    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      return;
    }

    const data = {
      name: form.name.trim(),
      street: form.street.trim(),
      streetNumber: form.streetNumber.trim(),
      city: form.city.trim(),
      phoneNumber: form.phoneNumber.trim(),
      emailAddress: form.emailAddress.trim(),
      operatorNote: form.operatorNote.trim()
    };

    try {
      if (isEditing) {
        await updateVenue(id, data);
        navigate('/arealy', { replace: true });
      } else {
        const venue = await createVenue(data);
        navigate(`/arealy/${venue.id}`, {
          replace: true,
          state: { created: true }
        });
      }
    } catch (error) {
      if (error.code === 'venue/invalidDtoIn' && error.params?.invalidFields?.length) {
        const fieldErrors = {};
        for (const field of error.params.invalidFields) {
          fieldErrors[field] = 'Toto pole není vyplněné správně.';
        }
        setErrors(previous => ({ ...previous, ...fieldErrors }));
        setSubmitError('Oprav vyznačená pole a zkus to znovu.');
        return;
      }
      setSubmitError(
        error.message ||
        'Areál se nepodařilo uložit.'
      );
    }
  }

  // ========================================
  // NEEXISTUJÍCÍ AREÁL
  // ========================================

  if (loading) {
    return (
      <div className="venue-form-page">
        <p>Načítám areál…</p>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="venue-form-page">
        <Link to="/arealy" className="venue-form-back">
          <Icon name="arrow" size={16} />
          Moje areály
        </Link>

        <h1>Areál nebyl nalezen</h1>
        <p>
          Požadovaný areál neexistuje nebo byl smazán.
        </p>
      </div>
    );
  }

  // ========================================
  // VYKRESLENÍ FORMULÁŘE
  // ========================================

  return (
    <div className="venue-form-page">

      {/* NAVIGACE */}

      <Link to="/arealy" className="venue-form-back">
        <Icon name="arrow" size={16} />
        Moje areály
      </Link>

      {/* NADPIS */}

      <header className="venue-form-heading">
        <h1>
          {isEditing ? 'Upravit areál' : 'Nový areál'}
        </h1>

        <p>
          {isEditing
            ? 'Uprav základní údaje svého areálu.'
            : 'Vyplň základní údaje. Sportoviště přidáš v dalším kroku.'}
        </p>
      </header>

      {/* KROKY */}

      <div className="venue-form-steps">

        <div className="venue-form-step active">
          <span className="step-number">1</span>
          <span>Areál</span>
        </div>

        <span className="venue-step-line" />

        <div className="venue-form-step">
          <span className="step-number">2</span>
          <span>Sportoviště</span>
        </div>

        <span className="venue-step-line" />

        <div className="venue-form-step">
          <span className="step-number">3</span>
          <span>Otevírací doba a ceník</span>
        </div>

      </div>

      {/* FORMULÁŘ */}

      <form
        className="venue-form-card"
        onSubmit={handleSubmit}
        noValidate
      >

        {/* ZÁKLADNÍ ÚDAJE */}

        <section className="venue-form-section">

          <h2>Základní údaje</h2>

          <div className="venue-field">

            <label htmlFor="name">
              Název areálu <span className="required">*</span>
            </label>

            <div className={`venue-input ${errors.name ? 'invalid' : ''}`}>
              <Icon name="venueForm" size={18} />

              <input
                id="name"
                name="name"
                type="text"
                placeholder="Sport Park Lípa"
                value={form.name}
                onChange={handleChange}
                maxLength={100}
                aria-invalid={Boolean(errors.name)}
              />
            </div>

            {errors.name && (
              <small className="venue-error">{errors.name}</small>
            )}

          </div>

        </section>

        {/* ADRESA */}

        <section className="venue-form-section">

          <h2>Adresa</h2>

          <p className="venue-section-description">
            Podle města tě sportovci najdou ve vyhledávání.
          </p>

          <div className="venue-address-row">

            <div className="venue-field">

              <label htmlFor="street">
                Ulice <span className="required">*</span>
              </label>

              <div className={`venue-input ${errors.street ? 'invalid' : ''}`}>
                <Icon name="pin" size={17} />

                <input
                  id="street"
                  name="street"
                  type="text"
                  placeholder="Lipová"
                  value={form.street}
                  onChange={handleChange}
                  maxLength={100}
                  aria-invalid={Boolean(errors.street)}
                />
              </div>

              {errors.street && (
                <small className="venue-error">{errors.street}</small>
              )}

            </div>

            <div className="venue-field">

              <label htmlFor="streetNumber">
                Číslo popisné <span className="required">*</span>
              </label>

              <div className={`venue-input ${errors.streetNumber ? 'invalid' : ''}`}>
                <input
                  id="streetNumber"
                  name="streetNumber"
                  type="text"
                  placeholder="12"
                  value={form.streetNumber}
                  onChange={handleChange}
                  maxLength={20}
                  aria-invalid={Boolean(errors.streetNumber)}
                />
              </div>

              {errors.streetNumber && (
                <small className="venue-error">
                  {errors.streetNumber}
                </small>
              )}

            </div>

          </div>

          <div className="venue-field">

            <label htmlFor="city">
              Město / část města <span className="required">*</span>
            </label>

            <div className={`venue-input ${errors.city ? 'invalid' : ''}`}>
              <input
                id="city"
                name="city"
                type="text"
                placeholder="Praha 8"
                value={form.city}
                onChange={handleChange}
                maxLength={100}
                aria-invalid={Boolean(errors.city)}
              />
            </div>

            {errors.city && (
              <small className="venue-error">{errors.city}</small>
            )}

          </div>

        </section>

        {/* KONTAKT */}

        <section className="venue-form-section">

          <h2>Kontakt</h2>

          <p className="venue-section-description">
            Sportovci ho uvidí u rezervace.
          </p>

          <div className="venue-contact-row">

            <div className="venue-field">

              <label htmlFor="phoneNumber">
                Telefon <span className="required">*</span>
              </label>

              <div className={`venue-input ${errors.phoneNumber ? 'invalid' : ''}`}>
                <Icon name="phone" size={17} />

                <input
                  id="phoneNumber"
                  name="phoneNumber"
                  type="tel"
                  placeholder="+420 777 123 456"
                  value={form.phoneNumber}
                  onChange={handleChange}
                  aria-invalid={Boolean(errors.phoneNumber)}
                />
              </div>

              {errors.phoneNumber && (
                <small className="venue-error">
                  {errors.phoneNumber}
                </small>
              )}

            </div>

            <div className="venue-field">

              <label htmlFor="emailAddress">
                E-mail <span className="required">*</span>
              </label>

              <div className={`venue-input ${errors.emailAddress ? 'invalid' : ''}`}>
                <Icon name="mail" size={17} />

                <input
                  id="emailAddress"
                  name="emailAddress"
                  type="email"
                  placeholder="info@sportparklipa.cz"
                  value={form.emailAddress}
                  onChange={handleChange}
                  aria-invalid={Boolean(errors.emailAddress)}
                />
              </div>

              {errors.emailAddress && (
                <small className="venue-error">
                  {errors.emailAddress}
                </small>
              )}

            </div>

          </div>

        </section>

        {/* PRO SPORTOVCE */}

        <section className="venue-form-section venue-note-section">

          <h2>Pro sportovce</h2>

          <div className="venue-field">

            <label htmlFor="operatorNote">
              Poznámka pro sportovce (nepovinné)
            </label>

            <textarea
              id="operatorNote"
              name="operatorNote"
              rows={4}
              maxLength={500}
              placeholder="Na místě lze zapůjčit tenisové rakety a míče. Šatny a sprchy v hlavní budově."
              value={form.operatorNote}
              onChange={handleChange}
            />

            <div className="venue-note-counter">
              {form.operatorNote.length}/500
            </div>

            <p className="venue-note-help">
              Zobrazí se na detailu sportoviště, např. vybavení k zapůjčení.
            </p>

          </div>

        </section>

        {/* CHYBA PŘI UKLÁDÁNÍ */}

        {submitError && (
          <div className="venue-submit-error" role="alert">
            {submitError}
          </div>
        )}

        {/* TLAČÍTKA */}

        <div className="venue-form-actions">

          <Link to="/arealy" className="venue-btn-cancel">
            Zrušit
          </Link>

          <button type="submit" className="venue-btn-submit">
            {isEditing ? 'Uložit změny' : 'Vytvořit areál'}
          </button>

        </div>

      </form>

    </div>
  );
}
