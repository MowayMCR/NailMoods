import React, { useId } from 'react';
import { Sparkles } from 'lucide-react';
import { ICON_BOARDS } from './iconAtlas';
import { resolveIcon } from './iconRegistry';

// Decorative: the adjacent text remains the accessible name. Source PNGs stay
// unchanged; viewports omit captions and the filter clears the board background.
export default function MoodGlyph({ value = '', className = '', fallback = true }) {
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const icon = resolveIcon(value);
  if (!icon) return fallback ? <Sparkles className={'moodGlyph ' + className} size={20} strokeWidth={1.35} aria-hidden="true" focusable="false" /> : null;
  const [board, x, y, width, height] = icon;
  return <svg className={'moodGlyph illustratedGlyph ' + className} viewBox={`${x} ${y} ${width} ${height}`} width="32" height="32" preserveAspectRatio="xMidYMid meet" aria-hidden="true" focusable="false" data-pictogram={value}>
    <defs>
      <clipPath id={id+'clip'}><rect x={x} y={y} width={width} height={height}/></clipPath>
      <filter id={id+'background'} filterUnits="userSpaceOnUse" x={x} y={y} width={width} height={height} colorInterpolationFilters="sRGB">
        <feColorMatrix type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  4 4 4 0 -0.5"/>
      </filter>
    </defs>
    <g clipPath={`url(#${id}clip)`}><image href={`${import.meta.env.BASE_URL}icons/${ICON_BOARDS[board]}`} width="1229" height="1536" filter={`url(#${id}background)`}/></g>
  </svg>;
}
