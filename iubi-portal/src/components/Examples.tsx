import React from 'react'
import { MapPinIcon, LayersIcon, GlobeIcon, SatelliteIcon, ChartBarIcon, RulerIcon, HexagonIcon, CloudServerIcon } from './GeoIcons'

interface Example {
  title: string
  description: string
  icon: React.FC<{ size?: number; className?: string }>
  color: string
  bgColor: string
  tags: string[]
  code: string
}

const didacticExamples: Example[] = [
  {
    title: 'Mapa Interativo com OpenLayers',
    description: 'Integre o serviço Map Render com OpenLayers para exibir camadas WMS e WFS em um mapa interativo com controles de zoom, pan e identificação de feições.',
    icon: MapPinIcon,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    tags: ['OpenLayers', 'WMS', 'WFS'],
    code: `import Map from 'ol/Map'
import TileLayer from 'ol/layer/Tile'
import TileWMS from 'ol/source/TileWMS'

const map = new Map({
  target: 'map-container',
  layers: [
    new TileLayer({
      source: new TileWMS({
        url: '/api/ogc/v1/{connId}/wms',
        params: {
          LAYERS: 'uso_solo',
          FORMAT: 'image/png',
          TRANSPARENT: true
        }
      })
    })
  ],
  view: new View({
    center: fromLonLat([-49.0, -6.0]),
    zoom: 10
  })
})`,
  },
  {
    title: 'Catálogo de Camadas',
    description: 'Busque e liste camadas disponíveis no catálogo IUBI. Exiba metadados como nome, tipo, CRS e extensão geográfica para o usuário selecionar.',
    icon: LayersIcon,
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-50',
    tags: ['Catalog API', 'Metadados', 'Search'],
    code: `async function loadCatalog(connId) {
  // Buscar camadas disponíveis
  const res = await fetch(
    \`/api/catalog/v1/\${connId}/search\`
  )
  const layers = await res.json()
  
  // Renderizar lista de camadas
  layers.forEach(layer => {
    const card = createLayerCard({
      name: layer.name,
      type: layer.type,  // VECTOR | RASTER
      crs: layer.crs,
      bbox: layer.bbox
    })
    catalog.appendChild(card)
  })
}`,
  },
  {
    title: 'Dashboard Espacial',
    description: 'Combine mapas com gráficos e estatísticas usando a API de Context para criar dashboards interativos com indicadores geoespaciais.',
    icon: ChartBarIcon,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    tags: ['Dashboard', 'Context API', 'Charts'],
    code: `// Criar dashboard com mapa e gráficos
const dashboard = {
  type: 'DASHBOARD',
  title: 'Uso do Solo - Carajás',
  context: {
    layout: [
      { type: 'map', x: 0, y: 0, w: 8, h: 6 },
      { type: 'chart', x: 8, y: 0, w: 4, h: 3,
        config: { type: 'pie',
          dataSource: 'uso_solo',
          groupBy: 'classe' }},
      { type: 'stats', x: 8, y: 3, w: 4, h: 3,
        config: { metrics: ['area_total',
          'num_municipios', 'cobertura'] }}
    ]
  }
}

await fetch('/api/context/api/v1/contents/DASHBOARD', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(dashboard)
})`,
  },
  {
    title: 'Consulta WFS com Filtro CQL',
    description: 'Execute consultas avançadas usando filtros CQL no padrão OGC WFS. Filtre feições por atributos, extensão espacial e intervalo temporal.',
    icon: GlobeIcon,
    color: 'text-amber-600',
    bgColor: 'bg-amber-50',
    tags: ['OGC', 'WFS', 'CQL Filter'],
    code: `// Filtrar municípios com mais de 50.000 hab
const params = new URLSearchParams({
  SERVICE: 'WFS',
  REQUEST: 'GetFeature',
  VERSION: '2.0.0',
  TYPENAMES: 'municipios',
  CQL_FILTER: "populacao > 50000 AND uf = 'PA'",
  OUTPUTFORMAT: 'application/geo+json'
})

const res = await fetch(
  \`/api/ogc/v1/\${connId}/wfs?\${params}\`
)
const geojson = await res.json()

// Adicionar ao mapa com estilo temático
const vectorLayer = new VectorLayer({
  source: new VectorSource({
    features: new GeoJSON().readFeatures(geojson)
  }),
  style: (feature) => classifyByPopulation(feature)
})
map.addLayer(vectorLayer)`,
  },
  {
    title: 'Análise de Sensoriamento Remoto',
    description: 'Visualize séries temporais de imagens de satélite (Landsat, Sentinel) com filtros por data e composição de bandas RGB.',
    icon: SatelliteIcon,
    color: 'text-teal-600',
    bgColor: 'bg-teal-50',
    tags: ['Raster', 'Temporal', 'RGB'],
    code: `// Visualizar série temporal de NDVI
const timeParams = {
  layer: 'ndvi_landsat',
  time: '2020-01/2024-01',
  bbox: '-49.5,-6.5,-48.0,-5.0',
  style: 'ndvi_diverging'
}

// Renderizar animação temporal
const frames = await Promise.all(
  generateMonthlyDates('2020-01', '2024-01')
    .map(date => fetch(
      \`/api/map-render/v1/\${connId}/render/map\` +
      \`?LAYERS=ndvi&TIME=\${date}\` +
      \`&BBOX=\${timeParams.bbox}\` +
      \`&WIDTH=800&HEIGHT=600\`
    ).then(r => r.blob()))
)`,
  },
  {
    title: 'Story Map Interativo',
    description: 'Crie narrativas espaciais combinando mapas, textos e mídias. Use a API Context para montar story maps com transições entre localizações.',
    icon: HexagonIcon,
    color: 'text-rose-600',
    bgColor: 'bg-rose-50',
    tags: ['Story Map', 'Narrativa', 'Context'],
    code: `// Criar Story Map com cenas geolocalizadas
const storyMap = {
  type: 'STORY_MAP',
  title: 'A Mineração em Carajás',
  context: {
    scenes: [
      {
        title: 'Serra dos Carajás',
        text: 'A maior província mineral...',
        center: [-50.35, -6.08],
        zoom: 12,
        layers: ['limites_flona', 'minas_ativas']
      },
      {
        title: 'Impacto Ambiental',
        text: 'Análise temporal do desmatamento...',
        center: [-49.9, -6.2],
        zoom: 11,
        layers: ['desmatamento_2023', 'areas_protegidas'],
        media: { type: 'chart', ref: 'trend_chart' }
      }
    ]
  }
}`,
  },
  {
    title: 'Medição e Análise Espacial',
    description: 'Calcule distâncias, áreas, buffers e interseções usando as APIs de análise espacial do Map Render.',
    icon: RulerIcon,
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-50',
    tags: ['Análise', 'Buffer', 'Geometria'],
    code: `// Calcular estatísticas de área por classe
const stats = await fetch(
  \`/api/map-render/v1/\${connId}/data/layers\` +
  \`/uso_solo/statistics\`,
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      attributes: ['area_ha', 'classe'],
      operations: ['count', 'sum', 'avg'],
      filter: {
        cql: "ano = 2023",
        bbox: [-49.5, -6.5, -48.0, -5.0]
      }
    })
  }
)
const result = await stats.json()
renderBarChart(result)`,
  },
  {
    title: 'Upload e Ingestão de Dados',
    description: 'Faça upload de arquivos geoespaciais (GeoJSON, Shapefile, KML) e ingira-os no sistema para visualização e análise imediata.',
    icon: CloudServerIcon,
    color: 'text-cyan-600',
    bgColor: 'bg-cyan-50',
    tags: ['Upload', 'Ingestão', 'GeoJSON'],
    code: `// Upload de arquivo GeoJSON
const fileInput = document.querySelector('#file-input')
const file = fileInput.files[0]

const formData = new FormData()
formData.append('file', file)

const res = await fetch(
  '/api/map-render/ingestion/upload-wfs-geojson-file',
  {
    method: 'POST',
    body: formData
  }
)
const result = await res.json()
console.log('Camada criada:', result.layerName)

// Adicionar camada importada ao mapa
map.addLayer(createVectorLayer(result.layerName))`,
  },
]

const Examples: React.FC = () => {
  return (
    <section id="examples" className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <span className="iubi-badge mb-4">Exemplos Didáticos</span>
          <h2 className="iubi-section-title">
            Aprenda com <span className="text-gradient">exemplos práticos</span>
          </h2>
          <p className="iubi-section-subtitle">
            Código pronto para copiar e adaptar. Cada exemplo demonstra um caso de uso 
            real da plataforma IUBI.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {didacticExamples.map((ex, idx) => (
            <div key={idx} className="iubi-card overflow-hidden group">
              <div className="p-6">
                <div className="flex items-start gap-4 mb-4">
                  <div className={`geo-icon ${ex.bgColor} flex-shrink-0`}>
                    <ex.icon size={24} className={ex.color} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">{ex.title}</h3>
                    <p className="text-sm text-gray-600 mt-1 leading-relaxed">{ex.description}</p>
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {ex.tags.map(tag => (
                        <span key={tag} className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-gray-100 text-gray-600">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-900 px-6 py-4 border-t border-gray-800">
                <pre className="text-xs font-mono text-gray-400 overflow-x-auto max-h-48 leading-relaxed">
                  <code>{ex.code}</code>
                </pre>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export default Examples
