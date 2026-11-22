# UX-FAIL-01 F01 timeout implementation report

Date:2026-11-22. Worktree `/workspace/mymomentoclock-delivery`, pinned integration base `57a6bbe5cd2695fb7a69746ad322384009a6fbd2`. This is the scoped implementer's report, not an independent acceptance audit. No commits, PR, merge, deployment, live data or release authorization performed by this worker. Current implementation is dirty on top of the pinned base and must be bound to the final candidate SHA by the Delivery Lead.

## Authorized changes

Only these files were written:
- `src/components/BirthTimeExplorer.tsx`
- `frontend/src/components/BirthTimeExplorer.tsx`
- new `tests/f01/timeout-browser.mjs`

Both component copies remain byte-identical (SHA256 `6c7eaf895cda61a6c396ef4ed69c5939fe51b7655798dea3e06c98d7d7ab0332`). Browser regression SHA256 `e8573d8ec14c2520792dbbb39ec2cc695b68aec75e7596363fcdb3f3c78e371d`.

The active12000ms deadline records timeout before aborting. An owned timed-out request now shows a `role=alert` message: “The calculation took too long. Please try again when you are ready. No estimate was substituted.” Busy clears, old results remain removed, and retry remains a deliberate button action. Unmount clears controller ownership before aborting; result/error handlers check ownership so an obsolete request cannot update a newer or unmounted screen. Superseding a request still aborts the prior one; obsolete finally handlers cannot clear the new busy state. Existing scientific/refusal validation and flags are unchanged.

## Actual verification

1. `node --check tests/f01/timeout-browser.mjs` — PASS.
2. `npm run lint` — PASS, `/tmp/delivery-f01-timeout-lint.log`.
3. `npm --prefix frontend run lint` — PASS, `/tmp/delivery-f01-timeout-frontend-lint.log`.
4. `node --import tsx tests/f01/contracts.test.tsx` —12 tests passed,0 failed,0 skipped; `/tmp/delivery-f01-timeout-contracts.log`. The first unprivileged invocation hit local-listener EPERM and was not counted as a product result; the authorized local-listener rerun passed.
5. Server health verified at `http://127.0.0.1:3101/health` before browser tests; `/tmp/delivery-f01-timeout-health.json`. Server/build were supplied by the Delivery Lead, not independently rebuilt by this worker.
6. `CHROMIUM_PATH=/usr/bin/chromium F01_WEB_URL=http://127.0.0.1:3101 node tests/f01/timeout-browser.mjs` —6/6 PASS, exit0; `/tmp/delivery-f01-timeout-browser.log`.
7. Scoped `git diff --check` — PASS.

Browser output:
```text
F01 375px active-timeout-and-retry: passed; only12s deadline accelerated, synthetic POST data, no automatic retry or release claim.
F01 375px unmount-is-silent: passed; only12s deadline accelerated, synthetic POST data, no automatic retry or release claim.
F01 375px supersession-is-silent: passed; only12s deadline accelerated, synthetic POST data, no automatic retry or release claim.
F01 1280px active-timeout-and-retry: passed; only12s deadline accelerated, synthetic POST data, no automatic retry or release claim.
F01 1280px unmount-is-silent: passed; only12s deadline accelerated, synthetic POST data, no automatic retry or release claim.
F01 1280px supersession-is-silent: passed; only12s deadline accelerated, synthetic POST data, no automatic retry or release claim.
```

The browser test uses the actual built application/component, its real browser fetch and AbortSignal, with synthetic route-intercepted responses/pending requests. Only setTimeout delay===12000 is accelerated to750ms; source search confirms the F01 deadline is the only such application timer. It does not advance unrelated clocks. It tests expiration handling, not a12second wall-clock measurement. Service workers are blocked in this isolated component test; PWA/cache/update integration is a separate worker's evidence.

At375/1280 each:
- Seed an unverified synthetic result, submit a second real pending fetch, observe busy and removal of old result, cross the accelerated deadline, observe accessible nontechnical alert and enabled retry, verify no automatic request, then deliberately retry and recover.
- Submit pending fetch then navigate away; after the deadline and late response, remount has blank input, no old result/error and no automatic request.
- Inject a test-only second form-submit event while the real UI button is disabled to exercise supersession; newest result wins over an old late503, old timers/errors do not leak and busy clears correctly. This forced race is not normal user double-click behavior.
- Requests remain POST with no query data and cache:no-store. No synthetic date/coordinates/timezone appear in page/request URLs or local/session storage. This does not claim a full application persistence/cache audit.

No actual astronomical accuracy, user acceptance, screen-reader/device-matrix acceptance or customer release is claimed.

## Exact component diff

