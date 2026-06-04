export const lithologyPatterns: { [key: string]: string } = {
  dots: `
    <pattern id="pattern-dots" patternUnits="userSpaceOnUse" width="10" height="10">
      <circle cx="5" cy="5" r="1.5" fill="currentColor" opacity="0.6"/>
    </pattern>
  `,
  crosshatch: `
    <pattern id="pattern-crosshatch" patternUnits="userSpaceOnUse" width="8" height="8">
      <path d="M0,0 L8,8 M8,0 L0,8" stroke="currentColor" stroke-width="1" opacity="0.5"/>
    </pattern>
  `,
  diagonal: `
    <pattern id="pattern-diagonal" patternUnits="userSpaceOnUse" width="8" height="8">
      <path d="M-2,2 L2,-2 M6,10 L10,6" stroke="currentColor" stroke-width="1" opacity="0.5"/>
    </pattern>
  `,
  vertical: `
    <pattern id="pattern-vertical" patternUnits="userSpaceOnUse" width="6" height="6">
      <line x1="3" y1="0" x2="3" y2="6" stroke="currentColor" stroke-width="1" opacity="0.5"/>
    </pattern>
  `,
  horizontal: `
    <pattern id="pattern-horizontal" patternUnits="userSpaceOnUse" width="6" height="6">
      <line x1="0" y1="3" x2="6" y2="3" stroke="currentColor" stroke-width="1" opacity="0.5"/>
    </pattern>
  `,
  brick: `
    <pattern id="pattern-brick" patternUnits="userSpaceOnUse" width="12" height="8">
      <rect x="0" y="0" width="11" height="3" fill="none" stroke="currentColor" stroke-width="0.5" opacity="0.6"/>
      <rect x="6" y="4" width="11" height="3" fill="none" stroke="currentColor" stroke-width="0.5" opacity="0.6"/>
    </pattern>
  `,
  wavy: `
    <pattern id="pattern-wavy" patternUnits="userSpaceOnUse" width="20" height="8">
      <path d="M0,4 Q5,0 10,4 T20,4" fill="none" stroke="currentColor" stroke-width="1" opacity="0.5"/>
    </pattern>
  `,
  solid: `
    <pattern id="pattern-solid" patternUnits="userSpaceOnUse" width="4" height="4">
      <rect width="4" height="4" fill="currentColor" opacity="0.3"/>
    </pattern>
  `,
  random: `
    <pattern id="pattern-random" patternUnits="userSpaceOnUse" width="15" height="15">
      <polygon points="7.5,0 15,15 0,15" fill="currentColor" opacity="0.4"/>
      <circle cx="3" cy="3" r="1" fill="currentColor" opacity="0.5"/>
      <circle cx="12" cy="10" r="1.5" fill="currentColor" opacity="0.4"/>
    </pattern>
  `,
};

export const getPatternFill = (pattern: string): string => {
  return `url(#pattern-${pattern})`;
};

export const getAllPatterns = (): string => {
  return Object.values(lithologyPatterns).join('');
};
