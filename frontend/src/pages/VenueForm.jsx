// vytvoření areálu
/*
Obsahuje formulář podle Figmy. Uživatel vyplňuje název, ulici, číslo popisné, město, telefon, e-mail a případně poznámku.

Kontroluje povinná pole, formát e-mailu, telefonu a maximální délky textů. Při chybě zvýrazní příslušné pole.

Po odeslání zavolá createVenue(), která ověří duplicitu a uloží areál. Následně přesměruje uživatele na detail.
*/


import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import Icon from '../components/Icons';
import { createVenue } from '../services/venues';

// ==========================================
// 1. VÝCHOZÍ HODNOTY FORMULÁŘE
// ==========================================

const initial = {
  name: '',
  street: '',
  streetNumber: '',
  city: '',
  phoneNumber: '',
  emailAddress: '',
  operatorNote: ''
};

// ==========================================
// 2. PRAVIDLA VALIDACE
// ==========================================

// Kontrola formátu e-mailu
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Kontrola formátu telefonu
const phonePattern = /^\+?[\d\s()\-]{7,25}$/;

// Funkce pro kontrolu vyplněných údajů
function validate(values) {

  const errors = {};

  // Povinná pole
  const requiredFields = [
    'name',
    'street',
    'streetNumber',
    'city',
    'phoneNumber',
    'emailAddress'
  ];

  for (const key of requiredFields) {

    if (!values[key].trim()) {
      errors[key] = 'Toto pole je povinné.';
    }

  }

  // Maximální délky jednotlivých polí
  const maxLengths = [
    ['name', 100],
    ['street', 100],
    ['streetNumber', 20],
    ['city', 100],
    ['operatorNote', 500]
  ];

  for (const [key, max] of maxLengths) {

    if (values[key].trim().length > max) {
      errors[key] = `Maximální délka je ${max} znaků.`;
    }

  }

  // Validace e-mailu
  if (
    values.emailAddress.trim() &&
    !emailPattern.test(values.emailAddress.trim())
  ) {
    errors.emailAddress = 'Zadejte platný e-mail.';
  }

  // Validace telefonu
  if (
    values.phoneNumber.trim() &&
    !phonePattern.test(values.phoneNumber.trim())
  ) {
    errors.phoneNumber = 'Zadejte platné telefonní číslo.';
  }

  return errors;
}

// ==========================================
// 3. HLAVNÍ KOMPONENTA FORMULÁŘE
// ==========================================

