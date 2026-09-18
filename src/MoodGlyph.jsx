import React from 'react';
import { MoonStar, Flower2, Orbit, Leaf, Sparkles, Sun, Flame, Waves, Gem, Circle } from 'lucide-react';

function Bow({ size, strokeWidth, ...props }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M11 11C3 2 1 8 4 12c2 2 5 1 7-1Zm2 0c8-9 10-3 7 1-2 2-5 1-7-1ZM10 13l-3 7m7-7 3 7" /><circle cx="12" cy="12" r="1.5" /></svg>;
}

// Decorative only: the adjacent label remains the accessible name.
export default function MoodGlyph({ value = '', className = '' }) {
  const text = value.toLocaleLowerCase('fr');
  const Icon = /witch|myst|goth|dark|halloween/.test(text) ? MoonStar
    : /celestial|galaxy|cosmi/.test(text) ? Orbit
    : /girly|coquette|kawaii/.test(text) ? Bow
    : /roman|floral|fleur|printemps|valentin|douce/.test(text) ? Flower2
    : /nature|cottage|fairy|automne/.test(text) ? Leaf
    : /minimal|clean|calme/.test(text) ? Circle
    : /chic|old money|vintage/.test(text) ? Gem
    : /joy|fruit/.test(text) ? Sun
    : /audac|punk|rock|grunge/.test(text) ? Flame
    : /océan|marbr/.test(text) ? Waves : Sparkles;
  return <Icon className={'moodGlyph ' + className} size={20} strokeWidth={1.35} aria-hidden="true" focusable="false" />;
}
