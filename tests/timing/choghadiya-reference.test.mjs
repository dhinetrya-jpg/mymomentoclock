// Offline arithmetic fixture. This file is never imported by the product.
// Daytime Thursday order and category names: BAPS Nirnay 2003, Choghadiyos.
// https://www.swaminarayan.org/calendar/2003/choghadiyo.htm
import assert from 'node:assert/strict';
import test from 'node:test';

const cycle = ['Udveg', 'Chal', 'Labh', 'Amrut', 'Kal', 'Shubh', 'Rog'];
const weekdayOffsets = [0, 3, 6, 2, 5, 1, 4];
const weekdayNames = dayIndex => Array.from({length: 8},
  (_, slot) => cycle[(weekdayOffsets[dayIndex] + slot) % cycle.length]);
const favorable = new Set(['Amrut', 'Shubh', 'Labh']);
const unfavorable = new Set(['Udveg', 'Rog', 'Kal']);
const zone = 'Asia/Kolkata';
const day = '2026-03-19';
// Independent archived DE421, fixed apparent center −50′, Kolkata at sea level.
// Millisecond truncation in the JS fixture is below the diagnostic's 10 s band.
const sunrise = Date.parse('2026-03-19T00:11:52.435Z');
const sunset = Date.parse('2026-03-19T12:17:08.611Z');
const dateInKolkata = new Intl.DateTimeFormat('en-CA', {timeZone: zone,
  year: 'numeric', month: '2-digit', day: '2-digit'});

function windows(rise, set) {
  if (!Number.isFinite(rise) || !Number.isFinite(set) || rise >= set ||
      dateInKolkata.format(rise) !== day || dateInKolkata.format(set) !== day) return [];
  const edge = i => rise + (set - rise) * i / 8;
  return weekdayNames(4).map((name, i) => ({
    name, start: edge(i), end: edge(i + 1),
    classification: favorable.has(name) ? 'AUSPICIOUS' :
      unfavorable.has(name) ? 'NON_AUSPICIOUS' : 'NEUTRAL',
  }));
}

test('rotation agrees with each of the 56 published daytime cells', () => {
  const printedColumns = [
    'Udveg Chal Labh Amrut Kal Shubh Rog Udveg',
    'Amrut Kal Shubh Rog Udveg Chal Labh Amrut',
    'Rog Udveg Chal Labh Amrut Kal Shubh Rog',
    'Labh Amrut Kal Shubh Rog Udveg Chal Labh',
    'Shubh Rog Udveg Chal Labh Amrut Kal Shubh',
    'Chal Labh Amrut Kal Shubh Rog Udveg Chal',
    'Kal Shubh Rog Udveg Chal Labh Amrut Kal',
  ];
  assert.deepEqual(printedColumns.map((_, weekday) => weekdayNames(weekday)),
    printedColumns.map(column => column.split(' ')));
});

test('the published 706-minute example divides into eight 88m15s slots', () => {
  const standardRise = Date.parse('2026-03-19T01:09:00Z');
  const standardSet = Date.parse('2026-03-19T12:55:00Z');
  const result = windows(standardRise, standardSet);
  assert.equal(result.length, 8);
  for (const {start, end} of result) assert.equal(end - start, 5295000);
});

test('Kolkata reference yields Thursday windows with all three classifications', () => {
  const result = windows(sunrise, sunset);
  const expectedStarts = [
    '00:11:52.435', '01:42:31.957', '03:13:11.479', '04:43:51.001',
    '06:14:30.523', '07:45:10.045', '09:15:49.567', '10:46:29.089',
  ];
  assert.deepEqual(result.map(w => new Date(w.start).toISOString().slice(11, 23)), expectedStarts);
  assert.deepEqual(result.map(w => w.classification), [
    'AUSPICIOUS', 'NON_AUSPICIOUS', 'NON_AUSPICIOUS', 'NEUTRAL',
    'AUSPICIOUS', 'AUSPICIOUS', 'NON_AUSPICIOUS', 'AUSPICIOUS',
  ]);
  assert.equal(result.at(-1).end, sunset);
  const at = instant => result.find(w => w.start <= instant && instant < w.end)?.name;
  assert.equal(at(sunrise - 1), undefined);
  assert.equal(at(sunrise), 'Shubh');
  assert.equal(at(result[1].start), 'Rog');
  assert.equal(at(sunset), undefined);
});

test('missing, reversed or off-date solar events yield no fixture windows', () => {
  for (const pair of [[null, sunset], [sunrise, undefined], [sunset, sunrise],
    [sunrise, sunset + 86400000], [sunrise, sunrise]]) {
    assert.deepEqual(windows(...pair), []);
  }
});

test('uncertainty crossing a category boundary requires abstention', () => {
  // Synthetic ±2 s endpoint bounds exercise the rule. No production guard
  // band is inferred from the retrospective comparison.
  const earliest = windows(sunrise - 2000, sunset - 2000);
  const latest = windows(sunrise + 2000, sunset + 2000);
  const classification = instant => earliest.find((window, index) =>
    latest[index].start <= instant && instant < window.end)?.classification ?? 'UNAVAILABLE';
  for (const window of windows(sunrise, sunset).slice(1)) {
    assert.equal(classification(window.start), 'UNAVAILABLE');
    assert.equal(classification(window.start + 2001), window.classification);
  }
  assert.equal(classification(sunrise), 'UNAVAILABLE');
  assert.equal(classification(sunset), 'UNAVAILABLE');
});