export default function VenueForm() {

  // Hodnoty formuláře
  const [values, setValues] = useState(initial);

  // Chyby jednotlivých polí
  const [errors, setErrors] = useState({});

  // Upozornění na duplicitu areálu
  const [warning, setWarning] = useState('');

  // Navigace mezi stránkami
  const navigate = useNavigate();

  // ==========================================
  // 4. ZMĚNA HODNOTY POLE
  // ==========================================

  function change(event) {

    const { name, value } = event.target;

    // Aktualizace hodnoty
    setValues((previous) => ({
      ...previous,
      [name]: value
    }));

    // Odstranění chyby upravovaného pole
    setErrors((previous) => ({
      ...previous,
      [name]: undefined
    }));

    // Odstranění upozornění
    setWarning('');
  }

  // ==========================================
  // 5. ODESLÁNÍ FORMULÁŘE
  // ==========================================

  function submit(event) {

    // Zabrání obnovení stránky
    event.preventDefault();

    // Kontrola vyplněných údajů
    const nextErrors = validate(values);

    setErrors(nextErrors);

    // Pokud existují chyby, formulář se neodešle
    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    try {

      // Odstranění mezer na začátku a konci
      const cleanedValues = Object.fromEntries(
        Object.entries(values).map(([key, value]) => [
          key,
          value.trim()
        ])
      );

      // Vytvoření areálu
      const venue = createVenue(cleanedValues);

      // Přesměrování na detail vytvořeného areálu
      navigate(`/arealy/${venue.id}`, {
        state: {
          created: true
        }
      });

    } catch (error) {

      // Například duplicitní areál
      setWarning(error.message);

    }
  }

  // ==========================================
  // 6. KOMPONENTA TEXTOVÉHO POLE
  // ==========================================

  function field(
    name,
    label,
    placeholder,
    icon,
    options = {}
  ) {

    return (

      <div className="field">

        {/* Název pole */}

        <label htmlFor={name}>
          {label}
          {' '}
          <span className="required">*</span>
        </label>

        {/* Textové pole */}

        <div
          className={
            'input-wrap ' +
            (errors[name] ? 'invalid' : '')
          }
        >

          {/* Volitelná ikona */}

          {icon && (
            <Icon name={icon} size={18} />
          )}

          <input
            id={name}
            name={name}
            type={options.type || 'text'}
            placeholder={placeholder}
            value={values[name]}
            onChange={change}
            maxLength={options.maxLength}
            aria-invalid={Boolean(errors[name])}
            aria-describedby={
              errors[name] ? `${name}-error` : undefined
            }
          />

        </div>

        {/* Chybová zpráva */}

        {errors[name] && (

          <small
            className="error"
            id={`${name}-error`}
          >
            {errors[name]}
          </small>

        )}

      </div>

    );
  }

  // ==========================================
  // 7. VYKRESLENÍ FORMULÁŘE
  // ==========================================

  return (
    <>

      {/* Návrat na seznam areálů */}

      <Link
        to="/arealy"
        className="back"
      >
        <Icon name="arrow" size={17} />
        Moje areály
      </Link>

      {/* Nadpis stránky */}

      <div className="page-heading form-heading">

        <div>
          <h1>Nový areál</h1>

          <p>
            Vyplňte základní údaje.
            Sportoviště přidáte v dalším kroku.
          </p>
        </div>

      </div>

      {/* ======================================
          8. KROKY VYTVOŘENÍ AREÁLU
      ====================================== */}

      <div className="steps">

        <span className="step current">
          <b>1</b>
          Areál
        </span>

        <span className="step-line" />

        <span className="step">
          <b>2</b>
          Sportoviště
        </span>

        <span className="step-line" />

        <span className="step">
          <b>3</b>
          Otevírací doba a ceník
        </span>

      </div>

      {/* ======================================
          9. HLAVNÍ FORMULÁŘ
      ====================================== */}

      <form
        className="form-card"
        onSubmit={submit}
        noValidate
      >

        {/* ZÁKLADNÍ ÚDAJE */}

        <h2>Základní údaje</h2>

        {field(
          'name',
          'Název areálu',
          'Např. Sport Park Lípa',
          'venueForm',
          { maxLength: 100 }
        )}

        {/* ADRESA */}

        <h2 className="section-title">
          Adresa
        </h2>

        <p className="section-description">
          Podle města si sportovci najdou areál
          ve vyhledávání.
        </p>

        <div className="fields two address">

          {field(
            'street',
            'Ulice',
            'Např. Lipová',
            'pin',
            { maxLength: 100 }
          )}

          {field(
            'streetNumber',
            'Číslo popisné',
            'Např. 12',
            null,
            { maxLength: 20 }
          )}

        </div>

        {field(
          'city',
          'Město / část města',
          'Např. Praha 8',
          null,
          { maxLength: 100 }
        )}

        {/* KONTAKT */}

        <h2 className="section-title">
          Kontakt
        </h2>

        <p className="section-description">
          Sportovci ho uvidí u rezervace.
        </p>

        <div className="fields two">

          {field(
            'phoneNumber',
            'Telefon',
            '+420 777 123 456',
            'phone',
            { type: 'tel' }
          )}

          {field(
            'emailAddress',
            'E-mail',
            'info@sportparklipa.cz',
            'mail',
            { type: 'email' }
          )}

        </div>

        {/* POZNÁMKA PRO SPORTOVCE */}

        <h2 className="section-title">
          Pro sportovce
        </h2>

        <div className="field">

          <label htmlFor="operatorNote">

            Poznámka pro sportovce
            {' '}

            <span className="optional">
              (nepovinné)
            </span>

          </label>

          <textarea
            id="operatorNote"
            name="operatorNote"
            rows="4"
            maxLength="500"
            placeholder="Např. na místě lze zapůjčit rakety a míče..."
            value={values.operatorNote}
            onChange={change}
          />

          {/* Počítadlo znaků */}

          <small className="counter">
            {values.operatorNote.length}/500
          </small>

        </div>

        {/* ==================================
            10. UPOZORNĚNÍ
        ================================== */}

        {warning && (

          <div
            className="warning"
            role="alert"
          >
            {warning}
          </div>

        )}

        {/* ==================================
            11. TLAČÍTKA FORMULÁŘE
        ================================== */}

        <div className="form-actions">

          <Link
            className="btn secondary"
            to="/arealy"
          >
            Zrušit
          </Link>

          <button
            className="btn primary"
            type="submit"
          >
            Vytvořit areál
            <Icon name="plus" size={18} />
          </button>

        </div>

      </form>

    </>
  );
}
