import React from 'react'
import { storyComponents } from '../data/services'
import { MapPinIcon, LayersIcon, GridIcon, ChartBarIcon, DatabaseIcon, GlobeIcon, RulerIcon, HexagonIcon, CloudServerIcon, VectorIcon, CodeIcon, SatelliteIcon } from './GeoIcons'

const iconMap: Record<string, React.FC<{ size?: number; className?: string }>> = {
  'map': MapPinIcon,
  'info': DatabaseIcon,
  'table': GridIcon,
  'layers': LayersIcon,
  'sliders': RulerIcon,
  'image': SatelliteIcon,
  'upload': CloudServerIcon,
  'layout': GridIcon,
  'git-branch': VectorIcon,
  'type': CodeIcon,
  'layout-grid': HexagonIcon,
  'bell': GlobeIcon,
  'bar-chart': ChartBarIcon,
}

const categoryColors: Record<string, { bg: string; text: string; border: string }> = {
  Geospatial: { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-200' },
  Layer: { bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-200' },
  Context: { bg: 'bg-purple-50', text: 'text-purple-600', border: 'border-purple-200' },
  Dashboard: { bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-200' },
  UI: { bg: 'bg-gray-50', text: 'text-gray-600', border: 'border-gray-200' },
}

const Components: React.FC = () => {
  const categories = Array.from(new Set(storyComponents.map(c => c.category)))

  return (
    <section id="components" className="py-24 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <span className="iubi-badge mb-4">Componentes</span>
          <h2 className="iubi-section-title">
            Biblioteca de <span className="text-gradient">Componentes</span>
          </h2>
          <p className="iubi-section-subtitle">
            Componentes React reutilizáveis documentados no Storybook. 
            Cada componente é configurável e integrado com as APIs IUBI.
          </p>
          <a
            href="http://100.52.200.210:32060/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 mt-6 text-iubi-primary hover:text-iubi-600 font-medium"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
              <polyline points="15 3 21 3 21 9" />
              <line x1="10" y1="14" x2="21" y2="3" />
            </svg>
            Abrir Storybook completo
          </a>
        </div>

        {categories.map(cat => {
          const catColors = categoryColors[cat] || categoryColors.UI
          const catComponents = storyComponents.filter(c => c.category === cat)
          
          return (
            <div key={cat} className="mb-12">
              <div className="flex items-center gap-3 mb-6">
                <span className={`px-3 py-1 rounded-lg text-sm font-semibold ${catColors.bg} ${catColors.text} border ${catColors.border}`}>
                  {cat}
                </span>
                <span className="text-sm text-gray-400">{catComponents.length} componentes</span>
              </div>

              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {catComponents.map((comp, idx) => {
                  const IconComp = iconMap[comp.icon] || MapPinIcon
                  return (
                    <div key={idx} className="iubi-card p-5 flex items-start gap-4">
                      <div className={`geo-icon ${catColors.bg} flex-shrink-0`}>
                        <IconComp size={20} className={catColors.text} />
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900 text-sm">{comp.name}</h4>
                        <p className="text-xs text-gray-500 mt-1 leading-relaxed">{comp.description}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}

export default Components
