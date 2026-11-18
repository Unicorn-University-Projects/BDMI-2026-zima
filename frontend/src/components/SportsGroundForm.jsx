import React, { useState } from 'react';

// ==========================================
// FORMULÁŘ SPORTOVIŠTĚ
// ==========================================
//
// Stejná pole používá vytvoření (detail areálu) i úprava (detail
// sportoviště) – backend u obou příkazů očekává name, sportCode, surface
// a coverType.

const EMPTY_VALUES = {
  name: '',
  sportCode: 'tennis',
  surface: '',
  coverType: 'outdoor'
};

export default function SportsGroundForm({
  initialValues,
  submitLabel = 'Uložit sportoviště',
  errorMessage = 'Sportoviště se nepodařilo uložit.',
  onSubmit,
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

  async function handleSubmit(event) {
    event.preventDefault();
    const newErrors = validateForm();
    setFormErrors(newErrors);
    if (Object.keys(newErrors).length > 0) {
      return;
    }

    setSaving(true);
    try {
      await onSubmit({
        name: form.name.trim(),
        sportCode: form.sportCode.trim(),
        surface: form.surface.trim(),
        coverType: form.coverType
      });
    } catch (e) {
      setSubmitError(e.message || errorMessage);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="venue-sport-form" onSubmit={handleSubmit} noValidate>
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
        <button type="button" className="venue-btn-cancel" onClick={onCancel}>
          Zrušit
        </button>
        <button type="submit" className="venue-btn-submit" disabled={saving}>
          {saving ? 'Ukládám…' : submitLabel}
        </button>
      </div>
    </form>
  );
}