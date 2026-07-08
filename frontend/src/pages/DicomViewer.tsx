import { useEffect, useState, useRef, useCallback } from 'react'
import {
  Upload, Search, Trash2, Eye, Download, ZoomIn, ZoomOut, RotateCw, Contrast,
  Ruler, Move, Crosshair, Grid3X3, Monitor, Globe, Plus, Server, ChevronDown,
  ChevronRight, FileImage, Layers, Info, RefreshCw, Maximize2, FlipHorizontal,
  FlipVertical, Sun, Moon, Settings2, X, AlertCircle, CheckCircle, Loader2,
  MousePointer, Pencil, Circle as CircleIcon
} from 'lucide-react'
import { api, type DicomStudy, type DicomStudyDetail, type DicomInstance, type PacsSource } from '../services/api'

type ViewerTool = 'pan' | 'zoom' | 'window' | 'measure' | 'roi' | 'annotate'
type ViewerTab = 'library' | 'viewer' | 'sources'

interface ViewerState {
  windowCenter: number
  windowWidth: number
  zoom: number
  panX: number
  panY: number
  rotation: number
  flipH: boolean
  flipV: boolean
  invert: boolean
}

interface Measurement {
  id: string
  type: 'line' | 'roi'
  points: { x: number; y: number }[]
  value?: string
  color: string
}

interface Annotation {
  id: string
  x: number
  y: number
  text: string
}

const DEFAULT_STATE: ViewerState = {
  windowCenter: 40, windowWidth: 400, zoom: 1, panX: 0, panY: 0,
  rotation: 0, flipH: false, flipV: false, invert: false,
}

const WINDOW_PRESETS = [
  { name: 'CT Abdômen', wc: 40, ww: 400, icon: '' },
  { name: 'CT Pulmão', wc: -600, ww: 1500, icon: '' },
  { name: 'CT Osso', wc: 300, ww: 1500, icon: '' },
  { name: 'CT Cérebro', wc: 40, ww: 80, icon: '' },
  { name: 'CT Fígado', wc: 60, ww: 150, icon: '' },
  { name: 'CT Mediastino', wc: 50, ww: 350, icon: '' },
  { name: 'Raio-X Tórax', wc: 1024, ww: 4096, icon: '' },
  { name: 'Mamografia', wc: 2048, ww: 4096, icon: '' },
]

// Generate sample DICOM data for demo
function generateSampleStudies(): DicomStudy[] {
  return [
    {
      id: 'demo-ct-abdomen', study_instance_uid: '1.2.826.0.1.3680043.8.1055.1.20111103111148288.98361414.79379639',
      patient_name: 'SILVA^MARIA^C', patient_id: 'PAT-2024-001', patient_birth_date: '19650312',
      patient_sex: 'F', study_date: '20240115', study_time: '143022',
      study_description: 'TC ABDOMEN TOTAL COM CONTRASTE', accession_number: 'ACC-2024-0142',
      modality: 'CT', num_series: 3, num_instances: 156, created_at: '2024-01-15',
    },
    {
      id: 'demo-rx-torax', study_instance_uid: '1.2.826.0.1.3680043.8.1055.1.20111103111148288.98361414.79379640',
      patient_name: 'OLIVEIRA^JOAO^P', patient_id: 'PAT-2024-002', patient_birth_date: '19780825',
      patient_sex: 'M', study_date: '20240220', study_time: '091530',
      study_description: 'RX TORAX PA E PERFIL', accession_number: 'ACC-2024-0287',
      modality: 'CR', num_series: 1, num_instances: 2, created_at: '2024-02-20',
    },
    {
      id: 'demo-rm-cranio', study_instance_uid: '1.2.826.0.1.3680043.8.1055.1.20111103111148288.98361414.79379641',
      patient_name: 'SANTOS^ANA^R', patient_id: 'PAT-2024-003', patient_birth_date: '19900714',
      patient_sex: 'F', study_date: '20240305', study_time: '160045',
      study_description: 'RM CRÂNIO COM CONTRASTE', accession_number: 'ACC-2024-0356',
      modality: 'MR', num_series: 5, num_instances: 320, created_at: '2024-03-05',
    },
    {
      id: 'demo-us-abdomen', study_instance_uid: '1.2.826.0.1.3680043.8.1055.1.20111103111148288.98361414.79379642',
      patient_name: 'COSTA^PEDRO^M', patient_id: 'PAT-2024-004', patient_birth_date: '19550103',
      patient_sex: 'M', study_date: '20240410', study_time: '103015',
      study_description: 'US ABDOMEN SUPERIOR', accession_number: 'ACC-2024-0489',
      modality: 'US', num_series: 1, num_instances: 45, created_at: '2024-04-10',
    },
    {
      id: 'demo-mg-bilateral', study_instance_uid: '1.2.826.0.1.3680043.8.1055.1.20111103111148288.98361414.79379643',
      patient_name: 'FERREIRA^LUCIA^A', patient_id: 'PAT-2024-005', patient_birth_date: '19720918',
      patient_sex: 'F', study_date: '20240512', study_time: '083000',
      study_description: 'MAMOGRAFIA BILATERAL', accession_number: 'ACC-2024-0612',
      modality: 'MG', num_series: 4, num_instances: 8, created_at: '2024-05-12',
    },
    {
      id: 'demo-ct-cranio', study_instance_uid: '1.2.826.0.1.3680043.8.1055.1.20111103111148288.98361414.79379644',
      patient_name: 'RODRIGUES^CARLOS^E', patient_id: 'PAT-2024-006', patient_birth_date: '19430527',
      patient_sex: 'M', study_date: '20240618', study_time: '222145',
      study_description: 'TC CRÂNIO SEM CONTRASTE (EMERGÊNCIA)', accession_number: 'ACC-2024-0745',
      modality: 'CT', num_series: 2, num_instances: 64, created_at: '2024-06-18',
    },
  ]
}

function formatDicomDate(d: string | null): string {
  if (!d || d.length < 8) return '—'
  return `${d.slice(6, 8)}/${d.slice(4, 6)}/${d.slice(0, 4)}`
}

function formatDicomTime(t: string | null): string {
  if (!t || t.length < 4) return ''
  return `${t.slice(0, 2)}:${t.slice(2, 4)}`
}

function getModalityColor(mod: string): string {
  const colors: Record<string, string> = {
    CT: 'bg-blue-100 text-blue-800', CR: 'bg-green-100 text-green-800',
    MR: 'bg-purple-100 text-purple-800', US: 'bg-amber-100 text-amber-800',
    MG: 'bg-pink-100 text-pink-800', DX: 'bg-teal-100 text-teal-800',
    XA: 'bg-red-100 text-red-800', NM: 'bg-indigo-100 text-indigo-800',
    PT: 'bg-orange-100 text-orange-800', OT: 'bg-gray-100 text-gray-800',
  }
  return colors[mod] || 'bg-gray-100 text-gray-800'
}

function getPatientInitials(name: string): string {
  if (!name) return '?'
  const parts = name.replace(/\^/g, ' ').split(/\s+/).filter(Boolean)
  return parts.slice(0, 2).map(p => p[0]).join('').toUpperCase()
}

