const categories = ['Colors', 'Clothing', 'Footwear', 'Metals', 'Stones'];

export function RemediationView() {
  return <section aria-labelledby="guidance-title" className="space-y-4 rounded-xl border border-rose-900 bg-[#22070e] p-5">
    <h2 id="guidance-title" className="font-serif text-xl text-amber-300">Optional guidance</h2>
    <p>These categories require reviewed sources and rules before guidance is available.</p>
    <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {categories.map(category => <div key={category} className="rounded border border-rose-900 p-3">
        <dt className="font-semibold">{category}</dt>
        <dd>Unavailable</dd>
      </div>)}
    </dl>
  </section>;
}
