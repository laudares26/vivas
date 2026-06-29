import React, { useEffect, useRef } from 'react'
import Map from 'ol/Map'
import View from 'ol/View'
import TileLayer from 'ol/layer/Tile'
import VectorLayer from 'ol/layer/Vector'
import VectorSource from 'ol/source/Vector'
import OSM from 'ol/source/OSM'
import GeoJSON from 'ol/format/GeoJSON'
import { fromLonLat } from 'ol/proj'
import { Fill, Stroke, Style, Circle as CircleStyle } from 'ol/style'
import 'ol/ol.css'

interface ResponsePreviewProps {
  response: string
  exampleId: string
  loading: boolean
}

interface ConnectionItem {
  id?: string | number
  name?: string
  type?: string
  host?: string
  port?: number
  database?: string
  status?: string
  [key: string]: unknown
}

interface LayerItem {
  name?: string
  title?: string
  type?: string
  crs?: string
  bbox?: number[]
  [key: string]: unknown
}

interface StatResult {
  count?: number
  sum?: number
  avg?: number
  min?: number
  max?: number
  [key: string]: unknown
}

interface GeoJSONData {
  type: string
  features?: Array<{
    type: string
    geometry: { type: string; coordinates: unknown }
    properties?: Record<string, unknown>
  }>
}

function parseResponseData(response: string): unknown {
  const lines = response.split('\n')
  const jsonStart = lines.findIndex(l => !l.startsWith('//') && l.trim() !== '')
  if (jsonStart === -1) return null
  const jsonStr = lines.slice(jsonStart).join('\n')
  try {
    return JSON.parse(jsonStr)
  } catch {
    return null
  }
}

function isGeoJSON(data: unknown): data is GeoJSONData {
  if (!data || typeof data !== 'object') return false
  const obj = data as Record<string, unknown>
  return obj.type === 'FeatureCollection' || obj.type === 'Feature'
}

function isConnectionArray(data: unknown): data is ConnectionItem[] {
  if (!Array.isArray(data) || data.length === 0) return false
  const first = data[0] as Record<string, unknown>
  return ('name' in first || 'host' in first || 'type' in first) && !('geometry' in first)
}

function isStatistics(data: unknown): data is StatResult {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return false
  const obj = data as Record<string, unknown>
  return 'count' in obj || 'sum' in obj || 'avg' in obj
}

const typeIcons: Record<string, string> = {
  GEOSERVER: '🗺️',
  POSTGIS: '🐘',
  WMS: '🌍',
  WFS: '📐',
  MAPSERVER: '🗂️',
  FILE: '📁',
}

const statusColors: Record<string, string> = {
  ACTIVE: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  CONNECTED: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  INACTIVE: 'bg-gray-100 text-gray-500 border-gray-200',
  ERROR: 'bg-red-100 text-red-700 border-red-200',
}