```diff
diff --git a/frontend/src/components/BirthTimeExplorer.tsx b/frontend/src/components/BirthTimeExplorer.tsx
index 37e5bd0..291145b 100644
--- a/frontend/src/components/BirthTimeExplorer.tsx
+++ b/frontend/src/components/BirthTimeExplorer.tsx
@@ -17,6 +17,7 @@ const meaning=(factor:string,value:string)=>{
  return value;
 };
 const factorTitle=(key:string)=>key.split('.').map(v=>v.replace(/_/g,' ')).join(' — ');
+const timeoutMessage='The calculation took too long. Please try again when you are ready. No estimate was substituted.';
 
 
 export function BirthTimeExplorer(){
@@ -38,12 +39,13 @@ export function BirthTimeExplorer(){
  const [error,setError]=useState('');
  const [showAll,setShowAll]=useState(false);
  const abort=useRef<AbortController|null>(null);
- useEffect(()=>()=>abort.current?.abort(),[]);
+ useEffect(()=>()=>{const current=abort.current;abort.current=null;current?.abort();},[]);
  const update=()=>{setResult(null);setError('')};
  const submit=async(event:React.FormEvent<HTMLFormElement>)=>{
   event.preventDefault();abort.current?.abort();setResult(null);setError('');setBusy(true);
   const c=new AbortController();abort.current=c;
-  const timeout=setTimeout(()=>c.abort(),12000);
+  let timedOut=false;
+  const timeout=setTimeout(()=>{if(abort.current===c){timedOut=true;c.abort();}},12000);
   const request={schema_version:1,birth_date:date,certainty,timezone,latitude:Number(lat),longitude:Number(lon),
    ...(certainty==='RANGE'?{earliest_time:earliest,latest_time:latest,...(latestDate?{latest_date:latestDate}:{}),...(earliestOffset?{earliest_utc_offset:Number(earliestOffset)}:{}),...(latestOffset?{latest_utc_offset:Number(latestOffset)}:{})}:certainty==='UNKNOWN'?{}:{birth_time:clock,...(offset?{utc_offset:Number(offset)}:{})}),
    ...(certainty==='APPROXIMATE'?{uncertainty_minutes:uncertainty}:{})};
@@ -52,8 +54,8 @@ export function BirthTimeExplorer(){
    const body=await res.json();
    if(!res.ok)throw Error(typeof body.code==='string'?body.code:'F01_UNAVAILABLE');
    if(body.status!=='COMPUTED_UNVERIFIED'||body.customer_timing_authorized!==false||body.btr_status!=='UNAVAILABLE_UNVALIDATED_DASHA_METHOD'||!Array.isArray(body.factors)||!Array.isArray(body.transition_brackets)||!Array.isArray(body.limitations))throw Error('INVALID_F01_RESPONSE');
-   if(!c.signal.aborted)setResult(body);
-  }catch(e){if(!c.signal.aborted)setError((e as Error).message)}finally{clearTimeout(timeout);if(abort.current===c){abort.current=null;setBusy(false)}}
+   if(abort.current===c&&!c.signal.aborted)setResult(body);
+  }catch(e){if(abort.current===c){if(timedOut)setError(timeoutMessage);else if(!c.signal.aborted)setError((e as Error).message)}}finally{clearTimeout(timeout);if(abort.current===c){abort.current=null;setBusy(false)}}
  };
  const inputClass='w-full rounded-lg border border-rose-700 bg-[#19060b] px-3 py-2 text-rose-100';
  return <section aria-labelledby="f01-title" className="mx-auto max-w-4xl space-y-5 text-rose-100">
@@ -81,7 +83,7 @@ export function BirthTimeExplorer(){
    <p className="text-xs text-rose-200/80">Birthplace is not inferred from your current device location. Inputs are submitted for this calculation only; this screen does not save a profile.</p>
    <button disabled={busy} className="rounded-lg bg-amber-400 px-5 py-3 font-semibold text-neutral-950 disabled:opacity-50">{busy?'Inspecting possible charts…':'Explore birth-time possibilities'}</button>
   </form>
-  {error&&<div role="alert" className="rounded-lg border border-amber-600 p-4">Unable to calculate: {error}. Checked configurations or astronomical data may be unavailable. No estimate was substituted.</div>}
+  {error&&<div role="alert" className="rounded-lg border border-amber-600 p-4">{error===timeoutMessage?error:<>Unable to calculate: {error}. Checked configurations or astronomical data may be unavailable. No estimate was substituted.</>}</div>}
   {result&&<div aria-live="polite" className="space-y-4">
    <div role="status" className="rounded-xl border border-amber-600 p-4"><strong>Exploratory calculation — not independently approved</strong><p className="text-sm mt-2">Sampled {result.sample_count} birth instants from {new Date(result.start_utc).toLocaleString()} to {new Date(result.end_utc).toLocaleString()}. These dates are shown in your browser timezone; calculations use UTC and the supplied birth timezone.</p><p className="mt-2 text-xs">House system: {result.house_system}. Rectification: unavailable. Personal timing: disabled.</p></div>
    <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="font-serif text-xl text-amber-300">Rashi and Bhava Chalit comparison</h2>
diff --git a/src/components/BirthTimeExplorer.tsx b/src/components/BirthTimeExplorer.tsx
index 37e5bd0..291145b 100644
--- a/src/components/BirthTimeExplorer.tsx
+++ b/src/components/BirthTimeExplorer.tsx
@@ -17,6 +17,7 @@ const meaning=(factor:string,value:string)=>{
  return value;
 };
 const factorTitle=(key:string)=>key.split('.').map(v=>v.replace(/_/g,' ')).join(' — ');
+const timeoutMessage='The calculation took too long. Please try again when you are ready. No estimate was substituted.';
 
 
 export function BirthTimeExplorer(){
@@ -38,12 +39,13 @@ export function BirthTimeExplorer(){
  const [error,setError]=useState('');
  const [showAll,setShowAll]=useState(false);
  const abort=useRef<AbortController|null>(null);
- useEffect(()=>()=>abort.current?.abort(),[]);
+ useEffect(()=>()=>{const current=abort.current;abort.current=null;current?.abort();},[]);
  const update=()=>{setResult(null);setError('')};
  const submit=async(event:React.FormEvent<HTMLFormElement>)=>{
   event.preventDefault();abort.current?.abort();setResult(null);setError('');setBusy(true);
   const c=new AbortController();abort.current=c;
-  const timeout=setTimeout(()=>c.abort(),12000);
+  let timedOut=false;
+  const timeout=setTimeout(()=>{if(abort.current===c){timedOut=true;c.abort();}},12000);
   const request={schema_version:1,birth_date:date,certainty,timezone,latitude:Number(lat),longitude:Number(lon),
    ...(certainty==='RANGE'?{earliest_time:earliest,latest_time:latest,...(latestDate?{latest_date:latestDate}:{}),...(earliestOffset?{earliest_utc_offset:Number(earliestOffset)}:{}),...(latestOffset?{latest_utc_offset:Number(latestOffset)}:{})}:certainty==='UNKNOWN'?{}:{birth_time:clock,...(offset?{utc_offset:Number(offset)}:{})}),
    ...(certainty==='APPROXIMATE'?{uncertainty_minutes:uncertainty}:{})};
@@ -52,8 +54,8 @@ export function BirthTimeExplorer(){
    const body=await res.json();
    if(!res.ok)throw Error(typeof body.code==='string'?body.code:'F01_UNAVAILABLE');
    if(body.status!=='COMPUTED_UNVERIFIED'||body.customer_timing_authorized!==false||body.btr_status!=='UNAVAILABLE_UNVALIDATED_DASHA_METHOD'||!Array.isArray(body.factors)||!Array.isArray(body.transition_brackets)||!Array.isArray(body.limitations))throw Error('INVALID_F01_RESPONSE');
-   if(!c.signal.aborted)setResult(body);
-  }catch(e){if(!c.signal.aborted)setError((e as Error).message)}finally{clearTimeout(timeout);if(abort.current===c){abort.current=null;setBusy(false)}}
+   if(abort.current===c&&!c.signal.aborted)setResult(body);
+  }catch(e){if(abort.current===c){if(timedOut)setError(timeoutMessage);else if(!c.signal.aborted)setError((e as Error).message)}}finally{clearTimeout(timeout);if(abort.current===c){abort.current=null;setBusy(false)}}
  };
  const inputClass='w-full rounded-lg border border-rose-700 bg-[#19060b] px-3 py-2 text-rose-100';
  return <section aria-labelledby="f01-title" className="mx-auto max-w-4xl space-y-5 text-rose-100">
@@ -81,7 +83,7 @@ export function BirthTimeExplorer(){
    <p className="text-xs text-rose-200/80">Birthplace is not inferred from your current device location. Inputs are submitted for this calculation only; this screen does not save a profile.</p>
    <button disabled={busy} className="rounded-lg bg-amber-400 px-5 py-3 font-semibold text-neutral-950 disabled:opacity-50">{busy?'Inspecting possible charts…':'Explore birth-time possibilities'}</button>
   </form>
-  {error&&<div role="alert" className="rounded-lg border border-amber-600 p-4">Unable to calculate: {error}. Checked configurations or astronomical data may be unavailable. No estimate was substituted.</div>}
+  {error&&<div role="alert" className="rounded-lg border border-amber-600 p-4">{error===timeoutMessage?error:<>Unable to calculate: {error}. Checked configurations or astronomical data may be unavailable. No estimate was substituted.</>}</div>}
   {result&&<div aria-live="polite" className="space-y-4">
    <div role="status" className="rounded-xl border border-amber-600 p-4"><strong>Exploratory calculation — not independently approved</strong><p className="text-sm mt-2">Sampled {result.sample_count} birth instants from {new Date(result.start_utc).toLocaleString()} to {new Date(result.end_utc).toLocaleString()}. These dates are shown in your browser timezone; calculations use UTC and the supplied birth timezone.</p><p className="mt-2 text-xs">House system: {result.house_system}. Rectification: unavailable. Personal timing: disabled.</p></div>
    <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="font-serif text-xl text-amber-300">Rashi and Bhava Chalit comparison</h2>
```
