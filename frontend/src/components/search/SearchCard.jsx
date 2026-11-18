import React from 'react';

import Icon from '../Icons';
import { SPORT_OPTIONS } from '../../services/search';
import { dateOptions } from '../../utils/searchParams';

// ==========================================
// KARTA VYHLEDÁVÁNÍ (1.2)
// ==========================================
//
// Řízená komponenta – hodnoty i jejich změny drží stránka, protože
// kritéria se ukládají do URL.

export default function SearchCard({ values, onChange, onSubmit, disabled }) {
  const dates = dateOptions();

  function handleChange(event) {
    const { name, value } = event.target;
    onChange({ ...values, [name]: value });
  }

  function handleSubmit(event) {
    event.preventDefault();
    onSubmit(values);
  }

  return (
    <form className="search-card" onSubmit={handleSubmit} noValidate>

      <div className="search-field">
        <label htmlFor="search-sport">
          Sport <span className="required">*</span>
        </label>
        <div className="search-input">
          <Icon name="grid" size={16} />
          <select
            id="search-sport"
            name="sport"
            value={values.sport}
            onChange={handleChange}
          >
            <option value="">Všechny sporty</option>
            {SPORT_OPTIONS.map(option => (
              <option key={option.code} value={option.code}>{option.name}</option>
            ))}
          </select>
          <Icon name="chevronDown" size={16} />
        </div>
      </div>

      <div className="search-field">
        <label htmlFor="search-lokalita">
          Lokalita <span className="required">*</span>
        </label>
        <div className="search-input">
          <Icon name="pin" size={16} />
          <input
            id="search-lokalita"
            name="lokalita"
            value={values.lokalita}
            onChange={handleChange}
            placeholder="Např. Praha"
          />
        </div>
      </div>

      <div className="search-field">
        <label htmlFor="search-datum">
          Datum <span className="required">*</span>
        </label>
        <div className="search-input">
          <Icon name="calendar" size={16} />
          <select
            id="search-datum"
            name="datum"
            value={values.datum}
            onChange={handleChange}
          >
            {dates.map(option => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
          <Icon name="chevronDown" size={16} />
        </div>
      </div>

      <button type="submit" className="search-submit" disabled={disabled}>
        <Icon name="search" size={18} />
        Hledat
      </button>

    </form>
  );
}