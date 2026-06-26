import React, { useState } from 'react'
import { services } from '../data/services'
import { MapPinIcon, DatabaseIcon, GridIcon, GlobeIcon } from './GeoIcons'

const iconMap: Record<string, React.FC<{ size?: number; className?: string }>> = {
  'map': MapPinIcon,
  'database': DatabaseIcon,
  'layout': GridIcon,
  'globe': GlobeIcon,
}

const methodColors: Record<string, string> = {
  GET: 'bg-emerald-100 text-emerald-700',
  POST: 'bg-blue-100 text-blue-700',
  PUT: 'bg-amber-100 text-amber-700',
  DELETE: 'bg-red-100 text-red-700',
}

const Services: React.FC = () => {
  const [activeService, setActiveService] = useState(services[0].id)
  const active = services.find(s => s.id === activeService) || services[0]

  return (
    <section id="services" className="py-24 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <span className="iubi-badge mb-4">APIs REST</span>
          <h2 className="iubi-section-title">
            Serviços <span className="text-gradient">Backend</span>
          </h2>
          <p className="iubi-section-subtitle">
            Quatro microsserviços especializados para renderização, catálogo, 
            contexto e padrões OGC.
          </p>
        </div>

        {/* Service tabs */}
        <div className="flex flex-wrap justify-center gap-3 mb-12">
          {services.map(svc => {
            const IconComp = iconMap[svc.icon] || MapPinIcon
            return (
              <button
                key={svc.id}
                onClick={() => setActiveService(svc.id)}
                className={`flex items-center gap-2 px-5 py-3 rounded-xl font-medium transition-all ${
                  activeService === svc.id
                    ? 'bg-iubi-gradient text-white shadow-lg shadow-iubi-500/20'
                    : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                }`}
              >
                <IconComp size={18} />
                {svc.name}
              </button>
            )
          })}
        </div>

        {/* Active service detail */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
          <div className="p-8 border-b border-gray-100">
            <div className="flex items-start justify-between flex-wrap gap-4">
              <div className="flex items-center gap-4">
                <div className={`geo-icon ${active.bgColor}`}>
                  {React.createElement(iconMap[active.icon] || MapPinIcon, { size: 24, className: active.color })}
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-gray-900">{active.name}</h3>
                  <p className="text-gray-600 mt-1">{active.description}</p>
                </div>
              </div>
              <a
                href={active.swaggerUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="iubi-btn-outline text-sm !px-4 !py-2 flex items-center gap-2"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                  <polyline points="15 3 21 3 21 9" />
                  <line x1="10" y1="14" x2="21" y2="3" />
                </svg>
                Swagger UI
              </a>
            </div>
          </div>

          {/* Endpoints table */}
          <div className="divide-y divide-gray-100">
            {active.endpoints.map((ep, idx) => (
              <div key={idx} className="px-8 py-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-start gap-4">
                  <span className={`inline-block px-2.5 py-1 rounded-md text-xs font-bold uppercase ${methodColors[ep.method]} min-w-[52px] text-center mt-0.5`}>
                    {ep.method}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <code className="text-sm font-mono text-gray-800 break-all">{ep.path}</code>
                      <span className="hidden sm:inline-block px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-500 whitespace-nowrap">
                        {ep.tag}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500">{ep.summary}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

export default Services
