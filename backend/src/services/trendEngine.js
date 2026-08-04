// Preventive decision layer ("motor de tendência").
//
// The legacy engine decides purely by reference range: an indicator only raises
// a flag once a value crosses its limit — which makes the platform REACTIVE (it
// only wakes up when a number already blew past the range, exactly when any lab
// would also catch it). This layer changes the question. Instead of "is any
// value out of range?" it asks, at the same time and with every value still
// INSIDE the range:
//   1. Is there a sustained trend in this marker over the whole series?
//   2. Is the marker consuming its margin, walking toward the risk edge, and how
//      many years until it would leave the range at the current pace?
//   3. Are several markers of the same clinical axis drifting together, in the
//      same clinical direction (concordance)?
// The alert is born from the combination of the three.
//
// Reference: "VivaS — Camada de Decisão Preventiva (motor de tendência)".

// Default tunable parameters (spec §6/§8). These are a STARTING POINT, not
// truth — they are meant to be calibrated with the progressive-cut datasets.
const DEFAULT_PARAMS = {
  N_MIN: 5,        // minimum points to evaluate a marker
  TAU_MIN: 0.45,   // Mann-Kendall |tau| threshold for a "sustained" trend
  PROJ_ANOS: 3,    // years-to-limit threshold that escalates the decision
  CONSUMO_AMARELO: 0.85,
  CONSUMO_VERMELHO: 0.90,
};

// Per-marker configuration (spec §3): risk direction (which edge the movement
// is worrying toward), clinical axis (group where concordance is evaluated) and
// weight (clinical specificity). Extensible: new axes are just new rows.
// `lo`/`hi` are the reference range used to measure margin consumption.
const MARKER_CONFIG = {
  leucocitos:   { lo: 4000, hi: 11000, direcao: 'teto', eixo: 'mieloproliferativo', peso: 1.0, label: 'Leucócitos' },
  basofilos_abs:{ lo: 0, hi: 200, direcao: 'teto', eixo: 'mieloproliferativo', peso: 1.5, label: 'Basófilos (abs)' },
  basofilos_pct:{ lo: 0, hi: 2, direcao: 'teto', eixo: 'mieloproliferativo', peso: 1.2, label: 'Basófilos (%)' },
  plaquetas:    { lo: 150000, hi: 450000, direcao: 'teto', eixo: 'mieloproliferativo', peso: 0.8, label: 'Plaquetas' },
  ldh:          { lo: 135, hi: 225, direcao: 'teto', eixo: 'mieloproliferativo', peso: 1.0, label: 'LDH' },
  acido_urico:  { lo: 3.4, hi: 7.0, direcao: 'teto', eixo: 'mieloproliferativo', peso: 0.7, label: 'Ácido Úrico' },
  baco:         { lo: 0, hi: 12, direcao: 'teto', eixo: 'mieloproliferativo', peso: 1.2, label: 'Baço (US)' },
  hemoglobina:  { lo: 13.5, hi: 17.5, direcao: 'piso', eixo: 'mieloproliferativo', peso: 0.8, label: 'Hemoglobina' },
};

