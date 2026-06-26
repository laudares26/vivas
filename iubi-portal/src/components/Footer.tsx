import React from 'react'
import { MapPinIcon, GlobeIcon, LayersIcon, CodeIcon } from './GeoIcons'

const Footer: React.FC = () => {
  return (
    <footer className="bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* CTA Section */}
        <div className="py-16 border-b border-gray-800">
          <div className="text-center max-w-2xl mx-auto">
            <h2 className="text-3xl font-bold mb-4">
              Pronto para <span className="text-iubi-light">construir</span>?
            </h2>
            <p className="text-gray-400 mb-8">
              Explore a API, teste no playground e comece a integrar soluções de 
              geovisualização na sua aplicação.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <a href="#playground" className="iubi-btn-primary">
                Abrir Playground
              </a>
              <a
                href="http://100.52.200.210:32060/"
                target="_blank"
                rel="noopener noreferrer"
                className="border border-gray-600 text-gray-300 font-semibold px-6 py-3 rounded-xl hover:bg-gray-800 transition-colors"
              >
                Ver Storybook
              </a>
            </div>
          </div>
        </div>

        {/* Links */}
        <div className="py-12 grid grid-cols-2 md:grid-cols-4 gap-8">
          <div>
            <h4 className="font-semibold text-white mb-4 flex items-center gap-2">
              <MapPinIcon size={16} className="text-iubi-accent" />
              Soluções
            </h4>
            <ul className="space-y-2 text-sm text-gray-400">
              <li><a href="#solutions" className="hover:text-white transition-colors">WebMap</a></li>
              <li><a href="#solutions" className="hover:text-white transition-colors">Dashboard</a></li>
              <li><a href="#solutions" className="hover:text-white transition-colors">Formulário</a></li>
              <li><a href="#solutions" className="hover:text-white transition-colors">Relatório</a></li>
              <li><a href="#solutions" className="hover:text-white transition-colors">Story Map</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-white mb-4 flex items-center gap-2">
              <GlobeIcon size={16} className="text-iubi-accent" />
              APIs
            </h4>
            <ul className="space-y-2 text-sm text-gray-400">
              <li><a href="http://100.52.200.210:32200/map-render/swagger-ui/index.html" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">Map Render</a></li>
              <li><a href="http://100.52.200.210:32200/catalog/swagger-ui/index.html" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">Catalog</a></li>
              <li><a href="http://100.52.200.210:32200/context/swagger-ui/index.html" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">Context</a></li>
              <li><a href="http://100.52.200.210:32200/ogc/swagger-ui/index.html" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">OGC Services</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-white mb-4 flex items-center gap-2">
              <LayersIcon size={16} className="text-iubi-accent" />
              Recursos
            </h4>
            <ul className="space-y-2 text-sm text-gray-400">
              <li><a href="http://100.52.200.210:32060/" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">Storybook</a></li>
              <li><a href="#examples" className="hover:text-white transition-colors">Exemplos</a></li>
              <li><a href="#components" className="hover:text-white transition-colors">Componentes</a></li>
              <li><a href="#playground" className="hover:text-white transition-colors">Playground</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-white mb-4 flex items-center gap-2">
              <CodeIcon size={16} className="text-iubi-accent" />
              Repositórios
            </h4>
            <ul className="space-y-2 text-sm text-gray-400">
              <li><a href="https://github.com/FITecInovacoesTecnologicas/61463_ge21-iubi-services" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">iubi-services</a></li>
              <li><a href="https://github.com/FITecInovacoesTecnologicas/61463_ge21-frontend" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">ge21-frontend</a></li>
              <li><a href="https://github.com/FITecInovacoesTecnologicas/61463_ge21-mfe-ui" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">ge21-mfe-ui</a></li>
              <li><a href="https://github.com/FITecInovacoesTecnologicas/61463_ge21-mfe-utils" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">ge21-mfe-utils</a></li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="py-6 border-t border-gray-800 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img src="/images/logo-icon.png" alt="IUBI" className="h-8 w-auto" />
            <div>
              <span className="text-sm font-bold text-white">IUBI Geosistema</span>
              <span className="text-xs text-gray-500 block">Habilite o conhecimento dos dados geoespaciais</span>
            </div>
          </div>
          <div className="text-xs text-gray-500">
            GE21 Geotecnologias &copy; {new Date().getFullYear()}
          </div>
        </div>
      </div>
    </footer>
  )
}

export default Footer
