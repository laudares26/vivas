import React from 'react'
import { contextTypes } from '../data/services'
import { MapPinIcon, ChartBarIcon, GridIcon, DatabaseIcon, GlobeIcon } from './GeoIcons'

const iconMap: Record<string, React.FC<{ size?: number; className?: string }>> = {
  'map': MapPinIcon,
  'bar-chart-3': ChartBarIcon,
  'clipboard-list': GridIcon,
  'file-text': DatabaseIcon,
  'book-open': GlobeIcon,
}

const colorMap: Record<string, { bg: string; icon: string; border: string; badge: string }> = {
  blue:    { bg: 'bg-blue-50',    icon: 'text-blue-600',    border: 'border-blue-100',    badge: 'bg-blue-100 text-blue-700' },
  emerald: { bg: 'bg-emerald-50', icon: 'text-emerald-600', border: 'border-emerald-100', badge: 'bg-emerald-100 text-emerald-700' },
  purple:  { bg: 'bg-purple-50',  icon: 'text-purple-600',  border: 'border-purple-100',  badge: 'bg-purple-100 text-purple-700' },
  amber:   { bg: 'bg-amber-50',   icon: 'text-amber-600',   border: 'border-amber-100',   badge: 'bg-amber-100 text-amber-700' },
  rose:    { bg: 'bg-rose-50',    icon: 'text-rose-600',    border: 'border-rose-100',    badge: 'bg-rose-100 text-rose-700' },
}

const Solutions: React.FC = () => {
  return (
    <section id="solutions" className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <span className="iubi-badge mb-4">Soluções</span>
          <h2 className="iubi-section-title">
            Aplicações <span className="text-gradient">Geoespaciais</span> sob medida
          </h2>
          <p className="iubi-section-subtitle">
            Crie e configure 5 tipos de aplicações interativas. Cada uma com componentes 
            especializados para sua necessidade de geovisualização.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {contextTypes.map((ctx, index) => {
            const colors = colorMap[ctx.color]
            const IconComp = iconMap[ctx.icon] || MapPinIcon
            return (
              <div
                key={ctx.type}
                className={`iubi-card p-6 ${index === 0 ? 'md:col-span-2 lg:col-span-1' : ''}`}
              >
                <div className={`geo-icon ${colors.bg} mb-4`}>
                  <IconComp size={24} className={colors.icon} />
                </div>
                <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${colors.badge} mb-3`}>
                  {ctx.type}
                </span>
                <h3 className="text-xl font-bold text-gray-900 mb-2">{ctx.label}</h3>
                <p className="text-gray-600 text-sm leading-relaxed">{ctx.description}</p>
                
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-iubi-accent">
                      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                      <polyline points="22 4 12 14.01 9 11.01" />
                    </svg>
                    Configurável via API Context
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

export default Solutions
