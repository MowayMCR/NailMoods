import React from 'react';

// Compact existing actions: visible icon, accessible name, native tooltip,
// keyboard focus and a touch target of at least 44 pixels.
export default function IconAction({icon:Icon,label,pressed,...props}) {
 return <button type="button" {...props} className={'nmIconAction '+(props.className||'')} aria-label={label} title={label} aria-pressed={pressed}><Icon size={20} strokeWidth={1.7} aria-hidden="true"/></button>;
}
