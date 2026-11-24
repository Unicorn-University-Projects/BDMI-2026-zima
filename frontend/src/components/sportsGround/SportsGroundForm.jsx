import React, { useState } from 'react';

import Icon from '../Icons';
import {
  COVER_TYPE_OPTIONS,
  SPORT_OPTIONS,
  SURFACE_OPTIONS
} from '../../utils/sportOptions';

// ==========================================
// FORMULÁŘ SPORTOVIŠTĚ
// ==========================================
//
// Stejná pole používá vytvoření (detail areálu) i úprava (detail
// sportoviště) – backend u obou příkazů očekává name, sportCode, surface
// a coverType. Tlačítko „Uložit a přidat další“ se ukáže jen tehdy, když
// rodič předá onSubmitAndNext, tedy při zakládání.

const EMPTY_VALUES = {
  name: '',
  sportCode: 'tennis',
  surface: '',
  coverType: 'outdoor'
};

export default function SportsGroundForm({
  initialValues,
  submitLabel = 'Uložit',
  errorMessage = 'Sportoviště se nepodařilo uložit.',
  onSubmit,
  onSubmitAndNext,
  onCancel
}) {
  const [form, setForm] = useState({ ...EMPTY_VALUES, ...initialValues });
  const [formErrors, setFormErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [saving, setSaving] = useState(false);

  function handleChange(event) {
    const { name, value } = event.target;
    setForm(previous => ({ ...previous, [name]: value }));
    setFormErrors(previous => ({ ...previous, [name]: '' }));
    setSubmitError('');
  }

  function handleCoverTypeChange(code) {
    setForm(previous => ({ ...previous, coverType: code }));
    setFormErrors(previous => ({ ...previous, coverType: '' }));
    setSubmitError('');
  }

  function validateForm() {
    const newErrors = {};
    if (!form.name.trim()) {
      newErrors.name = 'Vyplň název sportoviště.';
    }
    if (!form.sportCode.trim()) {
      newErrors.sportCode = 'Vyber druh sportu.';
    }
    if (!form.surface.trim()) {
      newErrors.surface = 'Vyber povrch.';
    }
    if (!form.coverType) {
      newErrors.coverType = 'Vyber typ sportoviště.';
    }
    return newErrors;
  }

  // Obě tlačítka ukládají stejná data, liší se jen tím, co udělá rodič –
  // zavře dialog, nebo ho nechá otevřený pro další sportoviště.
  async function save(handler) {
    const newErrors = validateForm();
    setFormErrors(newErrors);
    if (Object.keys(newErrors).length > 0) {
      return;
    }

    setSaving(true);
    try {
      await handler({
        name: form.name.trim(),
        sportCode: form.sportCode.trim(),
        surface: form.surface.trim(),
        coverType: form.coverType
      });
    } catch (e) {
      setSubmitError(e.message || errorMessage);
      return;
    } finally {
      setSaving(false);
    }

    if (handler === onSubmitAndNext) {
      setForm({ ...EMPTY_VALUES });
    }
  }

  return (
    <form
      className="sg-form"
      onSubmit={event => {
        event.preventDefault();
        save(onSubmit);
      }}
      noValidate
    >
      <div className="sg-fields">
        <div className="sg-field">
          <label className="sg-label" htmlFor="sg-name">
            Název sportoviště <span className="sg-required">*</span>
          </label>

          <input
            id="sg-name"
            name="name"
            className={`sg-control${formErrors.name ? ' invalid' : ''}`}
            value={form.name}
            onChange={handleChange}
            placeholder="Tenisový kurt č. 1"
          />

          {formErrors.name ? (
            <small className="sg-error">{formErrors.name}</small>
          ) : (
            <small className="sg-hint">Musí být jedinečný v rámci areálu.</small>
          )}
        </div>

        <div className="sg-row">
          <div className="sg-field">
            <label className="sg-label" htmlFor="sg-sport">
              Druh sportu <span className="sg-required">*</span>
            </label>

            <div className={`sg-select has-icon${formErrors.sportCode ? ' invalid' : ''}`}>
              <Icon name="grid" size={20} className="sg-select-icon" />

              <select
                id="sg-sport"
                name="sportCode"
                value={form.sportCode}
                onChange={handleChange}
              >
                {SPORT_OPTIONS.map(sport => (
                  <option key={sport.code} value={sport.code}>
                    {sport.name}
                  </option>
                ))}
              </select>

              <Icon name="chevronDown" size={20} className="sg-select-chevron" />
            </div>

            {formErrors.sportCode && (
              <small className="sg-error">{formErrors.sportCode}</small>
            )}
          </div>

          <div className="sg-field">
            <label className="sg-label" htmlFor="sg-surface">
              Povrch <span className="sg-required">*</span>
            </label>

            <div className={`sg-select${formErrors.surface ? ' invalid' : ''}`}>
              <select
                id="sg-surface"
                name="surface"
                value={form.surface}
                onChange={handleChange}
              >
                <option value="">Vyber povrch</option>

                {SURFACE_OPTIONS.map(surface => (
                  <option key={surface} value={surface}>
                    {surface}
                  </option>
                ))}
              </select>

              <Icon name="chevronDown" size={20} className="sg-select-chevron" />
            </div>

            {formErrors.surface && (
              <small className="sg-error">{formErrors.surface}</small>
            )}
          </div>
        </div>

        <div className="sg-field">
          <span className="sg-label" id="sg-cover-label">
            Typ sportoviště <span className="sg-required">*</span>
          </span>

          <div className="sg-segmented" role="radiogroup" aria-labelledby="sg-cover-label">
            {COVER_TYPE_OPTIONS.map(option => (
              <button
                key={option.code}
                type="button"
                role="radio"
                aria-checked={form.coverType === option.code}
                className={`sg-segment${form.coverType === option.code ? ' selected' : ''}`}
                onClick={() => handleCoverTypeChange(option.code)}
              >
                {option.name}
              </button>
            ))}
          </div>

          {formErrors.coverType && (
            <small className="sg-error">{formErrors.coverType}</small>
          )}
        </div>
      </div>

      {submitError && (
        <div className="sg-submit-error" role="alert">
          {submitError}
        </div>
      )}

      <div className="sg-actions">
        <button type="button" className="sg-btn-ghost" onClick={onCancel}>
          Zrušit
        </button>

        <div className="sg-actions-right">
          {onSubmitAndNext && (
            <button
              type="button"
              className="sg-btn-outline"
              disabled={saving}
              onClick={() => save(onSubmitAndNext)}
            >
              Uložit a přidat další
            </button>
          )}

          <button type="submit" className="sg-btn-primary" disabled={saving}>
            {saving ? 'Ukládám…' : submitLabel}
          </button>
        </div>
      </div>
    </form>
  );
}