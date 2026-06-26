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
  // ── WMS Examples (External GeoServers) ──────────────────────────────
  {
    id: 'wms-vegetacao-brasil',
    title: 'WMS – Vegetação do Brasil',
    description: 'Mapa contínuo de vegetação do Brasil via serviço WMS do IBGE (GeoServiços). Escala dinâmica.',
    service: 'wms',
    icon: 'globe',
    difficulty: 'iniciante',
    code: `// WMS GetMap – Base Contínua de Vegetação do Brasil (IBGE)
// Servidor: https://geoservicos.ibge.gov.br/geoserver
// Camada: BDIA:gpc_vege

const params = new URLSearchParams({
  SERVICE: 'WMS',
  VERSION: '1.1.1',
  REQUEST: 'GetMap',
  LAYERS: 'BDIA:gpc_vege',
  STYLES: '',
  BBOX: '-74,-34,-35,6',
  WIDTH: '800',
  HEIGHT: '600',
  SRS: 'EPSG:4326',
  FORMAT: 'image/png'
});

const wmsUrl =
  \`https://geoservicos.ibge.gov.br/geoserver/BDIA/wms?\${params}\`;

// Usar diretamente como src de <img>
document.getElementById('map').src = wmsUrl;

// Ou integrar com OpenLayers como TileWMS
import TileLayer from 'ol/layer/Tile';
import TileWMS  from 'ol/source/TileWMS';

const wmsLayer = new TileLayer({
  source: new TileWMS({
    url: 'https://geoservicos.ibge.gov.br/geoserver/BDIA/wms',
    params: { LAYERS: 'BDIA:gpc_vege', TILED: true },
    serverType: 'geoserver'
  })
});`,
    requestConfig: {
      method: 'GET',
      url: 'https://geoservicos.ibge.gov.br/geoserver/BDIA/wms?SERVICE=WMS&VERSION=1.1.1&REQUEST=GetMap&LAYERS=BDIA:gpc_vege&STYLES=&BBOX=-74,-34,-35,6&WIDTH=800&HEIGHT=600&SRS=EPSG:4326&FORMAT=image/png',
    },
  },
  {
    id: 'wms-estados-brasil',
    title: 'WMS – Estados do Brasil',
    description: 'Limites estaduais com nomes das UFs via WMS do IBGE. Mapa temático do PBQG 2022.',
    service: 'wms',
    icon: 'map',
    difficulty: 'iniciante',
    code: `// WMS GetMap – Estados do Brasil com Nomes (IBGE / CGMAT)
// Servidor: https://geoservicos.ibge.gov.br/geoserver
// Camada: CGMAT:pbqg22_02_Estado_NomUF

const params = new URLSearchParams({
  SERVICE: 'WMS',
  VERSION: '1.1.1',
  REQUEST: 'GetMap',
  LAYERS: 'CGMAT:pbqg22_02_Estado_NomUF',
  STYLES: '',
  BBOX: '-74,-34,-35,6',
  WIDTH: '800',
  HEIGHT: '600',
  SRS: 'EPSG:4326',
  FORMAT: 'image/png'
});

const wmsUrl =
  \`https://geoservicos.ibge.gov.br/geoserver/CGMAT/wms?\${params}\`;

// Exemplo com Leaflet
const wmsLayer = L.tileLayer.wms(
  'https://geoservicos.ibge.gov.br/geoserver/CGMAT/wms',
  {
    layers: 'CGMAT:pbqg22_02_Estado_NomUF',
    format: 'image/png',
    transparent: true,
    attribution: '© IBGE'
  }
);
wmsLayer.addTo(map);`,
    requestConfig: {
      method: 'GET',
      url: 'https://geoservicos.ibge.gov.br/geoserver/CGMAT/wms?SERVICE=WMS&VERSION=1.1.1&REQUEST=GetMap&LAYERS=CGMAT:pbqg22_02_Estado_NomUF&STYLES=&BBOX=-74,-34,-35,6&WIDTH=800&HEIGHT=600&SRS=EPSG:4326&FORMAT=image/png',
    },
  },
  {
    id: 'wms-geologia-brasil',
    title: 'WMS – Geologia do Brasil',
    description: 'Mapa geológico contínuo do Brasil via WMS do IBGE. Legenda dinâmica por escala.',
    service: 'wms',
    icon: 'hexagon',
    difficulty: 'intermediario',
    code: `// WMS GetMap – Base Contínua de Geologia do Brasil (IBGE)
// Servidor: https://geoservicos.ibge.gov.br/geoserver
// Camada: BDIA:gpc_geol

const params = new URLSearchParams({
  SERVICE: 'WMS',
  VERSION: '1.1.1',
  REQUEST: 'GetMap',
  LAYERS: 'BDIA:gpc_geol',
  STYLES: '',
  BBOX: '-74,-34,-35,6',
  WIDTH: '800',
  HEIGHT: '600',
  SRS: 'EPSG:4326',
  FORMAT: 'image/png'
});

const wmsUrl =
  \`https://geoservicos.ibge.gov.br/geoserver/BDIA/wms?\${params}\`;

// Integrar com OpenLayers como TileWMS
import TileLayer from 'ol/layer/Tile';
import TileWMS  from 'ol/source/TileWMS';

const geologiaLayer = new TileLayer({
  source: new TileWMS({
    url: 'https://geoservicos.ibge.gov.br/geoserver/BDIA/wms',
    params: { LAYERS: 'BDIA:gpc_geol', TILED: true },
    serverType: 'geoserver'
  })
});

// Adicionar GetFeatureInfo para consulta interativa
map.on('singleclick', async (evt) => {
  const viewResolution = map.getView().getResolution();
  const infoUrl = geologiaLayer.getSource().getFeatureInfoUrl(
    evt.coordinate, viewResolution, 'EPSG:3857',
    { INFO_FORMAT: 'application/json' }
  );
  if (infoUrl) {
    const res = await fetch(infoUrl);
    const info = await res.json();
    console.log('Geologia:', info);
  }
});`,
    requestConfig: {
      method: 'GET',
      url: 'https://geoservicos.ibge.gov.br/geoserver/BDIA/wms?SERVICE=WMS&VERSION=1.1.1&REQUEST=GetMap&LAYERS=BDIA:gpc_geol&STYLES=&BBOX=-74,-34,-35,6&WIDTH=800&HEIGHT=600&SRS=EPSG:4326&FORMAT=image/png',
    },
  },
  {
    id: 'wms-bem-tombado-sp',
    title: 'WMS – Bens Tombados de São Paulo',
    description: 'Patrimônio cultural tombado pelo Condephaat no Estado de SP via WMS do IDESP-SP.',
    service: 'wms',
    icon: 'map',
    difficulty: 'iniciante',
    code: `// WMS GetMap – Bens Tombados pelo Condephaat (IDESP-SP)
// Servidor: https://www.idesp.sp.gov.br/geoserver
// Camada: idesp_acervo:bem_tomb_a_2025_01_v0

const params = new URLSearchParams({
  SERVICE: 'WMS',
  VERSION: '1.1.1',
  REQUEST: 'GetMap',
  LAYERS: 'idesp_acervo:bem_tomb_a_2025_01_v0',
  STYLES: '',
  BBOX: '-53.1,-25.3,-44.2,-19.8',
  WIDTH: '800',
  HEIGHT: '600',
  SRS: 'EPSG:4326',
  FORMAT: 'image/png'
});

const wmsUrl =
  \`https://www.idesp.sp.gov.br/geoserver/wms?\${params}\`;

// Usar como TileWMS no OpenLayers
import TileLayer from 'ol/layer/Tile';
import TileWMS  from 'ol/source/TileWMS';

const bensLayer = new TileLayer({
  source: new TileWMS({
    url: 'https://www.idesp.sp.gov.br/geoserver/wms',
    params: {
      LAYERS: 'idesp_acervo:bem_tomb_a_2025_01_v0',
      TILED: true
    },
    serverType: 'geoserver'
  })
});`,
    requestConfig: {
      method: 'GET',
      url: 'https://www.idesp.sp.gov.br/geoserver/wms?SERVICE=WMS&VERSION=1.1.1&REQUEST=GetMap&LAYERS=idesp_acervo:bem_tomb_a_2025_01_v0&STYLES=&BBOX=-53.1,-25.3,-44.2,-19.8&WIDTH=800&HEIGHT=600&SRS=EPSG:4326&FORMAT=image/png',
    },
  },
  {
    id: 'wms-planos-municipais-sp',
    title: 'WMS – Planos Municipais de São Paulo',
    description: 'Mapa dos planos municipais do Estado de SP via WMS do IDESP-SP. Visualização por região.',
    service: 'wms',
    icon: 'map',
    difficulty: 'iniciante',
    code: `// WMS GetMap – Planos Municipais do Estado de São Paulo (IDESP-SP)
// Servidor: https://www.idesp.sp.gov.br/geoserver
// Camada: planos_municipais:planos_municipais_view

const params = new URLSearchParams({
  SERVICE: 'WMS',
  VERSION: '1.1.1',
  REQUEST: 'GetMap',
  LAYERS: 'planos_municipais:planos_municipais_view',
  STYLES: '',
  BBOX: '-53.1,-25.3,-44.2,-19.8',
  WIDTH: '800',
  HEIGHT: '600',
  SRS: 'EPSG:4326',
  FORMAT: 'image/png'
});

const wmsUrl =
  \`https://www.idesp.sp.gov.br/geoserver/wms?\${params}\`;

// Exemplo com Leaflet
const planosLayer = L.tileLayer.wms(
  'https://www.idesp.sp.gov.br/geoserver/wms',
  {
    layers: 'planos_municipais:planos_municipais_view',
    format: 'image/png',
    transparent: true,
    attribution: '© IDESP-SP'
  }
);
planosLayer.addTo(map);`,
    requestConfig: {
      method: 'GET',
      url: 'https://www.idesp.sp.gov.br/geoserver/wms?SERVICE=WMS&VERSION=1.1.1&REQUEST=GetMap&LAYERS=planos_municipais:planos_municipais_view&STYLES=&BBOX=-53.1,-25.3,-44.2,-19.8&WIDTH=800&HEIGHT=600&SRS=EPSG:4326&FORMAT=image/png',
    },
  },

  // ── WFS Examples (External GeoServers) ──────────────────────────────
  {
    id: 'wfs-cidades-brasil',
    title: 'WFS – Cidades do Brasil',
    description: 'Consulte 245 cidades brasileiras via WFS do IBGE em formato GeoJSON com coordenadas e atributos.',
    service: 'wfs',
    icon: 'hexagon',
    difficulty: 'iniciante',
    code: `// WFS GetFeature – Cidades do Brasil (IBGE / CCAR)
// Servidor: https://geoservicos.ibge.gov.br/geoserver
// Camada: CCAR:BC100_Cidade_P
// CRS: EPSG:4674 (SIRGAS 2000)

const params = new URLSearchParams({
  SERVICE: 'WFS',
  VERSION: '2.0.0',
  REQUEST: 'GetFeature',
  TYPENAMES: 'CCAR:BC100_Cidade_P',
  OUTPUTFORMAT: 'application/json',
  COUNT: '100'
});

const response = await fetch(
  \`https://geoservicos.ibge.gov.br/geoserver/wfs?\${params}\`
);
const geojson = await response.json();

console.log(\`Cidades: \${geojson.totalFeatures}\`);
geojson.features.forEach(f => {
  const { nome } = f.properties;
  const [lon, lat] = f.geometry.coordinates;
  console.log(\`  \${nome} (\${lon.toFixed(2)}, \${lat.toFixed(2)})\`);
});

// Integrar com OpenLayers
import VectorSource from 'ol/source/Vector';
import GeoJSON from 'ol/format/GeoJSON';

const source = new VectorSource({
  features: new GeoJSON().readFeatures(geojson, {
    dataProjection: 'EPSG:4674',
    featureProjection: 'EPSG:3857'
  })
});`,
    requestConfig: {
      method: 'GET',
      url: 'https://geoservicos.ibge.gov.br/geoserver/wfs?SERVICE=WFS&VERSION=2.0.0&REQUEST=GetFeature&TYPENAMES=CCAR:BC100_Cidade_P&OUTPUTFORMAT=application/json&COUNT=100',
    },
  },
  {
    id: 'wfs-capitais-brasil',
    title: 'WFS – Capitais Estaduais',
    description: 'Consulte as capitais estaduais e a capital federal do Brasil via WFS do IBGE em GeoJSON.',
    service: 'wfs',
    icon: 'hexagon',
    difficulty: 'iniciante',
    code: `// WFS GetFeature – Capitais do Brasil (IBGE / CCAR)
// Servidor: https://geoservicos.ibge.gov.br/geoserver
// Camada: CCAR:BC100_Capital_P

const params = new URLSearchParams({
  SERVICE: 'WFS',
  VERSION: '2.0.0',
  REQUEST: 'GetFeature',
  TYPENAMES: 'CCAR:BC100_Capital_P',
  OUTPUTFORMAT: 'application/json'
});

const response = await fetch(
  \`https://geoservicos.ibge.gov.br/geoserver/wfs?\${params}\`
);
const geojson = await response.json();

console.log(\`Capitais: \${geojson.totalFeatures}\`);
geojson.features.forEach(f => {
  const { nome, tipocapital } = f.properties;
  console.log(\`  \${nome} – \${tipocapital}\`);
});

// Filtrar por tipo de capital
const federais = geojson.features.filter(
  f => f.properties.tipocapital === 'Capital Federal'
);`,
    requestConfig: {
      method: 'GET',
      url: 'https://geoservicos.ibge.gov.br/geoserver/wfs?SERVICE=WFS&VERSION=2.0.0&REQUEST=GetFeature&TYPENAMES=CCAR:BC100_Capital_P&OUTPUTFORMAT=application/json',
    },
  },

  // ── IUBI API Examples ───────────────────────────────────────────────
  {
    id: 'list-connections',
    title: 'Listar Conexões de Dados',
    description: 'Consulte todas as conexões de servidores de mapas e bases de dados espaciais configuradas no catálogo IUBI.',
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
    description: 'Pesquise camadas disponíveis em uma conexão específica usando o serviço de catálogo IUBI.',
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
    description: 'Gere uma imagem do mapa renderizado pelo motor de mapas IUBI com todas as camadas configuradas.',
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
]