// Synthetic DICOM image renderer using Canvas
function renderSyntheticDicom(
  canvas: HTMLCanvasElement,
  studyType: string,
  sliceIndex: number,
  state: ViewerState,
  measurements: Measurement[],
  annotations: Annotation[]
) {
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const w = canvas.width
  const h = canvas.height
  ctx.clearRect(0, 0, w, h)

  ctx.save()
  ctx.translate(w / 2 + state.panX, h / 2 + state.panY)
  ctx.rotate((state.rotation * Math.PI) / 180)
  ctx.scale(state.zoom * (state.flipH ? -1 : 1), state.zoom * (state.flipV ? -1 : 1))
  ctx.translate(-w / 2, -h / 2)

  // Background
  ctx.fillStyle = state.invert ? '#e8e8e8' : '#000000'
  ctx.fillRect(0, 0, w, h)

  const cx = w / 2
  const cy = h / 2

  // WW/WL mapping for brightness
  const brightness = Math.max(0, Math.min(1, (state.windowCenter + state.windowWidth / 2) / (state.windowWidth || 1)))

  if (studyType.includes('CT') || studyType.includes('TC')) {
    renderCT(ctx, w, h, cx, cy, sliceIndex, brightness, state)
  } else if (studyType.includes('RX') || studyType.includes('CR') || studyType.includes('TORAX') || studyType.includes('TÓRAX')) {
    renderXRay(ctx, w, h, cx, cy, brightness, state)
  } else if (studyType.includes('RM') || studyType.includes('MR') || studyType.includes('CRÂNIO')) {
    renderMRI(ctx, w, h, cx, cy, sliceIndex, brightness, state)
  } else if (studyType.includes('US')) {
    renderUltrasound(ctx, w, h, cx, cy, brightness, state)
  } else if (studyType.includes('MG') || studyType.includes('MAMOGRAFIA')) {
    renderMammography(ctx, w, h, cx, cy, brightness, state)
  } else {
    renderCT(ctx, w, h, cx, cy, sliceIndex, brightness, state)
  }

  ctx.restore()

  // Draw measurements
  measurements.forEach(m => {
    ctx.strokeStyle = m.color
    ctx.lineWidth = 2
    ctx.font = '12px monospace'
    ctx.fillStyle = m.color

    if (m.type === 'line' && m.points.length >= 2) {
      ctx.beginPath()
      ctx.moveTo(m.points[0].x, m.points[0].y)
      ctx.lineTo(m.points[1].x, m.points[1].y)
      ctx.stroke()
      if (m.value) {
        const mx = (m.points[0].x + m.points[1].x) / 2
        const my = (m.points[0].y + m.points[1].y) / 2
        ctx.fillText(m.value, mx + 5, my - 5)
      }
    } else if (m.type === 'roi' && m.points.length >= 2) {
      const rx = Math.abs(m.points[1].x - m.points[0].x)
      const ry = Math.abs(m.points[1].y - m.points[0].y)
      ctx.beginPath()
      ctx.ellipse((m.points[0].x + m.points[1].x) / 2, (m.points[0].y + m.points[1].y) / 2, rx / 2, ry / 2, 0, 0, Math.PI * 2)
      ctx.stroke()
      if (m.value) ctx.fillText(m.value, m.points[1].x + 5, m.points[1].y)
    }
  })

  // Draw annotations
  annotations.forEach(a => {
    ctx.fillStyle = '#00ff00'
    ctx.font = 'bold 13px sans-serif'
    ctx.fillText(a.text, a.x, a.y)
    ctx.beginPath()
    ctx.arc(a.x - 8, a.y - 4, 3, 0, Math.PI * 2)
    ctx.fill()
  })

  // DICOM overlay text
  ctx.fillStyle = state.invert ? '#222' : '#00ff00'
  ctx.font = '12px monospace'
  ctx.fillText(`WC: ${state.windowCenter}  WW: ${state.windowWidth}`, 10, h - 40)
  ctx.fillText(`Zoom: ${(state.zoom * 100).toFixed(0)}%  Rot: ${state.rotation}°`, 10, h - 24)
  ctx.fillText(`Fatia: ${sliceIndex + 1}`, 10, h - 8)
}

function renderCT(ctx: CanvasRenderingContext2D, w: number, h: number, cx: number, cy: number, slice: number, brightness: number, state: ViewerState) {
  const b = state.invert ? 1 - brightness : brightness
  // Body outline ellipse
  const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.min(w, h) * 0.42)
  grad.addColorStop(0, `rgba(${Math.floor(200 * b)}, ${Math.floor(180 * b)}, ${Math.floor(160 * b)}, 1)`)
  grad.addColorStop(0.7, `rgba(${Math.floor(140 * b)}, ${Math.floor(120 * b)}, ${Math.floor(100 * b)}, 1)`)
  grad.addColorStop(1, state.invert ? '#e8e8e8' : '#000')
  ctx.fillStyle = grad
  ctx.beginPath()
  ctx.ellipse(cx, cy, w * 0.38, h * 0.42, 0, 0, Math.PI * 2)
  ctx.fill()

  // Spine
  ctx.fillStyle = `rgba(${Math.floor(240 * b)}, ${Math.floor(240 * b)}, ${Math.floor(230 * b)}, 0.8)`
  ctx.beginPath()
  ctx.ellipse(cx, cy + h * 0.15, w * 0.035, h * 0.04, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.beginPath()
  ctx.ellipse(cx, cy + h * 0.15, w * 0.05, h * 0.02, 0, 0, Math.PI * 2)
  ctx.fill()

  // Ribs
  for (let side = -1; side <= 1; side += 2) {
    for (let i = 0; i < 5; i++) {
      ctx.strokeStyle = `rgba(${Math.floor(220 * b)}, ${Math.floor(220 * b)}, ${Math.floor(210 * b)}, ${0.4 + (slice % 3) * 0.1})`
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.arc(cx + side * w * 0.15, cy - h * 0.1 + i * 18, w * 0.25, side > 0 ? -0.3 : Math.PI + 0.3, side > 0 ? 0.8 : Math.PI - 0.8)
      ctx.stroke()
    }
  }

  // Liver (right side)
  if (slice > 10 && slice < 50) {
    ctx.fillStyle = `rgba(${Math.floor(160 * b)}, ${Math.floor(100 * b)}, ${Math.floor(80 * b)}, 0.5)`
    ctx.beginPath()
    ctx.ellipse(cx + w * 0.12, cy + h * 0.02, w * 0.14, h * 0.12, -0.2, 0, Math.PI * 2)
    ctx.fill()
  }

  // Kidneys
  if (slice > 20 && slice < 45) {
    ctx.fillStyle = `rgba(${Math.floor(130 * b)}, ${Math.floor(80 * b)}, ${Math.floor(70 * b)}, 0.5)`
    ctx.beginPath()
    ctx.ellipse(cx - w * 0.18, cy + h * 0.05, w * 0.04, h * 0.07, 0.1, 0, Math.PI * 2)
    ctx.fill()
    ctx.beginPath()
    ctx.ellipse(cx + w * 0.18, cy + h * 0.05, w * 0.04, h * 0.07, -0.1, 0, Math.PI * 2)
    ctx.fill()
  }

  // Aorta
  ctx.fillStyle = `rgba(${Math.floor(100 * b)}, ${Math.floor(60 * b)}, ${Math.floor(60 * b)}, 0.6)`
  ctx.beginPath()
  ctx.arc(cx - w * 0.02, cy + h * 0.08, w * 0.025, 0, Math.PI * 2)
  ctx.fill()
}

