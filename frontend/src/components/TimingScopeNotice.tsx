import React from 'react';
import { CalculationScope } from '../engine/diwaliData';
export function TimingScopeNotice({scope}: {scope: CalculationScope}): React.ReactElement {
  const labels: Record<CalculationScope, string> = {
    GENERAL_LOCATION_BASED: 'General location timing; no natal personalization.',
    NATAL_SUPPORTED: 'Natal factors applied; this is not an outcome probability.',
    NATAL_LIMITED: 'Limited natal factors; a complete personal recommendation is unavailable.',
    UNAVAILABLE: 'Personal timing unavailable; no calculated window is supplied.',
  };
  return <span role="status" className="text-xs text-amber-200">{labels[scope] || labels.UNAVAILABLE}</span>;
}
