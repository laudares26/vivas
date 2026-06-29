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

  // ── More WMS/WFS Examples ─────────────────────────────────────────
  {
    id: 'wfs-hidreletricas-brasil',
    title: 'WFS – Hidrelétricas do Brasil',
    description: 'Consulte 35 usinas hidrelétricas do Brasil via WFS do IBGE com nome, potência e status operacional.',
    service: 'wfs',
    icon: 'hexagon',
    difficulty: 'iniciante',
    code: `// WFS GetFeature – Hidrelétricas do Brasil (IBGE / CCAR)
// Servidor: https://geoservicos.ibge.gov.br/geoserver
// Camada: CCAR:BC100_Hidreletrica_P
// 35 usinas com dados de potência e operação

const params = new URLSearchParams({
  SERVICE: 'WFS',
  VERSION: '2.0.0',
  REQUEST: 'GetFeature',
  TYPENAMES: 'CCAR:BC100_Hidreletrica_P',
  OUTPUTFORMAT: 'application/json',
  COUNT: '35'
});

const response = await fetch(
  \`https://geoservicos.ibge.gov.br/geoserver/wfs?\${params}\`
);
const geojson = await response.json();

console.log(\`Hidrelétricas: \${geojson.totalFeatures}\`);
geojson.features.forEach(f => {
  const { nome, potenciaoutorgada, operacional } = f.properties;
  const [lon, lat] = f.geometry.coordinates;
  console.log(\`  \${nome} – \${potenciaoutorgada}MW (\${operacional})\`);
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
      url: 'https://geoservicos.ibge.gov.br/geoserver/wfs?SERVICE=WFS&VERSION=2.0.0&REQUEST=GetFeature&TYPENAMES=CCAR:BC100_Hidreletrica_P&OUTPUTFORMAT=application/json&COUNT=35',
    },
  },
  {
    id: 'wfs-barragens-brasil',
    title: 'WFS – Barragens do Brasil',
    description: 'Consulte barragens brasileiras via WFS do IBGE com material de construção, uso principal e situação.',
    service: 'wfs',
    icon: 'hexagon',
    difficulty: 'intermediario',
    code: `// WFS GetFeature – Barragens do Brasil (IBGE / CCAR)
// Servidor: https://geoservicos.ibge.gov.br/geoserver
// Camada: CCAR:hid_barragem_p
// 478 barragens – limitando a 50 por requisição

const params = new URLSearchParams({
  SERVICE: 'WFS',
  VERSION: '2.0.0',
  REQUEST: 'GetFeature',
  TYPENAMES: 'CCAR:hid_barragem_p',
  OUTPUTFORMAT: 'application/json',
  COUNT: '50'
});

const response = await fetch(
  \`https://geoservicos.ibge.gov.br/geoserver/wfs?\${params}\`
);
const geojson = await response.json();

console.log(\`Barragens: \${geojson.totalFeatures} total\`);
console.log(\`Retornadas: \${geojson.features.length}\`);
geojson.features.forEach(f => {
  const { nome, usoprincip, matconstr } = f.properties;
  console.log(\`  \${nome || 'Sem nome'} – Uso: \${usoprincip} | Material: \${matconstr}\`);
});

// Exemplo com Leaflet GeoJSON layer
const barragensLayer = L.geoJSON(geojson, {
  pointToLayer: (feature, latlng) =>
    L.circleMarker(latlng, { radius: 5, color: '#e74c3c' }),
  onEachFeature: (feature, layer) => {
    layer.bindPopup(\`<b>\${feature.properties.nome || 'Barragem'}</b>\`);
  }
});
barragensLayer.addTo(map);`,
    requestConfig: {
      method: 'GET',
      url: 'https://geoservicos.ibge.gov.br/geoserver/wfs?SERVICE=WFS&VERSION=2.0.0&REQUEST=GetFeature&TYPENAMES=CCAR:hid_barragem_p&OUTPUTFORMAT=application/json&COUNT=50',
    },
  },
  {
    id: 'wms-biomas-brasil',
    title: 'WMS – Biomas do Brasil',
    description: 'Mapa dos 6 biomas brasileiros (Amazônia, Cerrado, Mata Atlântica, Caatinga, Pampa, Pantanal) via WMS do IBGE.',
    service: 'wms',
    icon: 'globe',
    difficulty: 'iniciante',
    code: `// WMS GetMap – Biomas do Brasil (IBGE / CGMAT)
// Servidor: https://geoservicos.ibge.gov.br/geoserver
// Camada: CGMAT:pbqg22_62_Biomas_Biomas
// 6 biomas: Amazônia, Cerrado, Mata Atlântica, Caatinga, Pampa, Pantanal

const params = new URLSearchParams({
  SERVICE: 'WMS',
  VERSION: '1.1.1',
  REQUEST: 'GetMap',
  LAYERS: 'CGMAT:pbqg22_62_Biomas_Biomas',
  STYLES: '',
  BBOX: '-74,-34,-35,6',
  WIDTH: '800',
  HEIGHT: '600',
  SRS: 'EPSG:4326',
  FORMAT: 'image/png'
});

const wmsUrl =
  \`https://geoservicos.ibge.gov.br/geoserver/CGMAT/wms?\${params}\`;

// Exemplo com Leaflet WMS
const biomasLayer = L.tileLayer.wms(
  'https://geoservicos.ibge.gov.br/geoserver/CGMAT/wms',
  {
    layers: 'CGMAT:pbqg22_62_Biomas_Biomas',
    format: 'image/png',
    transparent: true,
    attribution: '© IBGE – Biomas do Brasil'
  }
);
biomasLayer.addTo(map);`,
    requestConfig: {
      method: 'GET',
      url: 'https://geoservicos.ibge.gov.br/geoserver/CGMAT/wms?SERVICE=WMS&VERSION=1.1.1&REQUEST=GetMap&LAYERS=CGMAT:pbqg22_62_Biomas_Biomas&STYLES=&BBOX=-74,-34,-35,6&WIDTH=800&HEIGHT=600&SRS=EPSG:4326&FORMAT=image/png',
    },
  },
  {
    id: 'wms-regioes-hidrograficas',
    title: 'WMS – Regiões Hidrográficas',
    description: 'Macro regiões hidrográficas do Brasil via WMS do IBGE. Bacias dos principais rios brasileiros.',
    service: 'wms',
    icon: 'map',
    difficulty: 'intermediario',
    code: `// WMS GetMap – Macro Regiões Hidrográficas do Brasil (IBGE / CGMAT)
// Servidor: https://geoservicos.ibge.gov.br/geoserver
// Camada: CGMAT:qg_2021_840_MacroRegHidro
// Bacias: Amazônica, Tocantins-Araguaia, São Francisco, Paraná, etc.

const params = new URLSearchParams({
  SERVICE: 'WMS',
  VERSION: '1.1.1',
  REQUEST: 'GetMap',
  LAYERS: 'CGMAT:qg_2021_840_MacroRegHidro',
  STYLES: '',
  BBOX: '-74,-34,-35,6',
  WIDTH: '800',
  HEIGHT: '600',
  SRS: 'EPSG:4326',
  FORMAT: 'image/png'
});

const wmsUrl =
  \`https://geoservicos.ibge.gov.br/geoserver/CGMAT/wms?\${params}\`;

// Integrar com OpenLayers como TileWMS
import TileLayer from 'ol/layer/Tile';
import TileWMS  from 'ol/source/TileWMS';

const hidroLayer = new TileLayer({
  source: new TileWMS({
    url: 'https://geoservicos.ibge.gov.br/geoserver/CGMAT/wms',
    params: {
      LAYERS: 'CGMAT:qg_2021_840_MacroRegHidro',
      TILED: true
    },
    serverType: 'geoserver'
  })
});

// Sobrepor com camada de estados para contexto
const estadosLayer = new TileLayer({
  source: new TileWMS({
    url: 'https://geoservicos.ibge.gov.br/geoserver/CGMAT/wms',
    params: {
      LAYERS: 'CGMAT:pbqg22_02_Estado_LimUF',
      TILED: true
    },
    serverType: 'geoserver'
  })
});`,
    requestConfig: {
      method: 'GET',
      url: 'https://geoservicos.ibge.gov.br/geoserver/CGMAT/wms?SERVICE=WMS&VERSION=1.1.1&REQUEST=GetMap&LAYERS=CGMAT:qg_2021_840_MacroRegHidro&STYLES=&BBOX=-74,-34,-35,6&WIDTH=800&HEIGHT=600&SRS=EPSG:4326&FORMAT=image/png',
    },
  },
  {
    id: 'wfs-vilas-sc',
    title: 'WFS – Vilas de Santa Catarina',
    description: 'Consulte 173 vilas e localidades do estado de Santa Catarina via WFS do IBGE em GeoJSON.',
    service: 'wfs',
    icon: 'hexagon',
    difficulty: 'intermediario',
    code: `// WFS GetFeature – Vilas de Santa Catarina (IBGE / CCAR)
// Servidor: https://geoservicos.ibge.gov.br/geoserver
// Camada: CCAR:bc25_sc_2020_Vila_P
// Mapeamento na escala 1:25.000 – SC

const params = new URLSearchParams({
  SERVICE: 'WFS',
  VERSION: '2.0.0',
  REQUEST: 'GetFeature',
  TYPENAMES: 'CCAR:bc25_sc_2020_Vila_P',
  OUTPUTFORMAT: 'application/json',
  COUNT: '100'
});

const response = await fetch(
  \`https://geoservicos.ibge.gov.br/geoserver/wfs?\${params}\`
);
const geojson = await response.json();

console.log(\`Vilas em SC: \${geojson.totalFeatures}\`);
geojson.features.forEach(f => {
  const { nome, geocodigo } = f.properties;
  const [lon, lat] = f.geometry.coordinates;
  console.log(\`  \${nome} [\${geocodigo}] (\${lon.toFixed(4)}, \${lat.toFixed(4)})\`);
});

// Integrar com Leaflet
const vilasLayer = L.geoJSON(geojson, {
  pointToLayer: (feature, latlng) =>
    L.circleMarker(latlng, {
      radius: 4,
      color: '#8e44ad',
      fillOpacity: 0.7
    }),
  onEachFeature: (feature, layer) => {
    layer.bindPopup(
      \`<b>\${feature.properties.nome}</b><br>Geocódigo: \${feature.properties.geocodigo}\`
    );
  }
});
vilasLayer.addTo(map);`,
    requestConfig: {
      method: 'GET',
      url: 'https://geoservicos.ibge.gov.br/geoserver/wfs?SERVICE=WFS&VERSION=2.0.0&REQUEST=GetFeature&TYPENAMES=CCAR:bc25_sc_2020_Vila_P&OUTPUTFORMAT=application/json&COUNT=100',
    },
  },
]