const ConnectionsPreview: React.FC<{ data: ConnectionItem[] }> = ({ data }) => (
  <div className="space-y-3">
    <div className="flex items-center justify-between mb-4">
      <h4 className="text-sm font-semibold text-white flex items-center gap-2">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-iubi-light">
          <ellipse cx="12" cy="5" rx="9" ry="3" /><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" /><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
        </svg>
        {data.length} conexões encontradas
      </h4>
    </div>
    <div className="grid gap-3">
      {data.map((conn, i) => {
        const name = conn.name || conn.id || `Conexão ${i + 1}`
        const type = (typeof conn.type === 'string' ? conn.type : 'UNKNOWN').toUpperCase()
        const status = typeof conn.status === 'string' ? conn.status.toUpperCase() : 'ACTIVE'
        return (
          <div key={i} className="bg-gray-700/60 rounded-xl p-4 border border-gray-600 hover:border-iubi-accent/40 transition-all">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gray-600 flex items-center justify-center text-xl">
                  {typeIcons[type] || '🔗'}
                </div>
                <div>
                  <div className="text-sm font-semibold text-white">{String(name)}</div>
                  <div className="text-xs text-gray-400 font-mono mt-0.5">
                    {conn.host && `${conn.host}`}{conn.port ? `:${conn.port}` : ''}{conn.database ? ` / ${conn.database}` : ''}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-blue-100 text-blue-700 border border-blue-200">
                  {type}
                </span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${statusColors[status] || statusColors.ACTIVE}`}>
                  {status}
                </span>
              </div>
            </div>
            {conn.id && (
              <div className="mt-2 pt-2 border-t border-gray-600">
                <span className="text-[10px] text-gray-500 font-mono">ID: {String(conn.id)}</span>
              </div>
            )}
          </div>
        )
      })}
    </div>
  </div>
)

const LayersPreview: React.FC<{ data: LayerItem[] }> = ({ data }) => (
  <div className="space-y-3">
    <h4 className="text-sm font-semibold text-white flex items-center gap-2 mb-4">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-iubi-light">
        <polygon points="12 2 2 7 12 12 22 7 12 2" /><polyline points="2 17 12 22 22 17" /><polyline points="2 12 12 17 22 12" />
      </svg>
      {data.length} camadas encontradas
    </h4>
    <div className="grid gap-2">
      {data.map((layer, i) => (
        <div key={i} className="bg-gray-700/60 rounded-lg p-3 border border-gray-600 flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-gradient-to-br from-iubi-accent/30 to-iubi-500/30 flex items-center justify-center">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-iubi-light">
              <polygon points="12 2 2 7 12 12 22 7 12 2" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-white truncate">{layer.name || layer.title || `Layer ${i + 1}`}</div>
            <div className="text-xs text-gray-400 flex items-center gap-2 mt-0.5">
              {layer.type && <span className="uppercase">{layer.type}</span>}
              {layer.crs && <span className="font-mono">{layer.crs}</span>}
            </div>
          </div>
        </div>
      ))}
    </div>
  </div>
)

const MapPreview: React.FC<{ data: GeoJSONData }> = ({ data }) => {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<Map | null>(null)

  useEffect(() => {
    if (!mapRef.current || !data) return

    if (mapInstanceRef.current) {
      mapInstanceRef.current.setTarget(undefined)
      mapInstanceRef.current = null
    }

    const format = new GeoJSON()
    const features = format.readFeatures(data, {
      featureProjection: 'EPSG:3857',
      dataProjection: 'EPSG:4326',
    })

    const vectorSource = new VectorSource({ features })

    const vectorLayer = new VectorLayer({
      source: vectorSource,
      style: new Style({
        fill: new Fill({ color: 'rgba(0, 137, 220, 0.2)' }),
        stroke: new Stroke({ color: '#0089dc', width: 2 }),
        image: new CircleStyle({
          radius: 6,
          fill: new Fill({ color: '#0089dc' }),
          stroke: new Stroke({ color: '#fff', width: 2 }),
        }),
      }),
    })

    const map = new Map({
      target: mapRef.current,
      layers: [
        new TileLayer({ source: new OSM() }),
        vectorLayer,
      ],
      view: new View({
        center: fromLonLat([-49.0, -6.0]),
        zoom: 4,
      }),
    })

    if (features.length > 0) {
      const extent = vectorSource.getExtent()
      map.getView().fit(extent, { padding: [40, 40, 40, 40], maxZoom: 14 })
    }

    mapInstanceRef.current = map
    setTimeout(() => map.updateSize(), 100)

    return () => {
      map.setTarget(undefined)
    }
  }, [data])

  const featureCount = data.features?.length || 0
  const geometryTypes = [...new Set(data.features?.map(f => f.geometry?.type) || [])]

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-white flex items-center gap-2">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-iubi-light">
            <circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
          </svg>
          Mapa Interativo
        </h4>
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-700">
            {featureCount} feições
          </span>
          {geometryTypes.map(t => (
            <span key={t} className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-700">
              {t}
            </span>
          ))}
        </div>
      </div>
      <div ref={mapRef} className="w-full h-[350px] rounded-xl overflow-hidden border border-gray-600" />
      {data.features && data.features.length > 0 && data.features[0].properties && (
        <div className="bg-gray-700/60 rounded-lg border border-gray-600 overflow-hidden">
          <div className="px-3 py-2 bg-gray-700 text-xs font-semibold text-gray-300 uppercase tracking-wider">
            Atributos da primeira feição
          </div>
          <div className="p-3 grid grid-cols-2 gap-2 max-h-[150px] overflow-auto">
            {Object.entries(data.features[0].properties || {}).slice(0, 10).map(([key, val]) => (
              <div key={key} className="text-xs">
                <span className="text-gray-400 font-mono">{key}:</span>{' '}
                <span className="text-white">{String(val ?? 'null')}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

const StatsPreview: React.FC<{ data: StatResult }> = ({ data }) => {
  const statEntries = Object.entries(data).filter(
    ([, v]) => typeof v === 'number' || typeof v === 'string'
  )
  const numericEntries = statEntries.filter(([, v]) => typeof v === 'number')
  const maxVal = Math.max(...numericEntries.map(([, v]) => Math.abs(v as number)), 1)

  const statLabels: Record<string, string> = {
    count: 'Contagem',
    sum: 'Soma Total',
    avg: 'Média',
    min: 'Mínimo',
    max: 'Máximo',
    area: 'Área',
    total: 'Total',
  }

  const statColors = ['from-blue-500 to-blue-600', 'from-emerald-500 to-emerald-600', 'from-purple-500 to-purple-600', 'from-amber-500 to-amber-600', 'from-red-500 to-red-600']

  return (
    <div className="space-y-4">
      <h4 className="text-sm font-semibold text-white flex items-center gap-2">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-iubi-light">
          <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" />
        </svg>
        Estatísticas Espaciais
      </h4>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {numericEntries.slice(0, 6).map(([key, val], i) => (
          <div key={key} className="bg-gray-700/60 rounded-xl p-4 border border-gray-600">
            <div className="text-xs text-gray-400 uppercase tracking-wider mb-1">
              {statLabels[key.toLowerCase()] || key}
            </div>
            <div className={`text-2xl font-bold bg-gradient-to-r ${statColors[i % statColors.length]} bg-clip-text text-transparent`}>
              {typeof val === 'number' ? val.toLocaleString('pt-BR', { maximumFractionDigits: 2 }) : String(val)}
            </div>
          </div>
        ))}
      </div>
      {numericEntries.length > 1 && (
        <div className="bg-gray-700/60 rounded-xl p-4 border border-gray-600">
          <div className="text-xs text-gray-400 uppercase tracking-wider mb-3">Distribuição</div>
          <div className="space-y-2">
            {numericEntries.slice(0, 5).map(([key, val]) => (
              <div key={key} className="flex items-center gap-3">
                <span className="text-xs text-gray-400 w-16 text-right font-mono">{statLabels[key.toLowerCase()] || key}</span>
                <div className="flex-1 h-5 bg-gray-600 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-iubi-accent to-iubi-500 rounded-full transition-all duration-500"
                    style={{ width: `${Math.max(5, (Math.abs(val as number) / maxVal) * 100)}%` }}
                  />
                </div>
                <span className="text-xs text-white w-20 font-mono">
                  {typeof val === 'number' ? val.toLocaleString('pt-BR', { maximumFractionDigits: 2 }) : String(val)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

const ContextPreview: React.FC<{ data: Record<string, unknown> }> = ({ data }) => {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<Map | null>(null)

  useEffect(() => {
    if (!mapRef.current) return
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setTarget(undefined)
    }

    const ctx = (data.context || data) as Record<string, unknown>
    const center = (ctx.center as number[]) || [-49.0, -6.0]
    const zoom = (ctx.zoom as number) || 10

    const map = new Map({
      target: mapRef.current,
      layers: [new TileLayer({ source: new OSM() })],
      view: new View({
        center: fromLonLat(center),
        zoom,
      }),
    })

    mapInstanceRef.current = map
    setTimeout(() => map.updateSize(), 100)

    return () => { map.setTarget(undefined) }
  }, [data])

  const title = data.title as string || 'WebMap Context'
  const description = data.description as string || ''
  const ctx = (data.context || {}) as Record<string, unknown>
  const layers = (ctx.layers as Array<Record<string, unknown>>) || []

  return (
    <div className="space-y-3">
      <div className="bg-gradient-to-r from-emerald-500/10 to-blue-500/10 rounded-xl p-4 border border-emerald-500/30">
        <div className="flex items-center gap-2 mb-1">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-emerald-400">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
          </svg>
          <span className="text-sm font-semibold text-emerald-400">Contexto criado com sucesso</span>
        </div>
        <div className="text-white font-semibold mt-2">{title}</div>
        {description && <div className="text-sm text-gray-400 mt-1">{description}</div>}
      </div>
      <div ref={mapRef} className="w-full h-[250px] rounded-xl overflow-hidden border border-gray-600" />
      {layers.length > 0 && (
        <div className="bg-gray-700/60 rounded-lg p-3 border border-gray-600">
          <div className="text-xs text-gray-400 uppercase tracking-wider mb-2">Camadas configuradas</div>
          {layers.map((l, i) => (
            <div key={i} className="flex items-center gap-2 py-1">
              <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: (l.style as Record<string, string>)?.fillColor || '#0089dc' }} />
              <span className="text-sm text-white">{(l.name as string) || `Layer ${i + 1}`}</span>
              <span className="text-xs text-gray-400 ml-auto">
                {l.visible !== false ? 'visível' : 'oculta'} | opacidade: {((l.opacity as number) ?? 1) * 100}%
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

const GenericPreview: React.FC<{ data: unknown }> = ({ data }) => {
  if (Array.isArray(data)) {
    const columns = Object.keys(data[0] || {}).slice(0, 6)
    return (
      <div className="space-y-3">
        <h4 className="text-sm font-semibold text-white flex items-center gap-2">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-iubi-light">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><line x1="3" y1="9" x2="21" y2="9" /><line x1="9" y1="21" x2="9" y2="9" />
          </svg>
          {data.length} registros
        </h4>
        <div className="bg-gray-700/60 rounded-xl border border-gray-600 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-700">
                  {columns.map(col => (
                    <th key={col} className="px-3 py-2 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.slice(0, 20).map((row, i) => (
                  <tr key={i} className="border-t border-gray-600 hover:bg-gray-600/30">
                    {columns.map(col => (
                      <td key={col} className="px-3 py-2 text-xs text-gray-300 font-mono max-w-[200px] truncate">
                        {String((row as Record<string, unknown>)[col] ?? '')}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-gray-700/60 rounded-xl p-4 border border-gray-600">
      <pre className="text-sm font-mono text-gray-300 whitespace-pre-wrap overflow-auto max-h-[400px]">
        {JSON.stringify(data, null, 2)}
      </pre>
    </div>
  )
}

const ResponsePreview: React.FC<ResponsePreviewProps> = ({ response, exampleId, loading }) => {
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="relative w-16 h-16 mx-auto mb-4">
            <div className="absolute inset-0 rounded-full border-4 border-gray-700" />
            <div className="absolute inset-0 rounded-full border-4 border-iubi-accent border-t-transparent animate-spin" />
          </div>
          <p className="text-gray-400">Renderizando visualização...</p>
        </div>
      </div>
    )
  }

  if (!response) {
    return (
      <div className="flex items-center justify-center h-64 text-center">
        <div>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-gray-600 mx-auto mb-4">
            <rect x="2" y="3" width="20" height="14" rx="2" ry="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" />
          </svg>
          <p className="text-gray-400 mb-2">Visualização ao vivo</p>
          <p className="text-gray-500 text-sm">
            Clique em <strong className="text-iubi-light">Executar</strong> para ver o resultado renderizado como o usuário final
          </p>
        </div>
      </div>
    )
  }

  const wmsImageMatch = response.match(/\/\/ WMS-Image-URL: (.+)/)
  if (wmsImageMatch) {
    const imgUrl = wmsImageMatch[1].trim()
    const sizeMatch = response.match(/\((\d+\.\d+) KB\)/)
    const sizeKB = sizeMatch ? sizeMatch[1] : '?'
    const ctMatch = response.match(/\/\/ Content-Type: (.+)/)
    const contentType = ctMatch ? ctMatch[1].trim() : 'image/png'
    return (
      <div className="p-6">
        <div className="mb-4 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-sky-100 flex items-center justify-center">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0284c7" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">Mapa WMS Renderizado</h3>
            <p className="text-xs text-gray-400">{contentType} &middot; {sizeKB} KB</p>
          </div>
        </div>
        <div className="rounded-xl overflow-hidden border border-gray-600 bg-gray-900">
          <img
            src={imgUrl}
            alt="Mapa WMS"
            className="w-full h-auto"
            style={{ maxHeight: '500px', objectFit: 'contain' }}
          />
        </div>
        <p className="text-xs text-gray-500 mt-3 text-center">
          Imagem gerada pelo GeoServer via protocolo OGC WMS (Web Map Service)
        </p>
      </div>
    )
  }

  const isNetworkError = response.includes('Erro na requisição')
  const isHttpError = /\/\/ Status: [45]\d{2}/.test(response)

  if (isNetworkError || isHttpError) {
    const errorMsg = isNetworkError
      ? 'Servidor indisponível'
      : 'Erro na resposta da API'

    let errorDetail = ''
    if (isHttpError) {
      const statusMatch = response.match(/\/\/ Status: (\d+ .+)/)
      const parsed = parseResponseData(response)
      if (parsed && typeof parsed === 'object' && 'message' in (parsed as Record<string, unknown>)) {
        errorDetail = String((parsed as Record<string, unknown>).message)
      } else if (statusMatch) {
        errorDetail = `Status: ${statusMatch[1]}`
      }
    }

    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center max-w-md">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-amber-400 mx-auto mb-4">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          <p className="text-amber-400 font-semibold mb-2">{errorMsg}</p>
          {errorDetail && (
            <p className="text-gray-400 text-sm mb-3 font-mono bg-gray-800/50 px-3 py-2 rounded">
              {errorDetail}
            </p>
          )}
          <p className="text-gray-400 text-sm">
            Substitua os parâmetros <code className="px-1 py-0.5 bg-gray-700 rounded text-xs font-mono text-iubi-light">{'{connection_id}'}</code> por valores reais.
            Use "Listar Conexões" primeiro para obter IDs válidos.
          </p>
        </div>
      </div>
    )
  }

  const data = parseResponseData(response)
  if (!data) {
    return (
      <div className="p-6">
        <pre className="text-sm font-mono text-gray-300 whitespace-pre-wrap overflow-auto max-h-[400px]">
          {response}
        </pre>
      </div>
    )
  }

  if (isGeoJSON(data)) {
    return (
      <div className="p-6">
        <MapPreview data={data} />
      </div>
    )
  }

  if (exampleId === 'create-context' || (typeof data === 'object' && !Array.isArray(data) && 'context' in (data as Record<string, unknown>))) {
    return (
      <div className="p-6">
        <ContextPreview data={data as Record<string, unknown>} />
      </div>
    )
  }

  if (isStatistics(data)) {
    return (
      <div className="p-6">
        <StatsPreview data={data} />
      </div>
    )
  }

  if (isConnectionArray(data)) {
    const items = data as Record<string, unknown>[]
    const hasLayerFields = items.some(item => 'crs' in item || 'bbox' in item)
    if (hasLayerFields) {
      return (
        <div className="p-6">
          <LayersPreview data={data as LayerItem[]} />
        </div>
      )
    }
    return (
      <div className="p-6">
        <ConnectionsPreview data={data} />
      </div>
    )
  }

  return (
    <div className="p-6">
      <GenericPreview data={data} />
    </div>
  )
}

export default ResponsePreview
