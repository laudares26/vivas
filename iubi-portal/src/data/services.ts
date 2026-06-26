export interface ServiceEndpoint {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE'
  path: string
  summary: string
  description: string
  tag: string
}

export interface IubiService {
  id: string
  name: string
  description: string
  icon: string
  color: string
  bgColor: string
  swaggerUrl: string
  endpoints: ServiceEndpoint[]
}

export const services: IubiService[] = [
  {
    id: 'map-render',
    name: 'Map Render',
    description: 'Renderização de mapas, edição vetorial, consulta de feições e estatísticas espaciais. Motor central de visualização cartográfica.',
    icon: 'map',
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    swaggerUrl: 'http://100.52.200.210:32200/map-render/swagger-ui/index.html',
    endpoints: [
      { method: 'GET', path: '/v1/{connection_id}/render/map', summary: 'Renderiza mapa completo', description: 'Retorna imagem do mapa renderizado com todas as camadas configuradas.', tag: 'Rendering' },
      { method: 'GET', path: '/v1/{connection_id}/render/legend', summary: 'Gera legenda do mapa', description: 'Retorna a legenda gráfica das camadas ativas.', tag: 'Rendering' },
      { method: 'GET', path: '/v1/{connection_id}/render/layers/{layer}/features', summary: 'Consulta feições (GeoJSON)', description: 'Retorna feições vetoriais em GeoJSON com filtros por bbox, CQL e tempo.', tag: 'Rendering' },
      { method: 'GET', path: '/v1/{connection_id}/render/feature-info', summary: 'Info da feição clicada', description: 'Retorna informações detalhadas de uma feição no ponto clicado (GetFeatureInfo).', tag: 'Rendering' },
      { method: 'POST', path: '/v1/{connection_id}/render/feature/{layer}', summary: 'Cria feição local', description: 'Adiciona nova feição vetorial em uma camada local.', tag: 'Vector Editing' },
      { method: 'PUT', path: '/v1/{connection_id}/render/feature/{layer}/{feature_id}', summary: 'Atualiza feição', description: 'Atualiza geometria e/ou propriedades de uma feição local existente.', tag: 'Vector Editing' },
      { method: 'POST', path: '/v1/{connection_id}/data/layers/{layer}/statistics', summary: 'Estatísticas espaciais', description: 'Calcula estatísticas (contagem, soma, média, etc.) para atributos de uma camada.', tag: 'Data' },
      { method: 'POST', path: '/ingestion/upload-wfs-geojson-file', summary: 'Ingestão de dados', description: 'Upload de arquivo GeoJSON para ingestão via WFS.', tag: 'Ingestion' },
    ],
  },
  {
    id: 'catalog',
    name: 'Catalog',
    description: 'Gerenciamento de conexões, metadados de recursos e catálogo de camadas. Organize e descubra fontes de dados espaciais.',
    icon: 'database',
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-50',
    swaggerUrl: 'http://100.52.200.210:32200/catalog/swagger-ui/index.html',
    endpoints: [
      { method: 'GET', path: '/v1/connections', summary: 'Lista conexões', description: 'Retorna todas as conexões de dados configuradas.', tag: 'Connection Management' },
      { method: 'POST', path: '/v1/connections', summary: 'Cria conexão', description: 'Configura nova conexão com servidor de mapas ou base de dados espacial.', tag: 'Connection Management' },
      { method: 'GET', path: '/v1/{connection_id}/search', summary: 'Busca camadas', description: 'Pesquisa camadas disponíveis em uma conexão específica.', tag: 'Resource Layer' },
      { method: 'GET', path: '/v1/{connection_id}/capabilities', summary: 'Capabilities da conexão', description: 'Retorna as capacidades e camadas disponíveis da conexão.', tag: 'Resource Layer' },
      { method: 'GET', path: '/v1/{connection_id}/{id}', summary: 'Detalhes do recurso', description: 'Retorna metadados detalhados de um recurso específico.', tag: 'Resource Metadata' },
      { method: 'GET', path: '/resource-metadata/', summary: 'Metadados de recursos', description: 'Acessa metadados globais de recursos do catálogo.', tag: 'Resource Metadata' },
      { method: 'GET', path: '/resource-layer/', summary: 'Camadas de recursos', description: 'Lista camadas disponíveis nos recursos catalogados.', tag: 'Resource Layer' },
    ],
  },
  {
    id: 'context',
    name: 'Context',
    description: 'CRUD de contextos de aplicação: WebMaps, Formulários, Dashboards, Relatórios e Story Maps. Gerencie configurações de visualização.',
    icon: 'layout',
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    swaggerUrl: 'http://100.52.200.210:32200/context/swagger-ui/index.html',
    endpoints: [
      { method: 'GET', path: '/api/v1/contents/{type}', summary: 'Lista contextos por tipo', description: 'Retorna contextos filtrados por tipo: WEBMAP, FORM, DASHBOARD, REPORT ou STORY_MAP.', tag: 'Context' },
      { method: 'POST', path: '/api/v1/contents/{type}', summary: 'Cria contexto', description: 'Cria novo contexto com título, descrição, cor e configuração JSON.', tag: 'Context' },
      { method: 'GET', path: '/api/v1/contents/{type}/{ctxId}', summary: 'Obtém contexto por ID', description: 'Retorna um contexto específico com todas suas propriedades.', tag: 'Context' },
      { method: 'PUT', path: '/api/v1/contents/{type}/{ctxId}', summary: 'Atualiza contexto', description: 'Edita título, descrição, cor ou configuração de um contexto existente.', tag: 'Context' },
      { method: 'DELETE', path: '/api/v1/contents/{ctxId}', summary: 'Remove contexto', description: 'Deleta permanentemente um contexto pelo seu ID.', tag: 'Context' },
    ],
  },
  {
    id: 'ogc',
    name: 'OGC Services',
    description: 'Serviços padronizados OGC (WFS/WMS). Interoperabilidade com GeoServer, MapServer e qualquer cliente compatível.',
    icon: 'globe',
    color: 'text-amber-600',
    bgColor: 'bg-amber-50',
    swaggerUrl: 'http://100.52.200.210:32200/ogc/swagger-ui/index.html',
    endpoints: [
      { method: 'GET', path: '/v1/{connection_id}/wfs', summary: 'WFS GetFeature', description: 'Consulta feições via protocolo OGC WFS 1.1.0/2.0.0 com suporte a filtros CQL, bbox e paginação.', tag: 'WFS' },
      { method: 'POST', path: '/v1/{connection_id}/wfs', summary: 'WFS via POST', description: 'Consulta WFS com parâmetros no corpo da requisição para queries complexas.', tag: 'WFS' },
      { method: 'GET', path: '/v1/{connection_id}/wms', summary: 'WMS GetMap', description: 'Renderiza mapas via protocolo OGC WMS com suporte a estilos SLD e camadas múltiplas.', tag: 'WMS' },
    ],
  },
]

