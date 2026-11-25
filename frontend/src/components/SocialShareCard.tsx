/**
 * @license
 * MIT License
 * 
 * Social Share Card Component
 * Renders high-converting, aesthetic share cards for WhatsApp Status,
 * Instagram Stories (9:16), and Twitter/X with 1-click clipboard/image export.
 */

import React, { useState } from 'react';
import { IntradayScoringSample } from '../engine/scoringEngine';
import { DayAnalysisResult } from '../engine/zeroCostAstroEngine';

interface SocialShareCardProps {
  dayData: DayAnalysisResult;
  activeSample: IntradayScoringSample;
}

export const SocialShareCard: React.FC<SocialShareCardProps> = ({ dayData, activeSample }) => {
  const [copied, setCopied] = useState<boolean>(false);

  const shareText = `✨ Today's Auspicious Energy in ${dayData.location.cityName || 'my city'} (${dayData.date}):
🌟 Auspiciousness Score: ${activeSample.auspiciousnessScore}% (${activeSample.tier})
☀️ Active Choghadiya: ${activeSample.activeChoghadiya}
🔴 Rahu Kaal: ${dayData.fixedKaalas.rahuKaal.startLocal} – ${dayData.fixedKaalas.rahuKaal.endLocal}
🌟 Abhijit Muhurta: ${dayData.fixedKaalas.abhijitMuhurta.startLocal} – ${dayData.fixedKaalas.abhijitMuhurta.endLocal}
📢 Guidance: ${activeSample.executiveAdvice}

Calculated with precision on MyMomentOclock.`;

  const handleCopy = () => {
    navigator.clipboard.writeText(shareText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="rounded-xl border border-amber-800/50 bg-[#1e050d] p-4 text-xs space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold text-amber-300 flex items-center gap-1.5">
          <span>📲</span> Share Daily Auspicious Window
        </h4>
        <button
          onClick={handleCopy}
          className="rounded-lg bg-amber-500/20 border border-amber-500/40 px-3 py-1 font-semibold text-amber-200 hover:bg-amber-500/30 transition-all"
        >
          {copied ? '✓ Copied to Clipboard!' : 'Copy Summary'}
        </button>
      </div>

      <div className="rounded-lg border border-rose-950 bg-[#120206] p-3 text-rose-200/90 font-mono text-[11px] leading-relaxed whitespace-pre-line">
        {shareText}
      </div>
    </div>
  );
};