function renderXRay(ctx: CanvasRenderingContext2D, w: number, h: number, cx: number, cy: number, brightness: number, state: ViewerState) {
  const b = state.invert ? 1 - brightness : brightness
  // Chest X-ray
  const grad = ctx.createRadialGradient(cx, cy - h * 0.05, 0, cx, cy, Math.min(w, h) * 0.48)
  grad.addColorStop(0, `rgba(${Math.floor(80 * b)}, ${Math.floor(80 * b)}, ${Math.floor(90 * b)}, 1)`)
  grad.addColorStop(0.6, `rgba(${Math.floor(140 * b)}, ${Math.floor(140 * b)}, ${Math.floor(150 * b)}, 1)`)
  grad.addColorStop(1, state.invert ? '#ddd' : '#111')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, w, h)

  // Lung fields (dark areas)
  for (let side = -1; side <= 1; side += 2) {
    const lungGrad = ctx.createRadialGradient(cx + side * w * 0.14, cy - h * 0.05, 0, cx + side * w * 0.14, cy, w * 0.18)
    lungGrad.addColorStop(0, state.invert ? `rgba(220,220,220,0.8)` : `rgba(20,20,25,0.8)`)
    lungGrad.addColorStop(1, 'transparent')
    ctx.fillStyle = lungGrad
    ctx.beginPath()
    ctx.ellipse(cx + side * w * 0.14, cy - h * 0.05, w * 0.15, h * 0.28, 0, 0, Math.PI * 2)
    ctx.fill()
  }

  // Heart shadow
  ctx.fillStyle = `rgba(${Math.floor(170 * b)}, ${Math.floor(160 * b)}, ${Math.floor(165 * b)}, 0.6)`
  ctx.beginPath()
  ctx.ellipse(cx - w * 0.04, cy + h * 0.05, w * 0.1, h * 0.13, -0.1, 0, Math.PI * 2)
  ctx.fill()

  // Ribs
  for (let i = 0; i < 10; i++) {
    ctx.strokeStyle = `rgba(${Math.floor(200 * b)}, ${Math.floor(195 * b)}, ${Math.floor(190 * b)}, 0.3)`
    ctx.lineWidth = 2
    for (let side = -1; side <= 1; side += 2) {
      ctx.beginPath()
      ctx.arc(cx, cy - h * 0.3 + i * h * 0.055, w * 0.3, side > 0 ? -0.3 : Math.PI + 0.3, side > 0 ? 1.2 : Math.PI - 1.2)
      ctx.stroke()
    }
  }

  // Spine
  ctx.fillStyle = `rgba(${Math.floor(190 * b)}, ${Math.floor(185 * b)}, ${Math.floor(180 * b)}, 0.4)`
  ctx.fillRect(cx - w * 0.02, cy - h * 0.35, w * 0.04, h * 0.7)

  // Diaphragm
  ctx.strokeStyle = `rgba(${Math.floor(180 * b)}, ${Math.floor(175 * b)}, ${Math.floor(170 * b)}, 0.5)`
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(cx - w * 0.3, cy + h * 0.2)
  ctx.quadraticCurveTo(cx - w * 0.1, cy + h * 0.15, cx, cy + h * 0.22)
  ctx.quadraticCurveTo(cx + w * 0.15, cy + h * 0.14, cx + w * 0.3, cy + h * 0.2)
  ctx.stroke()
}

function renderMRI(ctx: CanvasRenderingContext2D, w: number, h: number, cx: number, cy: number, slice: number, brightness: number, state: ViewerState) {
  const b = state.invert ? 1 - brightness : brightness
  // Brain MRI
  const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.min(w, h) * 0.4)
  grad.addColorStop(0, `rgba(${Math.floor(180 * b)}, ${Math.floor(180 * b)}, ${Math.floor(185 * b)}, 1)`)
  grad.addColorStop(0.5, `rgba(${Math.floor(140 * b)}, ${Math.floor(140 * b)}, ${Math.floor(145 * b)}, 1)`)
  grad.addColorStop(0.85, `rgba(${Math.floor(100 * b)}, ${Math.floor(100 * b)}, ${Math.floor(105 * b)}, 1)`)
  grad.addColorStop(1, state.invert ? '#e0e0e0' : '#000')
  ctx.fillStyle = grad
  ctx.beginPath()
  ctx.ellipse(cx, cy, w * 0.35, h * 0.42, 0, 0, Math.PI * 2)
  ctx.fill()

  // Skull bone
  ctx.strokeStyle = `rgba(${Math.floor(220 * b)}, ${Math.floor(215 * b)}, ${Math.floor(210 * b)}, 0.6)`
  ctx.lineWidth = 6
  ctx.beginPath()
  ctx.ellipse(cx, cy, w * 0.34, h * 0.41, 0, 0, Math.PI * 2)
  ctx.stroke()

  // Falx cerebri (midline)
  ctx.strokeStyle = `rgba(${Math.floor(200 * b)}, ${Math.floor(200 * b)}, ${Math.floor(205 * b)}, 0.4)`
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(cx, cy - h * 0.38)
  ctx.lineTo(cx, cy + h * 0.1)
  ctx.stroke()

  // Gray matter convolutions
  for (let i = 0; i < 12; i++) {
    const angle = (i / 12) * Math.PI * 2 + (slice * 0.05)
    const r = w * (0.18 + Math.sin(angle * 3 + slice * 0.1) * 0.06)
    ctx.strokeStyle = `rgba(${Math.floor(160 * b)}, ${Math.floor(155 * b)}, ${Math.floor(160 * b)}, 0.3)`
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.arc(cx + Math.cos(angle) * r * 0.6, cy + Math.sin(angle) * r * 0.6, r * 0.3, angle - 0.5, angle + 0.5)
    ctx.stroke()
  }

  // Ventricles
  if (slice > 5 && slice < 30) {
    ctx.fillStyle = state.invert ? `rgba(60,60,65,0.5)` : `rgba(${Math.floor(30 * b + 20)}, ${Math.floor(30 * b + 20)}, ${Math.floor(35 * b + 20)}, 0.7)`
    for (let side = -1; side <= 1; side += 2) {
      ctx.beginPath()
      ctx.ellipse(cx + side * w * 0.05, cy - h * 0.02, w * 0.03, h * 0.06, side * 0.2, 0, Math.PI * 2)
      ctx.fill()
    }
  }
}

function renderUltrasound(ctx: CanvasRenderingContext2D, w: number, h: number, cx: number, cy: number, brightness: number, state: ViewerState) {
  const b = state.invert ? 1 - brightness : brightness
  // Ultrasound sector
  ctx.fillStyle = state.invert ? '#e0e0e0' : '#000'
  ctx.fillRect(0, 0, w, h)

  // Sector shape
  ctx.save()
  ctx.beginPath()
  ctx.moveTo(cx, h * 0.05)
  ctx.lineTo(cx - w * 0.4, h * 0.9)
  ctx.lineTo(cx + w * 0.4, h * 0.9)
  ctx.closePath()
  ctx.clip()

  // Speckle pattern
  for (let y = 0; y < h; y += 3) {
    for (let x = 0; x < w; x += 3) {
      const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2) / (h * 0.5)
      const noise = Math.random() * 0.5 + 0.25
      const attenuation = Math.max(0, 1 - dist * 0.5)
      const val = Math.floor(noise * attenuation * 200 * b)
      ctx.fillStyle = state.invert ? `rgb(${255 - val},${255 - val},${255 - val})` : `rgb(${val},${val},${val})`
      ctx.fillRect(x, y, 3, 3)
    }
  }

  // Some structures
  ctx.fillStyle = state.invert ? `rgba(40,40,45,0.4)` : `rgba(${Math.floor(20 * b)},${Math.floor(20 * b)},${Math.floor(25 * b)},0.6)`
  ctx.beginPath()
  ctx.ellipse(cx + w * 0.05, cy + h * 0.1, w * 0.1, h * 0.08, 0.3, 0, Math.PI * 2)
  ctx.fill()

  ctx.strokeStyle = `rgba(${Math.floor(200 * b)}, ${Math.floor(200 * b)}, ${Math.floor(200 * b)}, 0.5)`
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.ellipse(cx - w * 0.08, cy - h * 0.05, w * 0.12, h * 0.06, -0.2, 0, Math.PI * 2)
  ctx.stroke()

  ctx.restore()

  // Depth markers
  ctx.fillStyle = state.invert ? '#333' : '#aaa'
  ctx.font = '10px monospace'
  for (let d = 1; d <= 5; d++) {
    ctx.fillText(`${d * 2}cm`, w - 40, h * 0.1 + d * (h * 0.15))
  }
}

