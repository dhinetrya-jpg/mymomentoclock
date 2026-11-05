import assert from 'node:assert/strict';
const [kind, base] = process.argv.slice(2);
assert.ok(['engine','web'].includes(kind) && base, 'Usage: node smoke.mjs engine|web BASE_URL');
let ready = false;
for (let i=0; i<30; i++) {
  try { const r=await fetch(base+'/health'); ready=r.ok && (await r.json()).status === 'healthy'; if(ready) break; } catch {}
  await new Promise(resolve=>setTimeout(resolve,1000));
}
assert.ok(ready,'Container failed readiness');
const post = async(path,body)=>{const r=await fetch(base+path,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});assert.equal(r.status,200,await r.clone().text());return r.json();};
if (kind === 'engine') {
  const body=await post('/api/v1/ephemeris/normalize',{birth_date:'2000-01-01',birth_time:'17:30:00',latitude:22.5726,longitude:88.3639,timezone:'Asia/Kolkata'});
  assert.equal(body.julian_day_utc,2451545);
  assert.equal(Object.keys(body.coordinates).length,4);
  for (const planet of Object.values(body.coordinates)) assert.ok(Number.isFinite(planet.longitude) && planet.longitude>=0 && planet.longitude<360 && Number.isFinite(planet.velocity));
} else {
  const page=await fetch(base+'/');assert.equal(page.status,200);const html=await page.text();assert.match(html,/MymomentOclock/);
  const script=html.match(/src="([^"]+\.js)"/);assert.ok(script,'No bundled JavaScript');
  const bundle=await fetch(new URL(script[1],base+'/'));assert.equal(bundle.status,200);assert.match(bundle.headers.get('content-type'),/javascript/);
  const js=await bundle.text();assert.doesNotMatch(js,/\/src\/assets\/images\//,'Unbundled image references break production');
  const images=[...new Set(js.match(/diwali_[A-Za-z0-9_-]+\.jpg/g))];assert.equal(images.length,3,'Expected bundled festival images');
  for(const image of images){const r=await fetch(new URL(image, new URL(script[1], base+'/')));assert.equal(r.status,200);assert.match(r.headers.get('content-type'),/image\/jpeg/);}
  const chart=await post('/api/astro/calculate',{birthDate:'1989-11-23',birthTime:'04:30:00',latitude:22.5726,longitude:88.3639,timezoneOffset:5.5});assert.equal(chart.planets.length,9);
  const unavailable=await fetch(base+'/api/astro/stream-reading',{method:'POST',headers:{'content-type':'application/json'},body:'{}'});assert.equal(unavailable.status,503);
}
console.log(`${kind}: health and functional production smoke checks passed`);
