import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import BackLink from '../../components/common/BackLink';
import { getSportsGround, getVenue, setOpeningHoursAndPriceList } from '../../calls/venues';
import '../../styles/opening-hours-pricing.css';

const DAY_NAMES = ['Pondělí', 'Úterý', 'Středa', 'Čtvrtek', 'Pátek', 'Sobota', 'Neděle'];
const SHORT = ['Po', 'Út', 'St', 'Čt', 'Pá', 'So', 'Ne'];
const defaults = () => DAY_NAMES.map((_, i) => ({ dayOfWeek: i + 1, enabled: i !== 6, from: '08:00', to: '22:00' }));
const minutes = (s) => /^([01]\d|2[0-3]):[0-5]\d$/.test(s || '') ? Number(s.slice(0, 2)) * 60 + Number(s.slice(3)) : NaN;

export default function OpeningHoursPricing() {
  const { id, sportsGroundId } = useParams();
  const navigate = useNavigate();
  const [venue, setVenue] = useState(null);
  const [ground, setGround] = useState(null);
  const [days, setDays] = useState(defaults);
  const [regularPrice, setRegularPrice] = useState('');
  const [hasPeak, setHasPeak] = useState(false);
  const [peakPrice, setPeakPrice] = useState('');
  const [peakDays, setPeakDays] = useState([1, 2, 3, 4, 5]);
  const [peakFrom, setPeakFrom] = useState('17:00');
  const [peakTo, setPeakTo] = useState('21:00');
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [serverError, setServerError] = useState('');
  const detailUrl = `/arealy/${id}/sportoviste/${sportsGroundId}`;

  useEffect(() => {
    let alive = true;
    Promise.all([getVenue(id), getSportsGround(sportsGroundId)]).then(([v, g]) => {
      if (!alive) return;
      setVenue(v); setGround(g);
      if (g.openingHours?.length) {
        setDays(defaults().map((d) => {
          const existing = g.openingHours.find(x => Number(x.dayOfWeek) === d.dayOfWeek);
          return existing ? { ...d, enabled: !existing.isClosed && !!existing.openFrom && !!existing.openTo, from: existing.openFrom || d.from, to: existing.openTo || d.to } : d;
        }));
      }
      const p = g.priceList;
      if (p) {
        setRegularPrice(String(p.regularPrice ?? g.regularPrice ?? ''));
        setHasPeak(!!p.hasPeak);
        setPeakPrice(String(p.peakPrice ?? g.peakPrice ?? ''));
        setPeakDays(p.peakDays?.map(Number) ?? [1, 2, 3, 4, 5]);
        setPeakFrom(p.peakFrom || '17:00'); setPeakTo(p.peakTo || '21:00');
      } else if (g.regularPrice != null) setRegularPrice(String(g.regularPrice));
    }).catch(e => { if (alive) setServerError(e.message || 'Nepodařilo se načíst nastavení.'); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [id, sportsGroundId]);

  const changeDay = (index, change) => setDays(old => old.map((d, i) => i === index ? { ...d, ...change } : d));
  const applyMonday = () => setDays(old => old.map(d => ({ ...d, enabled: old[0].enabled, from: old[0].from, to: old[0].to })));
  const togglePeakDay = day => setPeakDays(old => old.includes(day) ? old.filter(x => x !== day) : [...old, day].sort());

  function validate() {
    const next = {};
    if (!days.some(d => d.enabled)) next.days = 'Otevřete alespoň jeden den.';
    days.forEach((d, i) => {
      if (d.enabled && !(minutes(d.from) < minutes(d.to))) next[`day${i}`] = 'Konec musí být později než začátek.';
    });
    if (!Number.isFinite(Number(regularPrice)) || Number(regularPrice) <= 0 || regularPrice.trim() === '') next.regularPrice = 'Zadej cenu větší než 0 Kč.';
    if (hasPeak) {
      if (!Number.isFinite(Number(peakPrice)) || Number(peakPrice) <= 0 || peakPrice.trim() === '') next.peakPrice = 'Zadej cenu větší než 0 Kč.';
      if (!peakDays.length) next.peakDays = 'Vyber alespoň jeden den špičky.';
      if (!(minutes(peakFrom) < minutes(peakTo))) next.peakTime = 'Konec špičky musí být později než začátek.';
      if (peakDays.some(day => {
        const d = days[day - 1];
        return !d.enabled || minutes(peakFrom) < minutes(d.from) || minutes(peakTo) > minutes(d.to);
      })) next.peakTime = 'Musí být v rámci otevírací doby vybraných dnů.';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function save(e) {
    e.preventDefault(); setServerError('');
    if (!validate()) return;
    setSaving(true);
    try {
      await setOpeningHoursAndPriceList({
        id: sportsGroundId,
        openingHours: days.map(d => ({ dayOfWeek: d.dayOfWeek, isClosed: !d.enabled, openFrom: d.enabled ? d.from : null, openTo: d.enabled ? d.to : null })),
        priceList: {
          regularPrice: Number(regularPrice), hasPeak,
          ...(hasPeak ? { peakPrice: Number(peakPrice), peakDays, peakFrom, peakTo } : {})
        }
      });
      navigate(detailUrl, { replace: true, state: { pricingSaved: true } });
    } catch (e) { setServerError(e.message || 'Nastavení se nepodařilo uložit.'); }
    finally { setSaving(false); }
  }

  if (loading) return <div className="ohp-page">Načítám nastavení…</div>;
  return <div className="ohp-page">
    <BackLink className="ohp-back" to={`/arealy/${id}`}>← &nbsp;{venue?.name || 'Zpět na areál'}</BackLink>
    <h1>Otevírací doba a ceník</h1>
    <p className="ohp-subtitle">{ground?.name || 'Sportoviště'} · {venue?.name || 'Areál'}</p>
    {(serverError || Object.keys(errors).length > 0) && <div className="ohp-alert" role="alert">ⓘ &nbsp;{serverError || 'Nastavení nejde uložit. Oprav chyby níže.'}</div>}
    <form onSubmit={save} noValidate>
      <div className="ohp-columns">
        <section className="ohp-card ohp-hours">
          <h2>Otevírací doba</h2><p className="ohp-hint">Konec musí být později než začátek.</p>
          <div className="ohp-day-list">{days.map((day, i) => <div className="ohp-day-row" key={day.dayOfWeek}>
            <label className="ohp-day-label"><input type="checkbox" checked={day.enabled} onChange={e => changeDay(i, { enabled: e.target.checked })}/><span className="ohp-switch"/><strong>{DAY_NAMES[i]}</strong></label>
            {day.enabled ? <div className="ohp-day-times"><input aria-label={`${DAY_NAMES[i]} od`} className={errors[`day${i}`] ? 'ohp-invalid' : ''} type="time" value={day.from} onChange={e => changeDay(i, { from: e.target.value })}/><span>–</span><input aria-label={`${DAY_NAMES[i]} do`} className={errors[`day${i}`] ? 'ohp-invalid' : ''} type="time" value={day.to} onChange={e => changeDay(i, { to: e.target.value })}/></div> : <span className="ohp-closed">Zavřeno</span>}
            {errors[`day${i}`] && <small className="ohp-field-error">{errors[`day${i}`]}</small>}
          </div>)}</div>
          {errors.days && <small className="ohp-field-error">{errors.days}</small>}
          <button type="button" className="ohp-copy" onClick={applyMonday}>↕ &nbsp;Použít čas pondělí pro všechny dny</button>
        </section>
        <section className="ohp-card ohp-pricing">
          <h2>Ceník (za 1 hodinu)</h2>
          <label className="ohp-field-label" htmlFor="ohp-regular">Běžná cena (Kč) *</label>
          <input id="ohp-regular" className={`ohp-full-input ${errors.regularPrice ? 'ohp-invalid' : ''}`} type="number" min="0" step="any" value={regularPrice} onChange={e => setRegularPrice(e.target.value)}/>
          {errors.regularPrice ? <small className="ohp-field-error">{errors.regularPrice}</small> : <p className="ohp-hint">Kladné číslo, cena za 1 hodinu.</p>}
          <div className="ohp-separator"/>
          <label className="ohp-peak-toggle"><span><strong>Cena ve špičce</strong><small>Jiná cena v nejžádanějších časech.</small></span><span className="ohp-day-label"><input type="checkbox" checked={hasPeak} onChange={e => setHasPeak(e.target.checked)}/><span className="ohp-switch"/></span></label>
          {hasPeak && <div className="ohp-peak-panel">
            <label className="ohp-field-label" htmlFor="ohp-peak-price">Cena ve špičce (Kč) *</label>
            <input id="ohp-peak-price" className={`ohp-full-input ${errors.peakPrice ? 'ohp-invalid' : ''}`} type="number" min="0" step="any" value={peakPrice} onChange={e => setPeakPrice(e.target.value)}/>
            {errors.peakPrice && <small className="ohp-field-error">{errors.peakPrice}</small>}
            <span className="ohp-field-label">Dny špičky *</span>
            <div className="ohp-peak-days">{SHORT.map((short, i) => <button type="button" key={short} className={peakDays.includes(i + 1) ? 'selected' : ''} aria-pressed={peakDays.includes(i + 1)} onClick={() => togglePeakDay(i + 1)}>{short}</button>)}</div>
            {errors.peakDays && <small className="ohp-field-error">{errors.peakDays}</small>}
            <div className="ohp-peak-times"><label>Špička od *<input className={errors.peakTime ? 'ohp-invalid' : ''} type="time" value={peakFrom} onChange={e => setPeakFrom(e.target.value)}/></label><label>Špička do *<input className={errors.peakTime ? 'ohp-invalid' : ''} type="time" value={peakTo} onChange={e => setPeakTo(e.target.value)}/></label></div>
            {errors.peakTime && <small className="ohp-field-error">{errors.peakTime}</small>}
            <p className="ohp-hint">Špička musí být v rámci otevírací doby.</p>
          </div>}
        </section>
      </div>
      <div className="ohp-footer"><p>ⓘ &nbsp;Po uložení se sportoviště zobrazí sportovcům ve vyhledávání.</p><div><Link className="ohp-cancel" to={detailUrl}>Zrušit</Link><button className="ohp-save" type="submit" disabled={saving}>{saving ? 'Ukládám…' : 'Uložit nastavení'}</button></div></div>
    </form>
  </div>;
}