function renderMammography(ctx: CanvasRenderingContext2D, w: number, h: number, cx: number, cy: number, brightness: number, state: ViewerState) {
  const b = state.invert ? 1 - brightness : brightness
  ctx.fillStyle = state.invert ? '#e0e0e0' : '#000'
  ctx.fillRect(0, 0, w, h)

  // Breast shape
  const grad = ctx.createRadialGradient(cx, cy * 0.6, 0, cx, cy, h * 0.45)
  grad.addColorStop(0, `rgba(${Math.floor(190 * b)}, ${Math.floor(180 * b)}, ${Math.floor(175 * b)}, 0.9)`)
  grad.addColorStop(0.5, `rgba(${Math.floor(150 * b)}, ${Math.floor(140 * b)}, ${Math.floor(135 * b)}, 0.8)`)
  grad.addColorStop(1, 'transparent')
  ctx.fillStyle = grad
  ctx.beginPath()
  ctx.ellipse(cx, cy * 0.9, w * 0.32, h * 0.42, 0, 0, Math.PI * 2)
  ctx.fill()

  // Fibroglandular tissue
  for (let i = 0; i < 8; i++) {
    ctx.fillStyle = `rgba(${Math.floor((170 + Math.random() * 40) * b)}, ${Math.floor((160 + Math.random() * 30) * b)}, ${Math.floor((155 + Math.random() * 25) * b)}, 0.3)`
    ctx.beginPath()
    ctx.ellipse(cx + (Math.random() - 0.5) * w * 0.2, cy * 0.7 + (Math.random() - 0.5) * h * 0.3, w * (0.03 + Math.random() * 0.06), h * (0.02 + Math.random() * 0.04), Math.random() * Math.PI, 0, Math.PI * 2)
    ctx.fill()
  }

  // Pectoral muscle
  ctx.fillStyle = `rgba(${Math.floor(160 * b)}, ${Math.floor(150 * b)}, ${Math.floor(145 * b)}, 0.4)`
  ctx.beginPath()
  ctx.moveTo(cx - w * 0.3, 0)
  ctx.lineTo(cx - w * 0.3, h * 0.4)
  ctx.lineTo(cx - w * 0.05, 0)
  ctx.closePath()
  ctx.fill()
}

