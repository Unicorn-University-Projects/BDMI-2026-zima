import React, { useState } from 'react';

import Icon from '../Icons';
import { addMonths, buildMonthGrid, monthTitle, WEEKDAY_SHORT } from '../../utils/calendarGrid';
import { fromIsoDate, toIsoDate, today } from '../../utils/searchParams';

import '../../styles/calendar.css';

// ==========================================
// KALENDÁŘ
// ==========================================
//
// Měsíční mřížka pro výběr jednoho dne. Návrh samostatný kalendář nemá,
// vzhled proto skládáme z designových tokenů a stavů buňky Day
// (dnešek, vybráno, nedostupné).

export default function Calendar({ value, onSelect, minDate = today() }) {
  const selected = fromIsoDate(value);
  const start = selected ?? today();

  const [view, setView] = useState({
    year: start.getFullYear(),
    month: start.getMonth()
  });

  const weeks = buildMonthGrid(view.year, view.month);
  const minIso = toIsoDate(minDate);
  const todayIso = toIsoDate(today());

  function move(step) {
    setView(previous => addMonths(previous.year, previous.month, step));
  }

  return (
    <div className="calendar">

      <div className="calendar-header">
        <button
          type="button"
          className="calendar-nav"
          onClick={() => move(-1)}
          aria-label="Předchozí měsíc"
        >
          <Icon name="chevronDown" size={18} style={{ transform: 'rotate(90deg)' }} />
        </button>

        <strong className="calendar-title">{monthTitle(view.year, view.month)}</strong>

        <button
          type="button"
          className="calendar-nav"
          onClick={() => move(1)}
          aria-label="Další měsíc"
        >
          <Icon name="chevronDown" size={18} style={{ transform: 'rotate(-90deg)' }} />
        </button>
      </div>

      <div className="calendar-weekdays" aria-hidden="true">
        {WEEKDAY_SHORT.map(day => (
          <span key={day}>{day}</span>
        ))}
      </div>

      <div className="calendar-grid" role="grid">
        {weeks.map((week, index) => (
          <div className="calendar-week" role="row" key={index}>
            {week.map(day => {
              // Do minulosti se hledat nedá.
              const disabled = day.iso < minIso;
              const classes = [
                'calendar-day',
                day.inMonth ? '' : 'outside',
                day.iso === value ? 'selected' : '',
                day.iso === todayIso ? 'today' : ''
              ]
                .filter(Boolean)
                .join(' ');

              return (
                <button
                  type="button"
                  role="gridcell"
                  key={day.iso}
                  className={classes}
                  disabled={disabled}
                  aria-current={day.iso === todayIso ? 'date' : undefined}
                  aria-selected={day.iso === value}
                  onClick={() => onSelect(day.iso)}
                >
                  {day.dayOfMonth}
                </button>
              );
            })}
          </div>
        ))}
      </div>

    </div>
  );
}