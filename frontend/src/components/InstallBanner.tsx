import { useState, useEffect } from 'react'

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: string }>
}

export default function InstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showBanner, setShowBanner] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    const alreadyDismissed = localStorage.getItem('vivas_install_dismissed')
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches
      || (window.navigator as any).standalone === true

    if (alreadyDismissed || isStandalone) return

    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      setShowBanner(true)
    }

    window.addEventListener('beforeinstallprompt', handler)

    // On iOS/Safari, show install hint even without beforeinstallprompt
    const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent)
    const isSafari = /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent)
    if (isIOS || isSafari) {
      setTimeout(() => setShowBanner(true), 2000)
    } else {
      // Show after 3s even if prompt hasn't fired yet (user info)
      setTimeout(() => setShowBanner(true), 3000)
    }

    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const handleInstall = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt()
      const choice = await deferredPrompt.userChoice
      if (choice.outcome === 'accepted') {
        setShowBanner(false)
        localStorage.setItem('vivas_install_dismissed', '1')
      }
      setDeferredPrompt(null)
    } else {
      // iOS fallback - show instructions
      setDismissed(true)
      setShowBanner(false)
      localStorage.setItem('vivas_install_dismissed', '1')
    }
  }

  const handleDismiss = () => {
    setShowBanner(false)
    setDismissed(true)
    localStorage.setItem('vivas_install_dismissed', '1')
  }

  if (!showBanner || dismissed) return null

  const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent)

  return (
    <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center bg-black/40 animate-fadeIn">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md mx-0 sm:mx-4 p-6 shadow-2xl animate-slideUp">
        {/* Icon */}
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 rounded-2xl bg-wine/10 flex items-center justify-center">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#7B1E3C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="5" y="2" width="14" height="20" rx="2" ry="2"/>
              <line x1="12" y1="18" x2="12" y2="18.01"/>
            </svg>
          </div>
        </div>

        {/* Content */}
        <h3 className="text-xl font-bold text-center text-ink mb-2">
          Instale o app VivaS
        </h3>
        <p className="text-sm text-muted text-center mb-4 leading-relaxed">
          Acesse sua saúde direto da tela inicial do seu celular ou computador. Sem precisar abrir o navegador.
        </p>

        {/* Features */}
        <div className="flex flex-col gap-2 mb-5">
          <div className="flex items-center gap-3 text-sm text-ink">
            <span className="w-7 h-7 rounded-full bg-green-50 flex items-center justify-center flex-shrink-0">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="3"><path d="M5 13l4 4L19 7"/></svg>
            </span>
            Acesso rápido pela tela inicial
          </div>
          <div className="flex items-center gap-3 text-sm text-ink">
            <span className="w-7 h-7 rounded-full bg-green-50 flex items-center justify-center flex-shrink-0">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="3"><path d="M5 13l4 4L19 7"/></svg>
            </span>
            Notificações de alertas de saúde
          </div>
          <div className="flex items-center gap-3 text-sm text-ink">
            <span className="w-7 h-7 rounded-full bg-green-50 flex items-center justify-center flex-shrink-0">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="3"><path d="M5 13l4 4L19 7"/></svg>
            </span>
            Funciona em qualquer dispositivo
          </div>
        </div>

        {/* iOS instructions */}
        {isIOS && !deferredPrompt && (
          <div className="bg-bg rounded-xl p-3 mb-4 text-xs text-muted text-center leading-relaxed">
            Toque em <strong>Compartilhar</strong> (ícone ↑) e depois em <strong>Adicionar à Tela de Início</strong>
          </div>
        )}

        {/* Buttons */}
        <button
          onClick={handleInstall}
          className="w-full py-3.5 bg-gradient-to-r from-wine to-wine-deep text-white font-bold rounded-xl text-sm hover:shadow-lg transition-all"
        >
          {deferredPrompt ? 'Instalar agora' : isIOS ? 'Entendi!' : 'Instalar agora'}
        </button>
        <button
          onClick={handleDismiss}
          className="w-full py-2.5 text-muted text-sm font-medium mt-2 hover:text-wine transition-colors"
        >
          Agora não
        </button>
      </div>
    </div>
  )
}
