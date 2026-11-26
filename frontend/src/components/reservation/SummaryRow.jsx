import React from 'react';

// ==========================================
// ŘÁDEK SOUHRNU (popis – hodnota)
// ==========================================
//
// V návrhu komponenta „Key value“. Varianta strong nese hlavní údaj
// obrazovky, v souhrnu rezervace je to cena.

export default function SummaryRow({ label, value, strong = false, className = '' }) {
  return (
    <div className={`summary-row ${strong ? 'strong' : ''} ${className}`.trim()}>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
