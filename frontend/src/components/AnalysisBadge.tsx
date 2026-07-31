import { Sparkles, Clock, ShieldCheck } from 'lucide-react'
import type { AnalysisMeta } from '../services/api'

// Visual provenance badge for the "análise histórica inteligente".
// - MedGemma (Vertex batch): deep analysis is ready.
// - Groq (interactive): quick interim result; the deep MedGemma analysis is
//   generated in batch and will replace this shortly — so we tell the user to wait.
// - fallback: deterministic preventive text (no LLM available).
export default function AnalysisBadge({ meta }: { meta?: AnalysisMeta | null }) {
  if (!meta || !meta.provider) return null

  const when = meta.generated_at
    ? new Date(meta.generated_at).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
    : null

  if (meta.provider === 'medgemma') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-green-50 text-green-700 border border-green-200">
        <Sparkles className="w-3.5 h-3.5" />
        Análise aprofundada por MedGemma{when ? ` · ${when}` : ''}
      </span>
    )
  }

  if (meta.provider === 'groq') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
        <Clock className="w-3.5 h-3.5" />
        Resultado inteligente rápido — a análise aprofundada por MedGemma será atualizada em instantes
      </span>
    )
  }

  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-gray-100 text-gray-600 border border-gray-200">
      <ShieldCheck className="w-3.5 h-3.5" />
      Análise preventiva determinística{when ? ` · ${when}` : ''}
    </span>
  )
}
