import React from 'react'
import { MapPinIcon, LayersIcon, GlobeIcon, SatelliteIcon, HexagonIcon, PolygonIcon } from './GeoIcons'

const Hero: React.FC = () => {
  return (
    <section className="relative min-h-screen bg-iubi-gradient overflow-hidden flex items-center">
      {/* Animated geo elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 text-white/5 animate-float" style={{ animationDelay: '0s' }}>
          <HexagonIcon size={120} />
        </div>
        <div className="absolute top-40 right-20 text-white/5 animate-float" style={{ animationDelay: '2s' }}>
          <GlobeIcon size={160} />
        </div>
        <div className="absolute bottom-40 left-1/4 text-white/5 animate-float" style={{ animationDelay: '4s' }}>
          <PolygonIcon size={100} />
        </div>
        <div className="absolute bottom-20 right-1/3 text-white/5 animate-float" style={{ animationDelay: '1s' }}>
          <LayersIcon size={90} />
        </div>
        <div className="absolute top-1/3 left-1/2 text-white/5 animate-float" style={{ animationDelay: '3s' }}>
          <SatelliteIcon size={80} />
        </div>
        {/* Grid pattern overlay */}
        <div className="absolute inset-0" style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px',
        }} />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-32">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="animate-slide-up">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 mb-8">
              <MapPinIcon size={16} className="text-iubi-light" />
              <span className="text-sm text-white/90 font-medium">
                Plataforma de Geovisualização
              </span>
            </div>

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-tight mb-6">
              Habilite o <br />
              <span className="text-iubi-light">Conhecimento</span> dos <br />
              Dados Geoespaciais
            </h1>

            <p className="text-lg text-white/80 max-w-xl mb-8 leading-relaxed">
              Customize soluções de geovisualização com WebMaps interativos, 
              Dashboards espaciais, Formulários geolocalizados e Story Maps. 
              Explore a API, teste no playground e integre em minutos.
            </p>

            <div className="flex flex-wrap gap-4">
              <a href="#playground" className="inline-flex items-center gap-2 bg-white text-iubi-primary font-semibold px-8 py-4 rounded-xl hover:bg-gray-50 transition-all shadow-xl hover:shadow-2xl">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="5 3 19 12 5 21 5 3" />
                </svg>
                Playground
              </a>
              <a href="#services" className="inline-flex items-center gap-2 border-2 border-white/30 text-white font-semibold px-8 py-4 rounded-xl hover:bg-white/10 transition-all backdrop-blur-sm">
                Explorar APIs
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </a>
            </div>

            <div className="flex items-center gap-8 mt-12">
              <div>
                <div className="text-3xl font-bold text-white">4</div>
                <div className="text-sm text-white/60">APIs REST</div>
              </div>
              <div className="w-px h-10 bg-white/20" />
              <div>
                <div className="text-3xl font-bold text-white">5</div>
                <div className="text-sm text-white/60">Tipos de App</div>
              </div>
              <div className="w-px h-10 bg-white/20" />
              <div>
                <div className="text-3xl font-bold text-white">22+</div>
                <div className="text-sm text-white/60">Componentes</div>
              </div>
            </div>
          </div>

          <div className="hidden lg:block animate-fade-in">
            <div className="relative">
              {/* Mock map card */}
              <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 p-6 shadow-2xl">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-3 h-3 rounded-full bg-red-400" />
                  <div className="w-3 h-3 rounded-full bg-yellow-400" />
                  <div className="w-3 h-3 rounded-full bg-green-400" />
                  <span className="text-white/60 text-sm ml-2 font-mono">iubi-webmap.tsx</span>
                </div>
                <div className="space-y-2 font-mono text-sm">
                  <div><span className="text-purple-300">import</span> <span className="text-green-300">{'{ Map, LayerManager }'}</span> <span className="text-purple-300">from</span> <span className="text-amber-300">'@iubi/geo'</span></div>
                  <div className="text-white/40">{'// '} Configure sua visualização</div>
                  <div><span className="text-blue-300">{'<Map'}</span></div>
                  <div className="pl-4"><span className="text-cyan-300">connectionId</span>=<span className="text-amber-300">"abc-123"</span></div>
                  <div className="pl-4"><span className="text-cyan-300">center</span>={'{[-49.0, -6.0]}'}</div>
                  <div className="pl-4"><span className="text-cyan-300">zoom</span>={'{10}'}</div>
                  <div className="pl-4"><span className="text-cyan-300">layers</span>={'{['}</div>
                  <div className="pl-8"><span className="text-amber-300">"uso_solo"</span>,</div>
                  <div className="pl-8"><span className="text-amber-300">"hidrografia"</span>,</div>
                  <div className="pl-8"><span className="text-amber-300">"limites_municipais"</span></div>
                  <div className="pl-4">{']}'}</div>
                  <div><span className="text-blue-300">{'/>'}</span></div>
                </div>
              </div>

              {/* Floating badges */}
              <div className="absolute -top-4 -right-4 bg-white rounded-xl shadow-xl px-4 py-3 flex items-center gap-2 animate-float">
                <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
                  <LayersIcon size={16} className="text-emerald-600" />
                </div>
                <div>
                  <div className="text-xs text-gray-500">Camadas</div>
                  <div className="text-sm font-bold text-gray-900">WMS / WFS</div>
                </div>
              </div>

              <div className="absolute -bottom-4 -left-4 bg-white rounded-xl shadow-xl px-4 py-3 flex items-center gap-2 animate-float" style={{ animationDelay: '3s' }}>
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  <GlobeIcon size={16} className="text-blue-600" />
                </div>
                <div>
                  <div className="text-xs text-gray-500">Padrão</div>
                  <div className="text-sm font-bold text-gray-900">OGC</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Wave separator */}
      <div className="absolute bottom-0 left-0 right-0">
        <svg viewBox="0 0 1440 100" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M0 50C360 90 720 10 1440 50V100H0V50Z" fill="white" />
        </svg>
      </div>
    </section>
  )
}

export default Hero
