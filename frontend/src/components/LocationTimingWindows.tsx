
type TimingClass = 'AUSPICIOUS' | 'NON_AUSPICIOUS' | 'NEUTRAL';

interface TimingWindow {
  start: string;
  end: string;
  classification: TimingClass;
  reasons: readonly string[];
}

const labels: Record<TimingClass, string> = {
  AUSPICIOUS: 'Auspicious',
  NON_AUSPICIOUS: 'Non-auspicious',
  NEUTRAL: 'Neutral',
};

// Inputs come from a validated result contract. The live gateway does not
// provide qualified windows yet.
export function LocationTimingWindows({timezone, windows, ruleVersion, provenance}: {
  timezone: string;
  windows: readonly TimingWindow[];
  ruleVersion: string;
  provenance: string;
}) {
  const localTime = new Intl.DateTimeFormat('en-GB', {
    timeZone: timezone, month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit', timeZoneName: 'shortOffset',
  });

  return <section aria-label="Timing windows" className="space-y-4">
    <h3>Timing windows</h3>
    <p>{timezone}</p>
    {windows.length === 0 ? <p>No timing windows are available.</p> :
      <ol className="space-y-3">
        {windows.map(window => <li key={window.start} className="rounded border border-rose-700 p-3">
          <h4>{labels[window.classification]}</h4>
          <p><time dateTime={window.start}>{localTime.format(new Date(window.start))}</time>
            {' to '}<time dateTime={window.end}>{localTime.format(new Date(window.end))}</time></p>
          <ul className="list-disc pl-6">
            {window.reasons.map(reason => <li key={reason}>{reason}</li>)}
          </ul>
        </li>)}
      </ol>}
    <p>Rule version {ruleVersion} · {provenance}</p>
  </section>;
}
