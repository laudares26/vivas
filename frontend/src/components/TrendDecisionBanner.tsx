import { AlertCircle } from 'lucide-react'
import type { TrendDecision } from '../services/api'

// Preventive decision layer banner (motor de tendência). Surfaces a sustained +
// concordant drift while every value is still inside the reference range — the
// signal the range-based engine used to miss. `variant` tailors the wording for
// the patient vs. the professional panel.
export default function TrendDecisionBanner({
  decision,
  variant = 'patient',
}: {
  decision?: TrendDecision | null
  variant?: 'patient' | 'professional'
}) {
  if (!decision || decision.level === 'verde') return null
  const axis = decision.top_axis ? decision.axes[decision.top_axis] : null
  if (!axis) return null
  const active = (axis.markers || []).filter(m => m.ativo)
  const labels = active.map(m => m.label).join(', ')
  const isRed = decision.level === 'vermelho'
  const cls = isRed
    ? 'bg-red-50 border-red-300 text-red-800'
    : 'bg-amber-50 border-amber-300 text-amber-800'

  return (
    <div className={`p-4 rounded-lg border ${cls} mb-4`}>
      <div className="flex items-start gap-2">
        <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
        <div className="min-w-0">
          <p className="font-semibold text-sm">
            {isRed ? 'Alerta preventivo — tendência sustentada e concordante' : 'Atenção — tendência a acompanhar'}
          </p>
          {variant === 'professional' ? (
            <p className="text-xs mt-1 leading-relaxed">
              Deriva concordante no eixo <strong>{decision.top_axis}</strong>: {active.length} marcador(es) com tendência sustentada ({labels}).
              {' '}Consumo de margem até {(axis.consumo_max * 100).toFixed(0)}%
              {axis.proj_min_anos != null && `, projeção de saída da faixa em ~${axis.proj_min_anos} ano(s)`}.
              {' '}Todos ainda dentro da faixa de referência. Sugere-se correlação clínica.
            </p>
          ) : (
            <p className="text-xs mt-1 leading-relaxed">
              {active.length} indicador(es) ({labels}) mostram movimento consistente na mesma direção de risco,
              <strong> ainda dentro da faixa de referência</strong>.
              {axis.proj_min_anos != null && ` No ritmo atual, um deles tende a sair da faixa em ~${axis.proj_min_anos} ano(s).`}
            </p>
          )}
          <p className="text-[11px] mt-1 opacity-80">
            Isto é um alerta preventivo, não um diagnóstico. Recomenda-se avaliação médica.
          </p>
        </div>
      </div>
    </div>
  )
}
