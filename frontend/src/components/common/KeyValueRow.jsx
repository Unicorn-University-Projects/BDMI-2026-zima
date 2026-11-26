import React from 'react';

// ==========================================
// ŘÁDEK POPIS–HODNOTA
// ==========================================
//
// V návrhu komponenta „Key value“, podle jejího popisu ji sdílí souhrn
// rezervace, detail rezervace i údaje sportoviště. Varianta strong nese
// hlavní údaj obrazovky – v souhrnu rezervace je to cena.
//
// Patří dovnitř <dl>, protože dt a dd nesmí stát samostatně.

export default function KeyValueRow({ label, value, strong = false, className = '' }) {
  return (
    <div className={`key-value ${strong ? 'strong' : ''} ${className}`.trim()}>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