export interface StoryComponent {
  name: string
  category: string
  description: string
  icon: string
}

export const storyComponents: StoryComponent[] = [
  { name: 'Map', category: 'Geospatial', description: 'Componente de mapa interativo com suporte a WMS, WFS e tiles. Base para toda visualização espacial.', icon: 'map' },
  { name: 'FeatureInfo', category: 'Geospatial', description: 'Exibe informações detalhadas de feições ao clicar no mapa. Suporta WMS e WFS.', icon: 'info' },
  { name: 'FeatureTableAttributes', category: 'Geospatial', description: 'Tabela de atributos das feições com ordenação, filtros e seleção interativa.', icon: 'table' },
  { name: 'LayerCatalog', category: 'Layer', description: 'Catálogo de camadas com busca, preview e adição ao mapa. Conecta ao serviço Catalog.', icon: 'layers' },
  { name: 'LayerManager', category: 'Layer', description: 'Gerenciador de camadas ativas com controle de visibilidade, opacidade e ordenação.', icon: 'sliders' },
  { name: 'BaseLayerSelector', category: 'Layer', description: 'Seletor de mapa base (OSM, satélite, topográfico) com preview thumbnail.', icon: 'image' },
  { name: 'FileUpload', category: 'Layer', description: 'Upload de arquivos geoespaciais (GeoJSON, KML, Shapefile) direto para o mapa.', icon: 'upload' },
  { name: 'WebMap Context', category: 'Context', description: 'Gerenciador de contexto WebMap com persistência de estado, camadas e visualização.', icon: 'layout' },
  { name: 'GraphVisualization', category: 'Dashboard', description: 'Componente de visualização de grafos e redes com interatividade.', icon: 'git-branch' },
  { name: 'EditableRichTextBlock', category: 'Dashboard', description: 'Bloco de texto rico editável para dashboards e relatórios personalizados.', icon: 'type' },
  { name: 'PageGenerator', category: 'Dashboard', description: 'Gerador de páginas dinâmicas para dashboards com layout drag-and-drop.', icon: 'layout-grid' },
  { name: 'ToastMessage', category: 'UI', description: 'Notificações toast com suporte a sucesso, erro, aviso e informação.', icon: 'bell' },
]

export const contextTypes = [
  { type: 'WEBMAP', label: 'WebMap', description: 'Mapa interativo com camadas, filtros e ferramentas de análise espacial.', icon: 'map', color: 'blue' },
  { type: 'DASHBOARD', label: 'Dashboard', description: 'Painel de indicadores com gráficos, tabelas e mapas integrados.', icon: 'bar-chart-3', color: 'emerald' },
  { type: 'FORM', label: 'Formulário', description: 'Formulário de coleta de dados com geolocalização e validação.', icon: 'clipboard-list', color: 'purple' },
  { type: 'REPORT', label: 'Relatório', description: 'Relatório temático com mapas, gráficos e textos formatados.', icon: 'file-text', color: 'amber' },
  { type: 'STORY_MAP', label: 'Story Map', description: 'Narrativa espacial com mapas, imagens e textos em sequência.', icon: 'book-open', color: 'rose' },
]