function median(arr) {
  if (!arr.length) return NaN;
  const s = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

function toYears(dateA, dateB) {
  return (dateB.getTime() - dateA.getTime()) / (365.25 * 24 * 3600 * 1000);
}

// Analyse a single marker over its time series (spec §4/§7).
// series: [{ value:number, recorded_at:Date|string }] (any order).
function analisarMarcador(series, cfg, params) {
  const P = { ...DEFAULT_PARAMS, ...params };
  const pts = (series || [])
    .filter(p => p && p.value != null && Number.isFinite(Number(p.value)) && p.recorded_at)
    .map(p => ({ value: Number(p.value), data: new Date(p.recorded_at) }))
    .filter(p => !Number.isNaN(p.data.getTime()))
    .sort((a, b) => a.data - b.data);

  if (pts.length < P.N_MIN) {
    return { ativo: false, score: 0, n: pts.length };
  }

  const vals = pts.map(p => p.value);
  const range = cfg.hi - cfg.lo;
  const consumo = (v) => range > 0
    ? (cfg.direcao === 'teto' ? (v - cfg.lo) / range : (cfg.hi - v) / range)
    : 0;

  // §4.2 Mann-Kendall — sustained monotonic trend, robust to a single transient
  // spike (an isolated peak that goes up and comes back does not create a
  // monotonic trend over the whole series).
  let S = 0;
  for (let i = 0; i < vals.length - 1; i++) {
    for (let j = i + 1; j < vals.length; j++) S += Math.sign(vals[j] - vals[i]);
  }
  const tau = S / (vals.length * (vals.length - 1) / 2);
  const sustentada = Math.abs(tau) >= P.TAU_MIN;
  const preocupa = (cfg.direcao === 'teto' && S > 0) || (cfg.direcao === 'piso' && S < 0);

  // §4.3 Theil-Sen slope — median of all pairwise slopes, robust to outliers.
  const slopes = [];
  for (let i = 0; i < pts.length - 1; i++) {
    for (let j = i + 1; j < pts.length; j++) {
      const dt = toYears(pts[i].data, pts[j].data);
      if (dt > 0) slopes.push((vals[j] - vals[i]) / dt);
    }
  }
  const slope = median(slopes);

  // §4.4 use the median of the last 3 points as the "current value" so a single
  // transient reading does not drive the margin-consumption metric.
  const valorAtual = median(vals.slice(-3));
  const limite = cfg.direcao === 'teto' ? cfg.hi : cfg.lo;
  const rumoLimite = cfg.direcao === 'teto' ? slope > 0 : slope < 0;
  const projecao = (rumoLimite && Number.isFinite(slope) && slope !== 0)
    ? Math.abs((limite - valorAtual) / slope)
    : Infinity;

  // §4.4(3) the trend must persist after dropping the last point, so the signal
  // exists BEFORE any rupture and is not created by the last reading alone.
  let persisteSemUltimo = true;
  if (vals.length - 1 >= P.N_MIN) {
    const head = vals.slice(0, -1);
    let s2 = 0;
    for (let i = 0; i < head.length - 1; i++) {
      for (let j = i + 1; j < head.length; j++) s2 += Math.sign(head[j] - head[i]);
    }
    const tau2 = s2 / (head.length * (head.length - 1) / 2);
    const preocupa2 = (cfg.direcao === 'teto' && s2 > 0) || (cfg.direcao === 'piso' && s2 < 0);
    persisteSemUltimo = Math.abs(tau2) >= P.TAU_MIN && preocupa2;
  }

  const cAtual = clamp(consumo(valorAtual), 0, 1);
  const ativo = sustentada && preocupa && persisteSemUltimo;
  // §4.5 marker score.
  const score = ativo ? cfg.peso * Math.min(1, Math.abs(tau) / 0.7) * (0.5 + 0.5 * cAtual) : 0;

  return {
    ativo, score,
    tau: +tau.toFixed(3),
    slope: Number.isFinite(slope) ? +slope.toFixed(4) : null,
    consumo: +cAtual.toFixed(3),
    projecao_anos: Number.isFinite(projecao) ? +projecao.toFixed(1) : null,
    valor_atual: valorAtual,
    n: pts.length,
  };
}

// §5/§6 aggregate the active markers of one axis and decide green/yellow/red.
function decidirEixo(markers, params) {
  const P = { ...DEFAULT_PARAMS, ...params };
  const ativos = markers.filter(m => m.ativo);
  const concord = ativos.length;
  const projMin = ativos.reduce((min, m) => {
    const v = m.projecao_anos == null ? Infinity : m.projecao_anos;
    return Math.min(min, v);
  }, Infinity);
  const consumoMax = ativos.reduce((max, m) => Math.max(max, m.consumo || 0), 0);
  const eixoScore = ativos.reduce((s, m) => s + m.score, 0);

  let nivel = 'verde';
  if (concord === 2 || (concord === 1 && (consumoMax >= P.CONSUMO_AMARELO || projMin <= P.PROJ_ANOS))) {
    nivel = 'amarelo';
  }
  if (concord >= 3 || (concord >= 2 && (projMin <= P.PROJ_ANOS || consumoMax >= P.CONSUMO_VERMELHO))) {
    nivel = 'vermelho';
  }
  return {
    nivel, concord_count: concord,
    proj_min_anos: Number.isFinite(projMin) ? projMin : null,
    consumo_max: +consumoMax.toFixed(3),
    eixo_score: +eixoScore.toFixed(3),
  };
}

const LEVEL_RANK = { verde: 0, amarelo: 1, vermelho: 2 };

// Entry point: run the decision layer over a patient's full indicator history.
// `history` is the map { indicator_name: [{ value, recorded_at }, ...] } already
// produced by getIndicatorHistory. Returns the overall level plus per-axis and
// per-marker detail (spec §10 persistence fields).
function analyzeTrends(history, params = {}) {
  const eixos = {};
  const markerDetail = {};

  for (const [name, cfg] of Object.entries(MARKER_CONFIG)) {
    const series = history && history[name];
    const m = analisarMarcador(series, cfg, params);
    markerDetail[name] = { ...m, label: cfg.label, eixo: cfg.eixo, direcao: cfg.direcao };
    if (!eixos[cfg.eixo]) eixos[cfg.eixo] = [];
    eixos[cfg.eixo].push({ name, label: cfg.label, ...m });
  }

  const axisResults = {};
  let level = 'verde';
  let topAxis = null;
  for (const [eixo, markers] of Object.entries(eixos)) {
    const decision = decidirEixo(markers, params);
    const activeMarkers = markers.filter(m => m.ativo);
    axisResults[eixo] = { ...decision, markers: activeMarkers };
    if (LEVEL_RANK[decision.nivel] > LEVEL_RANK[level]) {
      level = decision.nivel;
      topAxis = eixo;
    } else if (LEVEL_RANK[decision.nivel] === LEVEL_RANK[level] && decision.nivel !== 'verde' && !topAxis) {
      topAxis = eixo;
    }
  }

  return { level, top_axis: topAxis, axes: axisResults, markers: markerDetail };
}

module.exports = {
  analyzeTrends,
  analisarMarcador,
  decidirEixo,
  MARKER_CONFIG,
  DEFAULT_PARAMS,
};
