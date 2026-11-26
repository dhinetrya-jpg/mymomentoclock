// Offline contract fixture only. No product imports, model calls or user data.
import assert from 'node:assert/strict';
import {test} from 'node:test';

const slots = ['activity', 'city', 'date'];
const clarify = (...missing) => ({decision: 'CLARIFY', missing, facts: []});
const abstain = () => ({decision: 'ABSTAIN', missing: [], facts: []});
const explain = (...facts) => ({decision: 'EXPLAIN', missing: [], facts});

function validSelection(candidate, allowed) {
  if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate) ||
      Object.keys(candidate).sort().join(',') !== 'decision,facts,missing' ||
      !Array.isArray(candidate.missing) || !Array.isArray(candidate.facts)) return false;
  return candidate.decision === allowed.decision &&
    candidate.missing.length === allowed.missing.length &&
    allowed.missing.every((slot, index) => slot === candidate.missing[index]) &&
    candidate.facts.length === allowed.facts.length &&
    allowed.facts.every((fact, index) => fact === candidate.facts[index]);
}

async function exerciseFixture(input, adapter) {
  const missing = slots.filter(slot => !input.selection[slot]);
  if (missing.length) return {source: 'template', ...clarify(...missing)};
  if (!input.confirmed || !input.syntheticEligible || !input.selection.binding ||
      input.snapshot?.binding !== input.selection.binding || !input.snapshot.factIds?.length) {
    return {source: 'template', ...abstain()};
  }
  // Only typed IDs derived from trusted synthetic facts go to the fake adapter.
  const facts = Object.freeze([...input.snapshot.factIds]);
  try {
    const decision = await adapter(facts);
    if (validSelection(decision, explain(...facts))) {
      return {source: 'fixture', ...explain(...facts)};
    }
  } catch {
    // The test adapter may fail or refuse. No returned prose is trusted.
  }
  return {source: 'template', ...abstain()};
}

const selection = Object.freeze({activity: 'interview', city: 'New York',
  date: '2028-04-15', binding: 'fixture-1'});
const complete = Object.freeze({confirmed: true, syntheticEligible: true, selection,
  snapshot: Object.freeze({binding: 'fixture-1', factIds: Object.freeze(['city', 'local-date'])})});

test('unavailable, unconfirmed and mismatched snapshots never call the fake adapter', async () => {
  let calls = 0;
  const adapter = () => { calls++; return explain('city', 'local-date'); };
  for (const input of [
    {...complete, syntheticEligible: false},
    {...complete, confirmed: false},
    {...complete, snapshot: null},
    {...complete, snapshot: {binding: 'fixture-1', factIds: []}},
    {...complete, selection: {...selection, binding: undefined}, snapshot: {}},
    {...complete, snapshot: {...complete.snapshot, binding: 'different-fixture'}},
  ]) assert.deepEqual(await exerciseFixture(input, adapter), {source: 'template', ...abstain()});
  assert.equal(calls, 0);
});

test('missing or ambiguous selections clarify only the unresolved slots', async () => {
  for (const missing of [['activity'], ['city'], ['date'], ['city', 'date']]) {
    const partial = {...selection};
    for (const slot of missing) delete partial[slot];
    assert.deepEqual(await exerciseFixture({...complete, selection: partial}, () => {
      assert.fail('unresolved selection reached the fake adapter');
    }), {source: 'template', ...clarify(...missing)});
  }
});

test('the fake adapter receives fact IDs only and cannot add facts or prose', async () => {
  const input = {...complete, privateCanary: 'fixture-only-unused-private-input'};
  assert.deepEqual(await exerciseFixture(input, (...argumentsReceived) => {
    assert.deepEqual(argumentsReceived, [['city', 'local-date']]);
    return explain('city', 'local-date');
  }), {source: 'fixture', ...explain('city', 'local-date')});
  for (const proposal of [
    null, 'unstructured response',
    {decision: 'EXPLAIN', missing: [], facts: new Array(2)},
    explain('city', 'invented-window'), explain('local-date', 'local-date'),
    {...explain('city', 'local-date'), prose: 'A guaranteed outcome'},
    {...explain('city', 'local-date'), time: '14:00'},
    {decision: 'EXPLAIN', missing: ['birthTime'], facts: ['city', 'local-date']},
  ]) assert.deepEqual(await exerciseFixture(input, () => proposal), {source: 'template', ...abstain()});
});

test('adapter refusal and simulated timeout produce deterministic abstention', async () => {
  for (const code of ['REFUSED', 'TIMEOUT']) {
    assert.deepEqual(await exerciseFixture(complete, async () => {throw Error(code);}),
      {source: 'template', ...abstain()});
  }
});
