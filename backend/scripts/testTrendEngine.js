/* Ad-hoc validation of the preventive decision layer against the spec scenarios.
 * Run: node backend/scripts/testTrendEngine.js  */
const { analyzeTrends } = require('../src/services/trendEngine');

function series(start, end, n, startDate = '2006-01-01', years = 12, jitter = 0) {
  const out = [];
  const d0 = new Date(startDate).getTime();
  const span = years * 365.25 * 24 * 3600 * 1000;
  for (let i = 0; i < n; i++) {
    const f = i / (n - 1);
    const noise = jitter ? (Math.sin(i * 2.7) * jitter) : 0;
    out.push({ value: +(start + (end - start) * f + noise).toFixed(2), recorded_at: new Date(d0 + span * f) });
  }
  return out;
}

// Scenario A: the user's window — 4 markers rising/falling concordantly, all in range.
const windowHistory = {
  leucocitos: series(5564, 10600, 60),   // +90.5%, still < 11000
  plaquetas: series(245000, 432000, 60), // +76.3%, still < 450000
  acido_urico: series(5.0, 6.4, 60),     // rising toward 7.0
  hemoglobina: series(15.8, 14.6, 60),   // falling toward 13.5 (piso)
};
const a = analyzeTrends(windowHistory);
console.log('Scenario A (in-range concordant window):', a.level, '| eixo:', JSON.stringify(a.axes.mieloproliferativo, (k, v) => k === 'markers' ? undefined : v));
console.log('  active markers:', a.axes.mieloproliferativo.markers.map(m => `${m.name}(tau=${m.tau},cons=${m.consumo},proj=${m.projecao_anos})`).join(', '));

// Scenario B: pure distractor — one transient infection spike in leucocitos, no trend.
const distractor = {
  leucocitos: [
    { value: 6000, recorded_at: '2008-01-01' },
    { value: 6200, recorded_at: '2009-01-01' },
    { value: 15000, recorded_at: '2010-01-01' }, // infection spike
    { value: 6100, recorded_at: '2011-01-01' },  // returns
    { value: 6000, recorded_at: '2012-01-01' },
    { value: 6300, recorded_at: '2013-01-01' },
  ],
};
const b = analyzeTrends(distractor);
console.log('Scenario B (transient spike only):', b.level, '| leuco ativo:', b.markers.leucocitos.ativo, 'tau:', b.markers.leucocitos.tau);

// Scenario C: single marker rising but alone → at most amarelo (concord=1).
const single = { leucocitos: series(5564, 10800, 40) };
const c = analyzeTrends(single);
console.log('Scenario C (single marker, high consumo):', c.level, '| concord:', c.axes.mieloproliferativo.concord_count, 'consumo_max:', c.axes.mieloproliferativo.consumo_max);

// Scenario D: everything flat/noisy and in range (no real direction) → verde.
const flat = {
  leucocitos: series(6000, 6050, 20, '2006-01-01', 12, 900),
  plaquetas: series(250000, 251000, 20, '2006-01-01', 12, 40000),
  hemoglobina: series(15, 15.05, 20, '2006-01-01', 12, 0.9),
};
const d = analyzeTrends(flat);
console.log('Scenario D (flat/noisy in-range):', d.level, '| leuco tau:', d.markers.leucocitos.tau, 'plaq tau:', d.markers.plaquetas.tau);

// Scenario E: markers already OUT of range — projection must be 0 (already left),
// never a positive "years away", and axis must be flagged any_out_of_range.
const outOfRange = {
  leucocitos: series(9000, 20000, 30),  // ends at 20000, well above hi=11000
  plaquetas: series(300000, 520000, 30), // ends above hi=450000
  acido_urico: series(5.0, 6.5, 30),
};
const e = analyzeTrends(outOfRange);
console.log('Scenario E (already out of range):', e.level,
  '| leuco fora_faixa:', e.markers.leucocitos.fora_faixa, 'proj:', e.markers.leucocitos.projecao_anos,
  '| axis any_out_of_range:', e.axes.mieloproliferativo.any_out_of_range,
  'proj_min:', e.axes.mieloproliferativo.proj_min_anos);
