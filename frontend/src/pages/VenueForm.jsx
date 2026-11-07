
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import Icon from '../components/Icons';
import { createVenue } from '../services/venues';

// ==========================================
// VÝCHOZÍ HODNOTY FORMULÁŘE
// ==========================================

const initialValues = {
  name: '',
  street: '',
  streetNumber: '',
  city: '',
  emailAddress: '',
  phoneNumber: '',
  operatorNote: ''
};

// ==========================================
// KONTROLA VYPLNĚNÝCH ÚDAJŮ
// ==========================================

function validate(values) {
  const errors = {};

  const required = {
    name: 'Zadejte název areálu.',
    street: 'Zadejte ulici.',
    streetNumber: 'Zadejte číslo popisné.',
    city: 'Zadejte město nebo část města.',
    emailAddress: 'Zadejte kontaktní e-mail.',
    phoneNumber: 'Zadejte telefonní číslo.'
  };

  Object.entries(required).forEach(([key, message]) => {
    if (!values[key].trim()) {
      errors[key] = message;
    }
  });

  const maxLengths = {
    name: 100,
    street: 100,
    streetNumber: 20,
    city: 100,
    operatorNote: 500
  };

  Object.entries(maxLengths).forEach(([key, max]) => {
    if (values[key].length > max) {
      errors[key] = `Maximálně ${max} znaků.`;
    }
  });

  if (
    values.emailAddress.trim() &&
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
      values.emailAddress.trim()
    )
  ) {
    errors.emailAddress = 'Zadejte platný e-mail.';
  }

  if (values.phoneNumber.trim()) {
    const phone = values.phoneNumber.replace(/[\s()-]/g, '');

    if (!/^\+?\d{9,15}$/.test(phone)) {
      errors.phoneNumber = 'Zadejte platné telefonní číslo.';
    }
  }

  return errors;
}

// ==========================================
// FORMULÁŘ VYTVOŘENÍ AREÁLU
// ==========================================

export default function VenueForm() {
  const navigate = useNavigate();

  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState('');

  // Změna hodnoty pole
  function handleChange(event) {
    const { name, value } = event.target;

    setValues((previous) => ({
      ...previous,
      [name]: value
    }));

    setErrors((previous) => ({
      ...previous,
      [name]: ''
    }));

    setSubmitError('');
  }

  // Vykreslení formulářového pole
  function renderField({
    name,
    label,
    placeholder,
    icon,
    type = 'text',
    maxLength,
    required = true
  }) {
    const error = errors[name];

    return (
      <div className="venue-field">
        <label htmlFor={name}>
          {label}
          {required && (
            <span className="required"> *</span>
          )}
        </label>

        <div
          className={
            'venue-input-wrap' +
            (error ? ' invalid' : '')
          }
        >
          {icon && (
            <Icon name={icon} size={18} />
          )}

          <input
            id={name}
            name={name}
            type={type}
            value={values[name]}
            onChange={handleChange}
            placeholder={placeholder}
            maxLength={maxLength}
            aria-invalid={Boolean(error)}
            aria-describedby={
              error ? `${name}-error` : undefined
            }
            required={required}
          />
        </div>

        {error && (
          <span
            id={`${name}-error`}
            className="venue-error"
            role="alert"
          >
            {error}
          </span>
        )}
      </div>
    );
  }

  // Odeslání formuláře
  function handleSubmit(event) {
    event.preventDefault();

    const validationErrors = validate(values);
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    try {
      const venue = createVenue({
        name: values.name.trim(),
        street: values.street.trim(),
        streetNumber: values.streetNumber.trim(),
        city: values.city.trim(),
        emailAddress: values.emailAddress.trim(),
        phoneNumber: values.phoneNumber.trim(),
        operatorNote: values.operatorNote.trim()
      });

      // Přesměrování na detail vytvořeného areálu
      navigate(`/arealy/${venue.id}`, {
        state: { created: true }
      });

    } catch (error) {
      setSubmitError(
        error.message || 'Areál se nepodařilo vytvořit.'
      );
    }
  }

  return (
    <div className="venue-form-page">

      {/* ZPĚT NA SEZNAM */}

      <Link to="/arealy" className="venue-back">
        <Icon name="arrow" size={17} />
        Zpět na moje areály
      </Link>

      {/* NADPIS */}

      <div className="venue-form-heading">
        <h1>Nový areál</h1>
        <p>
          Vyplňte základní informace o svém areálu.
        </p>
      </div>

      {/* KROKY */}

      <div className="venue-steps">
        <div className="venue-step active">
          <span>1</span>
          Areál
        </div>

        <div className="venue-step-line" />

        <div className="venue-step">
          <span>2</span>
          Sportoviště
        </div>
      </div>

      {/* FORMULÁŘ */}

      <form
        className="venue-form-card"
        onSubmit={handleSubmit}
        noValidate
      >

        <h2>Základní údaje</h2>

        {renderField({
          name: 'name',
          label: 'Název areálu',
          placeholder: 'Např. Sport Park Lípa',
          icon: 'venueForm',
          maxLength: 100
        })}

        {/* ADRESA */}

        <h2 className="venue-section-title">
          Adresa
        </h2>

        <p className="venue-section-description">
          Podle města si sportovci najdou areál ve vyhledávání.
        </p>

        {renderField({
          name: 'street',
          label: 'Ulice',
          placeholder: 'Např. Lipová',
          icon: 'pin',
          maxLength: 100
        })}

        <div className="venue-fields-two">
          {renderField({
            name: 'city',
            label: 'Město / část města',
            placeholder: 'Např. Praha 4',
            maxLength: 100
          })}

          {renderField({
            name: 'streetNumber',
            label: 'Číslo popisné / orientační',
            placeholder: 'Např. 1423/8',
            maxLength: 20
          })}
        </div>

        {/* KONTAKT */}

        <h2 className="venue-section-title">
          Kontaktní údaje
        </h2>

        <p className="venue-section-description">
          Kontaktní údaje slouží pro komunikaci
          se sportovci.
        </p>

        <div className="venue-fields-two">
          {renderField({
            name: 'emailAddress',
            label: 'Kontaktní e-mail',
            placeholder: 'rezervace@example.cz',
            icon: 'mail',
            type: 'email'
          })}

          {renderField({
            name: 'phoneNumber',
            label: 'Telefonní číslo',
            placeholder: '+420 123 456 789',
            icon: 'phone',
            type: 'tel'
          })}
        </div>

        {/* POZNÁMKA */}

        <h2 className="venue-section-title">
          Pro sportovce
        </h2>

        <div className="venue-field">
          <label htmlFor="operatorNote">
            Poznámka pro sportovce
            <span className="venue-optional">
              {' '}(nepovinné)
            </span>
          </label>

          <textarea
            id="operatorNote"
            name="operatorNote"
            value={values.operatorNote}
            onChange={handleChange}
            placeholder="Např. možnost zapůjčení vybavení, šatny, parkování..."
            maxLength={500}
            rows={4}
          />

          <span className="venue-counter">
            {values.operatorNote.length}/500
          </span>
        </div>

        {/* CHYBA PŘI UKLÁDÁNÍ */}

        {submitError && (
          <div className="venue-warning" role="alert">
            {submitError}
          </div>
        )}

        {/* TLAČÍTKA */}

        <div className="venue-form-actions">
          <Link
            to="/arealy"
            className="venue-button secondary"
          >
            Zrušit
          </Link>

          <button
            type="submit"
            className="venue-button primary"
          >
            Vytvořit areál
          </button>
        </div>

      </form>
    </div>
  );
}
