import React from 'react';
export default function Icon({name,size=19,...props}) {
 const paths={
  building:<><path d="M3 21h18M5 21V7l7-4 7 4v14M9 10h1m4 0h1M9 14h1m4 0h1M10 21v-4h4v4"/></>,
  grid:<><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></>,
  calendar:<><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4M17 3v4M3 10h18"/></>,
  user:<><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></>,
  plus:<path d="M12 5v14M5 12h14"/>,
  arrow:<path d="m15 18-6-6 6-6"/>,
  pin:<><path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></>,
  phone:<path d="M22 16.9v3a2 2 0 0 1-2.2 2A19 19 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7l.5 3a2 2 0 0 1-.6 1.8L7.2 10a16 16 0 0 0 6.8 6.8l1.5-1.8a2 2 0 0 1 1.8-.6l3 .5a2 2 0 0 1 1.7 2Z"/>,
  mail:<><rect x="2" y="4" width="20" height="16" rx="3"/><path d="m3 6 9 7 9-7"/></>,
  check:<path d="m5 12 4 4L19 6"/>,
  search:<><circle cx="11" cy="11" r="7"/><path d="m16 16 5 5"/></>
 };
 return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>{paths[name]||paths.building}</svg>;
}