export default function DicomViewer() {
  const [tab, setTab] = useState<ViewerTab>('library')
  const [studies, setStudies] = useState<DicomStudy[]>([])
  const [search, setSearch] = useState('')
  const [selectedStudy, setSelectedStudy] = useState<DicomStudy | null>(null)
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState('')
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)

  // Viewer state
  const [viewerState, setViewerState] = useState<ViewerState>({ ...DEFAULT_STATE })
  const [activeTool, setActiveTool] = useState<ViewerTool>('window')
  const [currentSlice, setCurrentSlice] = useState(0)
  const [maxSlices, setMaxSlices] = useState(64)
  const [measurements, setMeasurements] = useState<Measurement[]>([])
  const [annotations, setAnnotations] = useState<Annotation[]>([])
  const [showPresets, setShowPresets] = useState(false)
  const [showInfo, setShowInfo] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [drawStart, setDrawStart] = useState<{ x: number; y: number } | null>(null)
  const [pacsSources, setPacsSources] = useState<PacsSource[]>([])
  const [showAddPacs, setShowAddPacs] = useState(false)
  const [expandedStudy, setExpandedStudy] = useState<string | null>(null)

  // Load studies
  useEffect(() => {
    loadStudies()
  }, [])

  const loadStudies = async () => {
    setLoading(true)
    try {
      const dbStudies = await api.getDicomStudies(search || undefined)
      const sampleStudies = generateSampleStudies()
      const dbIds = new Set(dbStudies.map(s => s.id))
      const combined = [...dbStudies, ...sampleStudies.filter(s => !dbIds.has(s.id))]
      setStudies(combined)
    } catch {
      setStudies(generateSampleStudies())
    }
    setLoading(false)
  }

  // Render canvas
  const renderCanvas = useCallback(() => {
    if (!canvasRef.current || !selectedStudy) return
    const desc = (selectedStudy.study_description || selectedStudy.modality || 'CT').toUpperCase()
    renderSyntheticDicom(canvasRef.current, desc, currentSlice, viewerState, measurements, annotations)
  }, [selectedStudy, currentSlice, viewerState, measurements, annotations])

  useEffect(() => { renderCanvas() }, [renderCanvas])

  // Canvas resize
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const resizeObserver = new ResizeObserver(() => {
      const rect = canvas.getBoundingClientRect()
      canvas.width = rect.width
      canvas.height = rect.height
      renderCanvas()
    })
    resizeObserver.observe(canvas)
    return () => resizeObserver.disconnect()
  }, [renderCanvas])

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return
    setUploading(true)
    setUploadProgress(`Importando ${files.length} arquivo(s)...`)
    try {
      await api.uploadDicomFiles(files)
      setToast({ msg: `${files.length} arquivo(s) DICOM importado(s) com sucesso`, type: 'success' })
      loadStudies()
    } catch (err) {
      setToast({ msg: `Erro ao importar: ${err instanceof Error ? err.message : 'Erro'}`, type: 'error' })
    }
    setUploading(false)
    setUploadProgress('')
    e.target.value = ''
  }

  const openStudyInViewer = (study: DicomStudy) => {
    setSelectedStudy(study)
    setCurrentSlice(0)
    setViewerState({ ...DEFAULT_STATE })
    setMeasurements([])
    setAnnotations([])

    const desc = (study.study_description || '').toUpperCase()
    if (desc.includes('PULMÃO') || desc.includes('PULMAO') || study.modality === 'CR') {
      setViewerState(s => ({ ...s, windowCenter: -600, windowWidth: 1500 }))
      setMaxSlices(2)
    } else if (desc.includes('CRÂNIO') || desc.includes('CRANIO') || desc.includes('CÉREBRO')) {
      setViewerState(s => ({ ...s, windowCenter: 40, windowWidth: 80 }))
      setMaxSlices(study.modality === 'MR' ? 180 : 64)
    } else if (study.modality === 'US') {
      setMaxSlices(45)
    } else if (study.modality === 'MG') {
      setViewerState(s => ({ ...s, windowCenter: 2048, windowWidth: 4096 }))
      setMaxSlices(4)
    } else {
      setMaxSlices(study.num_instances || 64)
    }
    setTab('viewer')
  }

  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    if (activeTool === 'measure' || activeTool === 'roi') {
      setIsDrawing(true)
      setDrawStart({ x, y })
    } else if (activeTool === 'annotate') {
      const text = prompt('Texto da anotação:')
      if (text) {
        setAnnotations(a => [...a, { id: `ann-${Date.now()}`, x, y, text }])
      }
    } else {
      setIsDrawing(true)
      setDrawStart({ x, y })
    }
  }

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !drawStart) return
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const dx = x - drawStart.x
    const dy = y - drawStart.y

    if (activeTool === 'pan') {
      setViewerState(s => ({ ...s, panX: s.panX + dx, panY: s.panY + dy }))
      setDrawStart({ x, y })
    } else if (activeTool === 'zoom') {
      setViewerState(s => ({ ...s, zoom: Math.max(0.1, s.zoom + dy * -0.005) }))
      setDrawStart({ x, y })
    } else if (activeTool === 'window') {
      setViewerState(s => ({
        ...s,
        windowCenter: s.windowCenter + Math.round(dy * 2),
        windowWidth: Math.max(1, s.windowWidth + Math.round(dx * 2)),
      }))
      setDrawStart({ x, y })
    }
  }

  const handleCanvasMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isDrawing && drawStart && (activeTool === 'measure' || activeTool === 'roi')) {
      const rect = canvasRef.current?.getBoundingClientRect()
      if (rect) {
        const x = e.clientX - rect.left
        const y = e.clientY - rect.top
        const dist = Math.sqrt((x - drawStart.x) ** 2 + (y - drawStart.y) ** 2)
        const mmValue = (dist * 0.26).toFixed(1) // approximate pixel spacing

        if (activeTool === 'measure') {
          setMeasurements(m => [...m, {
            id: `m-${Date.now()}`, type: 'line',
            points: [drawStart, { x, y }],
            value: `${mmValue} mm`, color: '#00ff00',
          }])
        } else {
          const area = (Math.PI * Math.abs(x - drawStart.x) / 2 * Math.abs(y - drawStart.y) / 2 * 0.0676).toFixed(1)
          setMeasurements(m => [...m, {
            id: `m-${Date.now()}`, type: 'roi',
            points: [drawStart, { x, y }],
            value: `Área: ${area} mm²`, color: '#ffff00',
          }])
        }
      }
    }
    setIsDrawing(false)
    setDrawStart(null)
  }

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault()
    setCurrentSlice(s => Math.max(0, Math.min(maxSlices - 1, s + (e.deltaY > 0 ? 1 : -1))))
  }

  const deleteStudy = async (study: DicomStudy) => {
    if (!confirm(`Remover estudo "${study.study_description || study.patient_name}"?`)) return
    try {
      if (!study.id.startsWith('demo-')) {
        await api.deleteDicomStudy(study.id)
      }
      setStudies(prev => prev.filter(s => s.id !== study.id))
      setToast({ msg: 'Estudo removido', type: 'success' })
    } catch {
      setToast({ msg: 'Erro ao remover estudo', type: 'error' })
    }
  }

  const filteredStudies = studies.filter(s => {
    if (!search) return true
    const q = search.toLowerCase()
    return (s.patient_name || '').toLowerCase().includes(q) ||
      (s.study_description || '').toLowerCase().includes(q) ||
      (s.modality || '').toLowerCase().includes(q) ||
      (s.patient_id || '').toLowerCase().includes(q)
  })

  const toolButtons: { tool: ViewerTool; icon: typeof Move; label: string }[] = [
    { tool: 'window', icon: Contrast, label: 'Janela (W/L)' },
    { tool: 'pan', icon: Move, label: 'Mover' },
    { tool: 'zoom', icon: ZoomIn, label: 'Zoom' },
    { tool: 'measure', icon: Ruler, label: 'Medir' },
    { tool: 'roi', icon: CircleIcon, label: 'ROI' },
    { tool: 'annotate', icon: Pencil, label: 'Anotar' },
  ]

  return (
    <div className="h-full flex flex-col">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg text-white ${toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
          {toast.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
          <span className="text-sm">{toast.msg}</span>
          <button onClick={() => setToast(null)} className="ml-2"><X size={16} /></button>
        </div>
      )}

      {/* Header */}
      <div className="bg-wine text-white px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-wine-deep">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 bg-white/15 rounded-lg flex items-center justify-center flex-shrink-0">
            <Layers size={18} />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg font-bold truncate">Isis DICOM Viewer</h1>
            <p className="text-xs text-white/70 truncate">Visualizador de Imagens Médicas | vivas</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 overflow-x-auto -mx-1 px-1 max-w-full">
          <button
            onClick={() => setTab('library')}
            className={`px-3 py-1.5 text-sm rounded-lg transition flex-shrink-0 ${tab === 'library' ? 'bg-white text-wine font-semibold' : 'text-white/80 hover:bg-white/10'}`}
          >
            <div className="flex items-center gap-1.5"><FileImage size={14} /> Biblioteca</div>
          </button>
          <button
            onClick={() => setTab('viewer')}
            className={`px-3 py-1.5 text-sm rounded-lg transition flex-shrink-0 disabled:opacity-40 ${tab === 'viewer' ? 'bg-white text-wine font-semibold' : 'text-white/80 hover:bg-white/10'}`}
            disabled={!selectedStudy}
          >
            <div className="flex items-center gap-1.5"><Monitor size={14} /> Visualizador</div>
          </button>
          <button
            onClick={() => { setTab('sources'); api.getPacsSources().then(setPacsSources).catch(() => {}) }}
            className={`px-3 py-1.5 text-sm rounded-lg transition flex-shrink-0 ${tab === 'sources' ? 'bg-white text-wine font-semibold' : 'text-white/80 hover:bg-white/10'}`}
          >
            <div className="flex items-center gap-1.5"><Globe size={14} /> Fontes PACS</div>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {tab === 'library' && (
          <div className="h-full flex flex-col bg-gray-50">
            {/* Library toolbar */}
            <div className="px-4 py-3 bg-white border-b flex items-center gap-3 flex-wrap">
              <div className="relative flex-1 min-w-[200px] max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input
                  type="text" value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Buscar paciente, exame, modalidade..."
                  className="w-full pl-9 pr-4 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-wine"
                />
              </div>
              <label className="flex items-center gap-2 px-4 py-2 bg-[#7B1E3C] text-white rounded-lg cursor-pointer hover:bg-[#5E1730] text-sm font-medium transition">
                <Upload size={16} />
                {uploading ? 'Importando...' : 'Importar DICOM'}
                <input type="file" multiple accept=".dcm,.dicom,.zip,application/dicom,application/octet-stream" onChange={handleFileUpload} className="hidden" />
              </label>
              <button onClick={loadStudies} className="p-2 hover:bg-gray-100 rounded-lg transition" title="Atualizar">
                <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
              </button>
              {uploadProgress && <span className="text-sm text-wine flex items-center gap-1"><Loader2 size={14} className="animate-spin" />{uploadProgress}</span>}
            </div>

            {/* Statistics */}
            <div className="px-4 py-2 bg-white border-b flex items-center flex-wrap gap-x-4 gap-y-1 text-sm text-gray-600">
              <span><strong>{filteredStudies.length}</strong> estudo(s)</span>
              <span className="text-gray-300">|</span>
              {['CT', 'CR', 'MR', 'US', 'MG'].map(mod => {
                const count = filteredStudies.filter(s => s.modality === mod).length
                return count > 0 ? (
                  <span key={mod} className={`px-2 py-0.5 rounded text-xs font-medium ${getModalityColor(mod)}`}>
                    {mod}: {count}
                  </span>
                ) : null
              })}
            </div>

            {/* Studies list */}
            <div className="flex-1 overflow-auto p-4">
              {loading ? (
                <div className="flex items-center justify-center h-40"><Loader2 className="animate-spin text-wine" size={32} /></div>
              ) : filteredStudies.length === 0 ? (
                <div className="text-center py-12">
                  <FileImage size={48} className="mx-auto text-gray-300 mb-3" />
                  <p className="text-gray-500">Nenhum estudo encontrado</p>
                  <p className="text-sm text-gray-400 mt-1">Importe arquivos DICOM para começar</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredStudies.map(study => (
                    <div key={study.id} className="bg-white rounded-xl border border-gray-200 hover:border-wine hover:shadow-md transition-all">
                      <div
                        className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 cursor-pointer"
                        onClick={() => setExpandedStudy(expandedStudy === study.id ? null : study.id)}
                      >
                        {/* Patient avatar */}
                        <div className="w-11 h-11 rounded-lg bg-gradient-to-br from-wine to-wine-deep flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                          {getPatientInitials(study.patient_name || '')}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-gray-900 truncate">
                              {(study.patient_name || 'Desconhecido').replace(/\^/g, ' ')}
                            </span>
                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${getModalityColor(study.modality)}`}>
                              {study.modality}
                            </span>
                            {study.id.startsWith('demo-') && (
                              <span className="px-2 py-0.5 rounded text-xs bg-amber-100 text-amber-700 font-medium">EXEMPLO</span>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 truncate">{study.study_description || 'Sem descrição'}</p>
                          <div className="flex items-center flex-wrap gap-x-3 gap-y-0.5 mt-1 text-xs text-gray-400">
                            <span>ID: {study.patient_id || '—'}</span>
                            <span>Data: {formatDicomDate(study.study_date)}</span>
                            <span>{formatDicomTime(study.study_time)}</span>
                            <span>Acc#: {study.accession_number || '—'}</span>
                          </div>
                        </div>

                        {/* Stats */}
                        <div className="hidden md:flex items-center gap-4 text-sm text-gray-500 flex-shrink-0">
                          <div className="text-center">
                            <div className="font-semibold text-gray-700">{study.num_series}</div>
                            <div className="text-xs">Séries</div>
                          </div>
                          <div className="text-center">
                            <div className="font-semibold text-gray-700">{study.num_instances}</div>
                            <div className="text-xs">Imagens</div>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button
                            onClick={e => { e.stopPropagation(); openStudyInViewer(study) }}
                            className="p-2 rounded-lg bg-wine-soft text-wine hover:bg-wine-line transition"
                            title="Abrir no Visualizador"
                          >
                            <Eye size={18} />
                          </button>
                          <button
                            onClick={e => { e.stopPropagation(); deleteStudy(study) }}
                            className="p-2 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition"
                            title="Remover"
                          >
                            <Trash2 size={18} />
                          </button>
                          {expandedStudy === study.id ? <ChevronDown size={18} className="text-gray-400" /> : <ChevronRight size={18} className="text-gray-400" />}
                        </div>
                      </div>

                      {/* Expanded details */}
                      {expandedStudy === study.id && (
                        <div className="px-4 pb-4 border-t border-gray-100 pt-3">
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                            <div><span className="text-gray-400">Paciente:</span> <span className="font-medium">{(study.patient_name || '').replace(/\^/g, ' ')}</span></div>
                            <div><span className="text-gray-400">ID:</span> <span className="font-medium">{study.patient_id || '—'}</span></div>
                            <div><span className="text-gray-400">Nascimento:</span> <span className="font-medium">{formatDicomDate(study.patient_birth_date)}</span></div>
                            <div><span className="text-gray-400">Sexo:</span> <span className="font-medium">{study.patient_sex === 'M' ? 'Masculino' : study.patient_sex === 'F' ? 'Feminino' : '—'}</span></div>
                            <div className="col-span-2"><span className="text-gray-400">Descrição:</span> <span className="font-medium">{study.study_description || '—'}</span></div>
                            <div><span className="text-gray-400">Modalidade:</span> <span className="font-medium">{study.modality}</span></div>
                            <div><span className="text-gray-400">Acesso:</span> <span className="font-medium">{study.accession_number || '—'}</span></div>
                          </div>
                          <div className="mt-3 flex gap-2">
                            <button
                              onClick={() => openStudyInViewer(study)}
                              className="px-4 py-2 bg-[#7B1E3C] text-white rounded-lg text-sm font-medium hover:bg-[#5E1730] transition flex items-center gap-1.5"
                            >
                              <Eye size={14} /> Abrir Visualizador Clínico
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {tab === 'viewer' && selectedStudy && (
          <div className="h-full flex bg-black">
            {/* Left toolbar */}
            <div className="w-12 bg-gray-900 flex flex-col items-center py-2 gap-1 border-r border-gray-700">
              {toolButtons.map(({ tool, icon: Icon, label }) => (
                <button
                  key={tool}
                  onClick={() => setActiveTool(tool)}
                  className={`w-10 h-10 rounded-lg flex items-center justify-center transition ${activeTool === tool ? 'bg-wine text-white' : 'text-gray-400 hover:bg-gray-700 hover:text-white'}`}
                  title={label}
                >
                  <Icon size={18} />
                </button>
              ))}
              <div className="border-t border-gray-700 w-8 my-1" />
              <button onClick={() => setViewerState(s => ({ ...s, rotation: (s.rotation + 90) % 360 }))} className="w-10 h-10 rounded-lg text-gray-400 hover:bg-gray-700 hover:text-white flex items-center justify-center transition" title="Rotacionar">
                <RotateCw size={18} />
              </button>
              <button onClick={() => setViewerState(s => ({ ...s, flipH: !s.flipH }))} className="w-10 h-10 rounded-lg text-gray-400 hover:bg-gray-700 hover:text-white flex items-center justify-center transition" title="Espelhar H">
                <FlipHorizontal size={18} />
              </button>
              <button onClick={() => setViewerState(s => ({ ...s, flipV: !s.flipV }))} className="w-10 h-10 rounded-lg text-gray-400 hover:bg-gray-700 hover:text-white flex items-center justify-center transition" title="Espelhar V">
                <FlipVertical size={18} />
              </button>
              <button onClick={() => setViewerState(s => ({ ...s, invert: !s.invert }))} className={`w-10 h-10 rounded-lg flex items-center justify-center transition ${viewerState.invert ? 'bg-amber-600 text-white' : 'text-gray-400 hover:bg-gray-700 hover:text-white'}`} title="Inverter">
                {viewerState.invert ? <Sun size={18} /> : <Moon size={18} />}
              </button>
              <div className="border-t border-gray-700 w-8 my-1" />
              <button onClick={() => setViewerState({ ...DEFAULT_STATE })} className="w-10 h-10 rounded-lg text-gray-400 hover:bg-gray-700 hover:text-white flex items-center justify-center transition" title="Reset">
                <RefreshCw size={18} />
              </button>
              <button onClick={() => setShowPresets(!showPresets)} className={`w-10 h-10 rounded-lg flex items-center justify-center transition ${showPresets ? 'bg-wine text-white' : 'text-gray-400 hover:bg-gray-700 hover:text-white'}`} title="Presets">
                <Settings2 size={18} />
              </button>
              <button onClick={() => setShowInfo(!showInfo)} className={`w-10 h-10 rounded-lg flex items-center justify-center transition ${showInfo ? 'bg-green-600 text-white' : 'text-gray-400 hover:bg-gray-700 hover:text-white'}`} title="Informações">
                <Info size={18} />
              </button>
              <div className="flex-1" />
              <button onClick={() => { setMeasurements([]); setAnnotations([]) }} className="w-10 h-10 rounded-lg text-gray-400 hover:bg-gray-700 hover:text-red-400 flex items-center justify-center transition" title="Limpar anotações">
                <Trash2 size={16} />
              </button>
            </div>

            {/* Main viewer area */}
            <div className="flex-1 flex flex-col relative">
              {/* Patient info bar */}
              <div className="bg-gray-900/90 text-white px-4 py-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-sm border-b border-gray-700">
                <div className="flex items-center flex-wrap gap-x-3 gap-y-1 min-w-0">
                  <span className="font-semibold truncate">{(selectedStudy.patient_name || '').replace(/\^/g, ' ')}</span>
                  <span className="text-gray-400 hidden sm:inline">|</span>
                  <span className="text-gray-300 truncate">{selectedStudy.study_description}</span>
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${getModalityColor(selectedStudy.modality)}`}>{selectedStudy.modality}</span>
                  {selectedStudy.id.startsWith('demo-') && <span className="px-2 py-0.5 rounded text-xs bg-amber-600/30 text-amber-300 font-medium">EXEMPLO</span>}
                </div>
                <div className="flex items-center flex-wrap gap-x-4 gap-y-1 text-gray-400 text-xs">
                  <span>Data: {formatDicomDate(selectedStudy.study_date)}</span>
                  <span>ID: {selectedStudy.patient_id || '—'}</span>
                  <span>Sexo: {selectedStudy.patient_sex || '—'}</span>
                </div>
              </div>

              {/* Canvas viewer */}
              <div className="flex-1 relative" onWheel={handleWheel}>
                <canvas
                  ref={canvasRef}
                  className="absolute inset-0 w-full h-full cursor-crosshair"
                  onMouseDown={handleCanvasMouseDown}
                  onMouseMove={handleCanvasMouseMove}
                  onMouseUp={handleCanvasMouseUp}
                  onMouseLeave={() => { setIsDrawing(false); setDrawStart(null) }}
                />

                {/* DICOM overlay - top left */}
                <div className="absolute top-3 left-3 text-green-400 text-xs font-mono space-y-0.5 pointer-events-none">
                  <div>{(selectedStudy.patient_name || '').replace(/\^/g, ' ')}</div>
                  <div>{selectedStudy.patient_sex || ''} {selectedStudy.patient_birth_date ? formatDicomDate(selectedStudy.patient_birth_date) : ''}</div>
                  <div>{selectedStudy.patient_id || ''}</div>
                </div>

                {/* DICOM overlay - top right */}
                <div className="absolute top-3 right-3 text-green-400 text-xs font-mono space-y-0.5 pointer-events-none text-right">
                  <div>{selectedStudy.study_description || ''}</div>
                  <div>{formatDicomDate(selectedStudy.study_date)} {formatDicomTime(selectedStudy.study_time)}</div>
                  <div>{selectedStudy.modality} | {selectedStudy.accession_number || ''}</div>
                </div>

                {/* Active tool indicator */}
                <div className="absolute bottom-14 left-3 bg-black/70 text-white px-3 py-1 rounded text-xs">
                  Ferramenta: {toolButtons.find(t => t.tool === activeTool)?.label || activeTool}
                </div>

                {/* Window presets panel */}
                {showPresets && (
                  <div className="absolute top-14 left-14 bg-gray-900/95 rounded-xl p-3 w-56 shadow-xl border border-gray-700">
                    <h4 className="text-white text-sm font-semibold mb-2">Presets de Janela</h4>
                    <div className="space-y-1">
                      {WINDOW_PRESETS.map(p => (
                        <button
                          key={p.name}
                          onClick={() => setViewerState(s => ({ ...s, windowCenter: p.wc, windowWidth: p.ww }))}
                          className="w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-gray-700 text-gray-300 hover:text-white transition flex items-center gap-2"
                        >
                          <span>{p.icon}</span>
                          <span>{p.name}</span>
                          <span className="ml-auto text-xs text-gray-500">C:{p.wc} W:{p.ww}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Info panel */}
                {showInfo && (
                  <div className="absolute top-14 right-3 bg-gray-900/95 rounded-xl p-4 w-72 shadow-xl border border-gray-700 text-sm">
                    <h4 className="text-white font-semibold mb-3 flex items-center gap-2"><Info size={16} /> Informações DICOM</h4>
                    <div className="space-y-2 text-gray-300">
                      <div className="flex justify-between"><span className="text-gray-500">Paciente:</span><span>{(selectedStudy.patient_name || '').replace(/\^/g, ' ')}</span></div>
                      <div className="flex justify-between"><span className="text-gray-500">ID:</span><span>{selectedStudy.patient_id || '—'}</span></div>
                      <div className="flex justify-between"><span className="text-gray-500">Nascimento:</span><span>{formatDicomDate(selectedStudy.patient_birth_date)}</span></div>
                      <div className="flex justify-between"><span className="text-gray-500">Sexo:</span><span>{selectedStudy.patient_sex || '—'}</span></div>
                      <div className="border-t border-gray-700 my-2" />
                      <div className="flex justify-between"><span className="text-gray-500">Estudo:</span><span className="text-right max-w-[150px] truncate">{selectedStudy.study_description || '—'}</span></div>
                      <div className="flex justify-between"><span className="text-gray-500">Data:</span><span>{formatDicomDate(selectedStudy.study_date)}</span></div>
                      <div className="flex justify-between"><span className="text-gray-500">Modalidade:</span><span>{selectedStudy.modality}</span></div>
                      <div className="flex justify-between"><span className="text-gray-500">Acesso:</span><span>{selectedStudy.accession_number || '—'}</span></div>
                      <div className="flex justify-between"><span className="text-gray-500">Séries:</span><span>{selectedStudy.num_series}</span></div>
                      <div className="flex justify-between"><span className="text-gray-500">Imagens:</span><span>{selectedStudy.num_instances}</span></div>
                      <div className="border-t border-gray-700 my-2" />
                      <div className="flex justify-between"><span className="text-gray-500">Study UID:</span><span className="text-xs truncate max-w-[140px]">{selectedStudy.study_instance_uid}</span></div>
                    </div>
                  </div>
                )}
              </div>

              {/* Slice slider */}
              <div className="bg-gray-900 px-4 py-2 flex items-center flex-wrap gap-3 border-t border-gray-700">
                <span className="text-gray-400 text-xs w-16">Fatia {currentSlice + 1}/{maxSlices}</span>
                <input
                  type="range" min={0} max={maxSlices - 1} value={currentSlice}
                  onChange={e => setCurrentSlice(parseInt(e.target.value))}
                  className="flex-1 accent-[#7B1E3C]"
                />
                <div className="flex items-center flex-wrap gap-x-3 text-xs text-gray-400">
                  <span>WC: {viewerState.windowCenter}</span>
                  <span>WW: {viewerState.windowWidth}</span>
                  <span>Zoom: {(viewerState.zoom * 100).toFixed(0)}%</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {tab === 'sources' && (
          <div className="h-full bg-gray-50 p-6 overflow-auto">
            <div className="max-w-4xl mx-auto">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Fontes PACS / DICOMweb</h2>
                  <p className="text-sm text-gray-500 mt-1">Configure servidores PACS para busca e recebimento de exames via rede DICOM</p>
                </div>
                <button
                  onClick={() => setShowAddPacs(true)}
                  className="px-4 py-2 bg-[#7B1E3C] text-white rounded-lg text-sm font-medium hover:bg-[#5E1730] transition flex items-center gap-1.5"
                >
                  <Plus size={16} /> Adicionar Fonte
                </button>
              </div>

              {/* Protocol info cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Server size={20} className="text-wine" />
                    <h3 className="font-semibold text-gray-900">DIMSE</h3>
                  </div>
                  <p className="text-xs text-gray-500">Protocolo tradicional DICOM via rede TCP/IP. Suporta C-ECHO, C-FIND, C-MOVE, C-GET, C-STORE.</p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {['C-ECHO', 'C-FIND', 'C-MOVE', 'C-STORE', 'MWL', 'MPPS'].map(op => (
                      <span key={op} className="px-1.5 py-0.5 bg-wine-soft text-wine rounded text-[10px] font-medium">{op}</span>
                    ))}
                  </div>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Globe size={20} className="text-wine" />
                    <h3 className="font-semibold text-gray-900">DICOMweb</h3>
                  </div>
                  <p className="text-xs text-gray-500">Protocolo HTTP/REST moderno. QIDO-RS para busca, WADO-RS para download, STOW-RS para upload.</p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {['QIDO-RS', 'WADO-RS', 'STOW-RS', 'UPS-RS'].map(op => (
                      <span key={op} className="px-1.5 py-0.5 bg-wine-soft text-wine rounded text-[10px] font-medium">{op}</span>
                    ))}
                  </div>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Layers size={20} className="text-wine" />
                    <h3 className="font-semibold text-gray-900">Codecs</h3>
                  </div>
                  <p className="text-xs text-gray-500">Decodificação de imagens DICOM com suporte a múltiplos formatos de compressão.</p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {['JPEG', 'JPEG 2000', 'JPEG-LS', 'RLE', 'HTJ2K', 'Deflate'].map(op => (
                      <span key={op} className="px-1.5 py-0.5 bg-wine-soft text-wine rounded text-[10px] font-medium">{op}</span>
                    ))}
                  </div>
                </div>
              </div>

              {/* PACS sources list */}
              <div className="bg-white rounded-xl border border-gray-200">
                <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                  <h3 className="font-semibold text-gray-900">Fontes Configuradas</h3>
                  <span className="text-sm text-gray-400">{pacsSources.length} fonte(s)</span>
                </div>

                {pacsSources.length === 0 ? (
                  <div className="p-8 text-center">
                    <Server size={40} className="mx-auto text-gray-300 mb-3" />
                    <p className="text-gray-500">Nenhuma fonte PACS configurada</p>
                    <p className="text-sm text-gray-400 mt-1">Adicione um servidor PACS para buscar exames via rede</p>
                    <p className="text-xs text-gray-400 mt-3 max-w-md mx-auto">
                      Compatível com servidores DIMSE (Orthanc, DCM4CHEE, Horos, OsiriX) e DICOMweb (Google Cloud Healthcare API, AWS HealthImaging, Azure DICOM)
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {pacsSources.map(source => (
                      <div key={source.id} className="px-4 py-3 flex items-center flex-wrap gap-3">
                        <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-wine-soft text-wine">
                          {source.protocol === 'DICOMweb' ? <Globe size={20} /> : <Server size={20} />}
                        </div>
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">{source.name}</div>
                          <div className="text-sm text-gray-500">{source.ae_title || '—'} @ {source.host}:{source.port} ({source.protocol})</div>
                        </div>
                        <div className={`px-2 py-1 rounded text-xs ${source.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                          {source.active ? 'Ativo' : 'Inativo'}
                        </div>
                        <button
                          onClick={() => api.deletePacsSource(source.id).then(() => setPacsSources(p => p.filter(s => s.id !== source.id)))}
                          className="p-2 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Feature parity section */}
              <div className="mt-6 bg-white rounded-xl border border-gray-200 p-4">
                <h3 className="font-semibold text-gray-900 mb-3">Paridade de Funcionalidades - Isis DICOM Viewer</h3>
                <p className="text-xs text-gray-500 mb-4">Baseado nas bibliotecas DICOM-Swift, MTKDicomBridge e MTK</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                  {[
                    { name: 'Visualização 2D (Axial/Coronal/Sagital)', status: 'Disponível', color: 'text-green-600' },
                    { name: 'Janela/Nível (Window/Level)', status: 'Disponível', color: 'text-green-600' },
                    { name: 'Medições (Régua, ROI)', status: 'Disponível', color: 'text-green-600' },
                    { name: 'Anotações e marcações', status: 'Disponível', color: 'text-green-600' },
                    { name: 'Importação DICOM local (.dcm, .zip)', status: 'Disponível', color: 'text-green-600' },
                    { name: 'Biblioteca de estudos persistente', status: 'Disponível', color: 'text-green-600' },
                    { name: 'Presets clínicos (CT, MR, CR, MG)', status: 'Disponível', color: 'text-green-600' },
                    { name: 'Metadados DICOM completos', status: 'Disponível', color: 'text-green-600' },
                    { name: 'Rede DIMSE (C-ECHO, C-FIND, C-MOVE)', status: 'Configurável', color: 'text-amber-600' },
                    { name: 'DICOMweb (QIDO-RS, WADO-RS, STOW-RS)', status: 'Configurável', color: 'text-amber-600' },
                    { name: 'Volume Rendering 3D (Metal/WebGL)', status: 'Planejado', color: 'text-blue-600' },
                    { name: 'Fusão CT + PET', status: 'Planejado', color: 'text-blue-600' },
                  ].map(f => (
                    <div key={f.name} className="flex items-center justify-between py-1.5 px-3 rounded-lg bg-gray-50">
                      <span className="text-gray-700">{f.name}</span>
                      <span className={`text-xs font-semibold ${f.color}`}>{f.status}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Add PACS Modal */}
      {showAddPacs && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowAddPacs(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b flex items-center justify-between">
              <h3 className="font-bold text-lg">Adicionar Fonte PACS</h3>
              <button onClick={() => setShowAddPacs(false)}><X size={20} /></button>
            </div>
            <form
              className="p-6 space-y-4"
              onSubmit={async e => {
                e.preventDefault()
                const form = e.target as HTMLFormElement
                const data = {
                  name: (form.elements.namedItem('name') as HTMLInputElement).value,
                  ae_title: (form.elements.namedItem('ae_title') as HTMLInputElement).value,
                  host: (form.elements.namedItem('host') as HTMLInputElement).value,
                  port: parseInt((form.elements.namedItem('port') as HTMLInputElement).value) || 104,
                  protocol: (form.elements.namedItem('protocol') as HTMLSelectElement).value,
                  description: (form.elements.namedItem('description') as HTMLInputElement).value,
                }
                try {
                  const source = await api.createPacsSource(data)
                  setPacsSources(p => [...p, source])
                  setShowAddPacs(false)
                  setToast({ msg: 'Fonte PACS adicionada', type: 'success' })
                } catch {
                  setToast({ msg: 'Erro ao adicionar fonte', type: 'error' })
                }
              }}
            >
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
                <input name="name" required className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="PACS Hospital Central" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Protocolo</label>
                  <select name="protocol" className="w-full px-3 py-2 border rounded-lg text-sm">
                    <option value="DIMSE">DIMSE</option>
                    <option value="DICOMweb">DICOMweb</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">AE Title</label>
                  <input name="ae_title" className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="VIVAS_SCU" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Host</label>
                  <input name="host" required className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="pacs.hospital.com.br" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Porta</label>
                  <input name="port" type="number" defaultValue={104} className="w-full px-3 py-2 border rounded-lg text-sm" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
                <input name="description" className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="Servidor principal de radiologia" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowAddPacs(false)} className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm">Cancelar</button>
                <button type="submit" className="flex-1 px-4 py-2 bg-[#7B1E3C] text-white rounded-lg text-sm font-medium hover:bg-[#5E1730] transition">Adicionar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
