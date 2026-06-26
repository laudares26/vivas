export interface PlaygroundExample {
  id: string
  title: string
  description: string
  service: string
  icon: string
  difficulty: 'iniciante' | 'intermediario' | 'avancado'
  code: string
  requestConfig: {
    method: string
    url: string
    headers?: Record<string, string>
    body?: string
  }
}

export const examples: PlaygroundExample[] = [
  {
    id: 'list-connections',
    title: 'Listar Conexões de Dados',
    description: 'Consulte todas as conexões de servidores de mapas e bases de dados espaciais configuradas no catálogo.',
    service: 'catalog',
    icon: 'database',
    difficulty: 'iniciante',
    code: `// Listar todas as conexões configuradas
const response = await fetch('/api/catalog/v1/connections');
const connections = await response.json();

console.log('Conexões encontradas:', connections.length);
connections.forEach(conn => {
  console.log(\`  - \${conn.name} (\${conn.type})\`);
});`,
    requestConfig: {
      method: 'GET',
      url: '/api/catalog/v1/connections',
    },
  },
  {
    id: 'search-layers',
    title: 'Buscar Camadas no Catálogo',
    description: 'Pesquise camadas disponíveis em uma conexão específica usando o serviço de catálogo.',
    service: 'catalog',
    icon: 'search',
    difficulty: 'iniciante',
    code: `// Buscar camadas em uma conexão
const connectionId = 'SUA_CONNECTION_ID';
const response = await fetch(
  \`/api/catalog/v1/\${connectionId}/search?q=municipios\`
);
const layers = await response.json();

layers.forEach(layer => {
  console.log(\`Camada: \${layer.name}\`);
  console.log(\`  Tipo: \${layer.type}\`);
  console.log(\`  CRS: \${layer.crs}\`);
});`,
    requestConfig: {
      method: 'GET',
      url: '/api/catalog/v1/{connection_id}/search?q=',
    },
  },
  {
    id: 'get-features',
    title: 'Consultar Feições GeoJSON',
    description: 'Obtenha feições vetoriais de uma camada em formato GeoJSON, com filtros espaciais e CQL.',
    service: 'map-render',
    icon: 'hexagon',
    difficulty: 'intermediario',
    code: `// Consultar feições com filtro por bounding box
const connectionId = 'SUA_CONNECTION_ID';
const layer = 'municipios';
const bbox = '-49.5,-6.5,-48.0,-5.0'; // Região de Carajás

const response = await fetch(
  \`/api/map-render/v1/\${connectionId}/render/layers/\${layer}/features\` +
  \`?bbox=\${bbox}&crs=EPSG:4326&limit=50\`
);
const geojson = await response.json();

console.log(\`Feições encontradas: \${geojson.features.length}\`);
geojson.features.forEach(f => {
  console.log(\`  \${f.properties.nome}: \${f.geometry.type}\`);
});`,
    requestConfig: {
      method: 'GET',
      url: '/api/map-render/v1/{connection_id}/render/layers/{layer}/features?limit=10',
    },
  },
  {
    id: 'render-map',
    title: 'Renderizar Mapa WMS',
    description: 'Gere uma imagem do mapa renderizado pelo motor de mapas com todas as camadas configuradas.',
    service: 'map-render',
    icon: 'image',
    difficulty: 'intermediario',
    code: `// Renderizar mapa como imagem
const connectionId = 'SUA_CONNECTION_ID';
const params = new URLSearchParams({
  SERVICE: 'WMS',
  REQUEST: 'GetMap',
  LAYERS: 'municipios,hidrografia',
  BBOX: '-49.5,-6.5,-48.0,-5.0',
  WIDTH: '800',
  HEIGHT: '600',
  CRS: 'EPSG:4326',
  FORMAT: 'image/png'
});

const mapUrl = \`/api/map-render/v1/\${connectionId}/render/map?\${params}\`;
// Use como src de uma <img> ou em um canvas
document.getElementById('map-image').src = mapUrl;`,
    requestConfig: {
      method: 'GET',
      url: '/api/map-render/v1/{connection_id}/render/map',
    },
  },
  {
    id: 'wfs-query',
    title: 'Consulta OGC WFS',
    description: 'Execute uma consulta padronizada OGC WFS 2.0.0 com filtros CQL para interoperabilidade máxima.',
    service: 'ogc',
    icon: 'globe',
    difficulty: 'avancado',
    code: `// Consulta OGC WFS 2.0.0
const connectionId = 'SUA_CONNECTION_ID';
const params = new URLSearchParams({
  SERVICE: 'WFS',
  REQUEST: 'GetFeature',
  VERSION: '2.0.0',
  TYPENAMES: 'municipios',
  CQL_FILTER: "estado = 'PA'",
  MAXFEATURES: '100',
  OUTPUTFORMAT: 'application/geo+json',
  CRS: 'EPSG:4326'
});

const response = await fetch(
  \`/api/ogc/v1/\${connectionId}/wfs?\${params}\`
);
const geojson = await response.json();

// Integrar com OpenLayers ou Leaflet
const vectorSource = new ol.source.Vector({
  features: new ol.format.GeoJSON().readFeatures(geojson)
});`,
    requestConfig: {
      method: 'GET',
      url: '/api/ogc/v1/{connection_id}/wfs?SERVICE=WFS&REQUEST=GetFeature&VERSION=2.0.0&TYPENAMES=example&OUTPUTFORMAT=application/geo+json',
    },
  },
  {
    id: 'create-context',
    title: 'Criar Contexto WebMap',
    description: 'Crie um novo contexto de WebMap com configuração de camadas, estilo e extensão geográfica.',
    service: 'context',
    icon: 'plus-circle',
    difficulty: 'avancado',
    code: `// Criar um novo contexto de WebMap
const webmapContext = {
  title: 'Mapa de Uso do Solo - Carajás',
  description: 'Visualização interativa do uso e ocupação do solo na região de Carajás',
  color: '#0066CC',
  context: {
    center: [-49.0, -6.0],
    zoom: 10,
    crs: 'EPSG:4326',
    layers: [
      {
        name: 'uso_solo_2023',
        visible: true,
        opacity: 0.8,
        style: { fillColor: '#2ECC71', strokeColor: '#27AE60' }
      },
      {
        name: 'hidrografia',
        visible: true,
        opacity: 1.0,
        style: { strokeColor: '#3498DB', strokeWidth: 2 }
      }
    ],
    basemap: 'osm'
  }
};

const response = await fetch('/api/context/api/v1/contents/WEBMAP', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(webmapContext)
});
const created = await response.json();
console.log('Contexto criado:', created.id);`,
    requestConfig: {
      method: 'POST',
      url: '/api/context/api/v1/contents/WEBMAP',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Mapa de Uso do Solo - Carajás',
        description: 'Visualização interativa do uso e ocupação do solo',
        color: '#0066CC',
        context: {
          center: [-49.0, -6.0],
          zoom: 10,
          layers: []
        }
      }, null, 2),
    },
  },
  {
    id: 'spatial-statistics',
    title: 'Estatísticas Espaciais',
    description: 'Calcule estatísticas (contagem, área, média) sobre atributos de camadas com filtros espaciais.',
    service: 'map-render',
    icon: 'bar-chart',
    difficulty: 'avancado',
    code: `// Calcular estatísticas espaciais de uma camada
const connectionId = 'SUA_CONNECTION_ID';
const layer = 'areas_desmatamento';

const response = await fetch(
  \`/api/map-render/v1/\${connectionId}/data/layers/\${layer}/statistics\`,
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      attributes: ['area_ha', 'classe'],
      operations: ['count', 'sum', 'avg', 'min', 'max'],
      filter: {
        cql: "ano >= 2020 AND municipio = 'Marabá'",
        bbox: [-49.5, -6.5, -48.0, -5.0]
      }
    })
  }
);

const stats = await response.json();
console.log('Total de áreas:', stats.count);
console.log('Soma (ha):', stats.sum);
console.log('Média (ha):', stats.avg);`,
    requestConfig: {
      method: 'POST',
      url: '/api/map-render/v1/{connection_id}/data/layers/{layer}/statistics',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        attributes: ['area_ha'],
        operations: ['count', 'sum', 'avg']
      }, null, 2),
    },
  },
]
