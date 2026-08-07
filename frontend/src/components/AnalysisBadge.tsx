import { Sparkles } from 'lucide-react'
import type { AnalysisMeta } from '../services/api'

// Provenance badge for the "análise histórica inteligente". The provider (batch
// vs. interactive) is an implementation detail and is not exposed to the user.
// We surface only that an intelligent analysis was performed.
export default function AnalysisBadge({ meta }: { meta?: AnalysisMeta | null }) {
  if (!meta || !meta.provider) return null

  const when = meta.generated_at
    ? new Date(meta.generated_at).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
    : null

  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-green-50 text-green-700 border border-green-200">
      <Sparkles className="w-3.5 h-3.5" />
      Análise inteligente{when ? ` · ${when}` : ''}
    </span>
  )
}
