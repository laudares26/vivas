import React, { useState } from 'react'
import { examples } from '../data/examples'
import { CodeIcon } from './GeoIcons'

const difficultyColors: Record<string, string> = {
  iniciante: 'bg-emerald-100 text-emerald-700',
  intermediario: 'bg-amber-100 text-amber-700',
  avancado: 'bg-red-100 text-red-700',
}

const difficultyLabels: Record<string, string> = {
  iniciante: 'Iniciante',
  intermediario: 'Intermediário',
  avancado: 'Avançado',
}

const serviceColors: Record<string, string> = {
  'map-render': 'border-blue-300 bg-blue-50',
  catalog: 'border-emerald-300 bg-emerald-50',
  context: 'border-purple-300 bg-purple-50',
  ogc: 'border-amber-300 bg-amber-50',
}

const Playground: React.FC = () => {
  const [activeExample, setActiveExample] = useState(examples[0])
  const [response, setResponse] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'code' | 'request' | 'response'>('code')
  const [url, setUrl] = useState(activeExample.requestConfig.url)
  const [method, setMethod] = useState(activeExample.requestConfig.method)
  const [body, setBody] = useState(activeExample.requestConfig.body || '')

  const handleSelectExample = (ex: typeof examples[0]) => {
    setActiveExample(ex)
    setUrl(ex.requestConfig.url)
    setMethod(ex.requestConfig.method)
    setBody(ex.requestConfig.body || '')
    setResponse('')
    setActiveTab('code')
  }

  const handleSendRequest = async () => {
    setLoading(true)
    setActiveTab('response')
    try {
      const opts: RequestInit = {
        method,
        headers: { 'Content-Type': 'application/json' },
      }
      if (method !== 'GET' && body) {
        opts.body = body
      }
      const res = await fetch(url, opts)
      const contentType = res.headers.get('content-type') || ''
      let data: string
      if (contentType.includes('json')) {
        const json = await res.json()
        data = JSON.stringify(json, null, 2)
      } else {
        data = await res.text()
      }
      setResponse(`// Status: ${res.status} ${res.statusText}\n// Content-Type: ${contentType}\n\n${data}`)
    } catch (err) {
      setResponse(`// Erro na requisição\n// ${err instanceof Error ? err.message : 'Erro desconhecido'}\n\n// Dica: Substitua {connection_id} e {layer} por valores reais.\n// Use a API de Catalog para listar conexões disponíveis:\n// GET /api/catalog/v1/connections`)
    }
    setLoading(false)
  }

  return (
    <section id="playground" className="py-24 bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-iubi-accent/20 text-iubi-light border border-iubi-accent/30 mb-4">
            <CodeIcon size={14} />
            Playground
          </span>
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Teste as APIs <span className="text-iubi-light">ao vivo</span>
          </h2>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto">
            Selecione um exemplo, edite os parâmetros e execute a requisição diretamente no navegador.
          </p>
        </div>

        <div className="grid lg:grid-cols-12 gap-6">
          {/* Example list */}
          <div className="lg:col-span-4 space-y-3">
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4 px-1">
              Exemplos Didáticos
            </h3>
            {examples.map(ex => (
              <button
                key={ex.id}
                onClick={() => handleSelectExample(ex)}
                className={`w-full text-left rounded-xl p-4 transition-all border ${
                  activeExample.id === ex.id
                    ? 'bg-gray-800 border-iubi-accent/50 shadow-lg shadow-iubi-accent/10'
                    : 'bg-gray-800/50 border-gray-700 hover:bg-gray-800 hover:border-gray-600'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    activeExample.id === ex.id ? 'bg-iubi-accent/20 text-iubi-light' : 'bg-gray-700 text-gray-400'
                  }`}>
                    <span className="text-xs font-bold">{ex.service === 'map-render' ? 'MR' : ex.service === 'catalog' ? 'CT' : ex.service === 'context' ? 'CX' : 'OG'}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-white truncate">{ex.title}</div>
                    <div className="text-xs text-gray-500 mt-1 line-clamp-2">{ex.description}</div>
                    <div className="flex items-center gap-2 mt-2">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${difficultyColors[ex.difficulty]}`}>
                        {difficultyLabels[ex.difficulty]}
                      </span>
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>

          {/* Code / Request / Response panel */}
          <div className="lg:col-span-8">
            <div className="rounded-2xl overflow-hidden border border-gray-700 bg-gray-800">
              {/* Tabs */}
              <div className="flex items-center border-b border-gray-700">
                {(['code', 'request', 'response'] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-6 py-3 text-sm font-medium transition-colors ${
                      activeTab === tab
                        ? 'text-iubi-light border-b-2 border-iubi-accent bg-gray-800/80'
                        : 'text-gray-500 hover:text-gray-300'
                    }`}
                  >
                    {tab === 'code' ? 'Código' : tab === 'request' ? 'Requisição' : 'Resposta'}
                  </button>
                ))}
                <div className="flex-1" />
                <button
                  onClick={handleSendRequest}
                  disabled={loading}
                  className="mr-4 px-4 py-1.5 bg-iubi-accent text-white text-sm font-medium rounded-lg hover:bg-iubi-500 transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {loading ? (
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polygon points="5 3 19 12 5 21 5 3" />
                    </svg>
                  )}
                  Executar
                </button>
              </div>

              {/* Tab content */}
              <div className="min-h-[400px]">
                {activeTab === 'code' && (
                  <div className="p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <span className={`px-2 py-0.5 rounded text-xs font-bold border ${serviceColors[activeExample.service]}`}>
                        {activeExample.service}
                      </span>
                      <span className="text-gray-400 text-sm">{activeExample.title}</span>
                    </div>
                    <pre className="text-sm font-mono text-gray-300 whitespace-pre-wrap leading-relaxed overflow-auto max-h-[500px]">
                      <code>{activeExample.code}</code>
                    </pre>
                  </div>
                )}

                {activeTab === 'request' && (
                  <div className="p-6 space-y-4">
                    <div className="flex items-center gap-3">
                      <select
                        value={method}
                        onChange={e => setMethod(e.target.value)}
                        className="bg-gray-700 text-white px-3 py-2 rounded-lg border border-gray-600 text-sm font-mono focus:border-iubi-accent focus:outline-none"
                      >
                        <option>GET</option>
                        <option>POST</option>
                        <option>PUT</option>
                        <option>DELETE</option>
                      </select>
                      <input
                        type="text"
                        value={url}
                        onChange={e => setUrl(e.target.value)}
                        className="flex-1 bg-gray-700 text-white px-4 py-2 rounded-lg border border-gray-600 text-sm font-mono focus:border-iubi-accent focus:outline-none"
                        placeholder="/api/..."
                      />
                    </div>

                    {(method === 'POST' || method === 'PUT') && (
                      <div>
                        <label className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-2 block">
                          Request Body (JSON)
                        </label>
                        <textarea
                          value={body}
                          onChange={e => setBody(e.target.value)}
                          rows={10}
                          className="w-full bg-gray-700 text-white px-4 py-3 rounded-lg border border-gray-600 text-sm font-mono focus:border-iubi-accent focus:outline-none resize-y"
                          placeholder="{}"
                        />
                      </div>
                    )}

                    <div className="p-3 bg-gray-700/50 rounded-lg border border-gray-600">
                      <div className="text-xs text-gray-400 mb-1">Headers</div>
                      <div className="text-sm font-mono text-gray-300">
                        Content-Type: application/json
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'response' && (
                  <div className="p-6">
                    {loading ? (
                      <div className="flex items-center justify-center h-64">
                        <div className="text-center">
                          <svg className="animate-spin h-8 w-8 text-iubi-accent mx-auto mb-4" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                          <p className="text-gray-400">Executando requisição...</p>
                        </div>
                      </div>
                    ) : response ? (
                      <pre className="text-sm font-mono text-gray-300 whitespace-pre-wrap leading-relaxed overflow-auto max-h-[500px]">
                        <code>{response}</code>
                      </pre>
                    ) : (
                      <div className="flex items-center justify-center h-64 text-center">
                        <div>
                          <CodeIcon size={48} className="text-gray-600 mx-auto mb-4" />
                          <p className="text-gray-400 mb-2">Nenhuma resposta ainda</p>
                          <p className="text-gray-500 text-sm">
                            Clique em <strong className="text-iubi-light">Executar</strong> para enviar a requisição
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Hints */}
            <div className="mt-4 p-4 bg-gray-800/50 rounded-xl border border-gray-700">
              <div className="flex items-start gap-3">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-amber-400 flex-shrink-0 mt-0.5">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <div className="text-sm text-gray-400">
                  <strong className="text-gray-300">Dica:</strong> Comece listando as conexões com 
                  <code className="mx-1 px-1.5 py-0.5 bg-gray-700 rounded text-xs font-mono text-iubi-light">GET /api/catalog/v1/connections</code>
                  para obter um <code className="mx-1 px-1.5 py-0.5 bg-gray-700 rounded text-xs font-mono text-iubi-light">connection_id</code> válido.
                  Depois use esse ID nos demais endpoints.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default Playground
