import { useState, useEffect } from 'react'

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: string }>
}

function isIOSDevice() {
  return /iPhone|iPad|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
}

function isInStandaloneMode() {
  return window.matchMedia('(display-mode: standalone)').matches
    || (window.navigator as any).standalone === true
}

export default function InstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showBanner, setShowBanner] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    const alreadyDismissed = localStorage.getItem('vivas_install_dismissed')

    if (alreadyDismissed || isInStandaloneMode()) return

    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      setShowBanner(true)
    }

    window.addEventListener('beforeinstallprompt', handler)

    // Show banner after a short delay for all users
    // On Android with Chrome, beforeinstallprompt fires first
    // On iOS, we show manual instructions
    const timer = setTimeout(() => {
      setShowBanner(true)
    }, 2000)

    return () => {
      window.removeEventListener('beforeinstallprompt', handler)
      clearTimeout(timer)
    }
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
      // No native prompt (iOS) - just dismiss after showing instructions
      setShowBanner(false)
      setDismissed(true)
      localStorage.setItem('vivas_install_dismissed', '1')
    }
  }

  const handleDismiss = () => {
    setShowBanner(false)
    setDismissed(true)
    localStorage.setItem('vivas_install_dismissed', '1')
  }

  if (!showBanner || dismissed) return null

  const ios = isIOSDevice()

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
          Acesse sua saúde direto da tela inicial do seu celular ou computador. Sem precisar de loja de aplicativos.
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
        {ios && !deferredPrompt && (
          <div className="bg-bg rounded-xl p-4 mb-4 text-sm text-ink leading-relaxed">
            <p className="font-semibold mb-2">Como instalar no iPhone:</p>
            <div className="flex flex-col gap-2">
              <div className="flex items-start gap-2">
                <span className="font-bold text-wine min-w-[20px]">1.</span>
                <span>Toque no botão <strong>Compartilhar</strong> <svg className="inline-block align-middle" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7B1E3C" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg> na barra inferior do Safari</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-bold text-wine min-w-[20px]">2.</span>
                <span>Role para baixo e toque em <strong>Adicionar à Tela de Início</strong></span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-bold text-wine min-w-[20px]">3.</span>
                <span>Confirme tocando em <strong>Adicionar</strong></span>
              </div>
            </div>
          </div>
        )}

        {/* Buttons */}
        {!ios || deferredPrompt ? (
          <button
            onClick={handleInstall}
            className="w-full py-3.5 bg-gradient-to-r from-wine to-wine-deep text-white font-bold rounded-xl text-sm hover:shadow-lg transition-all"
          >
            Instalar agora
          </button>
        ) : (
          <button
            onClick={handleInstall}
            className="w-full py-3.5 bg-gradient-to-r from-wine to-wine-deep text-white font-bold rounded-xl text-sm hover:shadow-lg transition-all"
          >
            Entendi, vou instalar
          </button>
        )}
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
