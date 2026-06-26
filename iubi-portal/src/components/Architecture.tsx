import React from 'react'
import { MapPinIcon, DatabaseIcon, GridIcon, GlobeIcon, CodeIcon, CloudServerIcon, LayersIcon } from './GeoIcons'

const Architecture: React.FC = () => {
  return (
    <section className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <span className="iubi-badge mb-4">Arquitetura</span>
          <h2 className="iubi-section-title">
            Como a plataforma <span className="text-gradient">funciona</span>
          </h2>
          <p className="iubi-section-subtitle">
            Arquitetura de microsserviços com frontend modular (Micro Frontends) 
            e backend escalável.
          </p>
        </div>

        {/* Architecture diagram */}
        <div className="max-w-4xl mx-auto">
          {/* Frontend Layer */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                <CodeIcon size={16} className="text-blue-600" />
              </div>
              <h3 className="font-bold text-gray-900">Frontend (Micro Frontends)</h3>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { name: 'ge21-frontend', desc: 'App principal', color: 'blue' },
                { name: 'ge21-mfe-ui', desc: 'Componentes UI', color: 'purple' },
                { name: 'ge21-mfe-utils', desc: 'Utilitários', color: 'teal' },
                { name: '3rd-party-configs', desc: 'Configs externas', color: 'gray' },
              ].map(item => (
                <div key={item.name} className={`p-4 rounded-xl border-2 border-dashed border-${item.color}-200 bg-${item.color}-50/50`}>
                  <div className={`text-xs font-mono text-${item.color}-600 mb-1`}>{item.name}</div>
                  <div className="text-sm text-gray-600">{item.desc}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Connection arrows */}
          <div className="flex justify-center my-4">
            <div className="flex flex-col items-center">
              <svg width="24" height="32" viewBox="0 0 24 32" className="text-gray-300">
                <line x1="12" y1="0" x2="12" y2="28" stroke="currentColor" strokeWidth="2" strokeDasharray="4 4" />
                <polygon points="6,24 12,32 18,24" fill="currentColor" />
              </svg>
              <span className="text-xs text-gray-400 font-medium mt-1">REST API / WebSocket</span>
            </div>
          </div>

          {/* Backend Layer */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                <CloudServerIcon size={16} className="text-emerald-600" />
              </div>
              <h3 className="font-bold text-gray-900">Backend (iubi-services)</h3>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { name: 'Map Render', desc: 'Renderização e edição', icon: MapPinIcon, color: 'bg-blue-50 text-blue-600 border-blue-200' },
                { name: 'Catalog', desc: 'Conexões e metadados', icon: DatabaseIcon, color: 'bg-emerald-50 text-emerald-600 border-emerald-200' },
                { name: 'Context', desc: 'Configurações de app', icon: GridIcon, color: 'bg-purple-50 text-purple-600 border-purple-200' },
                { name: 'OGC', desc: 'WFS / WMS padrão', icon: GlobeIcon, color: 'bg-amber-50 text-amber-600 border-amber-200' },
              ].map(item => (
                <div key={item.name} className={`p-4 rounded-xl border ${item.color.split(' ')[2]} ${item.color.split(' ')[0]}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <item.icon size={16} className={item.color.split(' ')[1]} />
                    <span className={`text-sm font-bold ${item.color.split(' ')[1]}`}>{item.name}</span>
                  </div>
                  <div className="text-xs text-gray-600">{item.desc}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Connection arrows */}
          <div className="flex justify-center my-4">
            <div className="flex flex-col items-center">
              <svg width="24" height="32" viewBox="0 0 24 32" className="text-gray-300">
                <line x1="12" y1="0" x2="12" y2="28" stroke="currentColor" strokeWidth="2" strokeDasharray="4 4" />
                <polygon points="6,24 12,32 18,24" fill="currentColor" />
              </svg>
              <span className="text-xs text-gray-400 font-medium mt-1">JDBC / HTTP</span>
            </div>
          </div>

          {/* Data Layer */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center">
                <LayersIcon size={16} className="text-gray-600" />
              </div>
              <h3 className="font-bold text-gray-900">Fontes de Dados</h3>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                'GeoServer', 'PostGIS', 'MapServer', 'Arquivos (GeoJSON, KML, SHP)',
              ].map(name => (
                <div key={name} className="p-3 rounded-xl bg-gray-50 border border-gray-200 text-center">
                  <div className="text-sm font-medium text-gray-700">{name}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default Architecture
