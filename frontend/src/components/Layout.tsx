import { useState, useEffect, type ReactNode } from 'react'
import Sidebar from './Sidebar'
import TopBar from './TopBar'
import Toast, { ToastProvider, useToast } from './Toast'

function LayoutInner({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const { toasts, removeToast } = useToast()

  useEffect(() => {
    const check = () => {
      const mobile = window.innerWidth < 768
      setIsMobile(mobile)
      if (mobile) setCollapsed(true)
    }
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  const handleToggle = () => {
    if (isMobile) {
      setMobileOpen(!mobileOpen)
    } else {
      setCollapsed(!collapsed)
    }
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Mobile overlay */}
      {isMobile && mobileOpen && (
        <div className="fixed inset-0 bg-black/50 z-30" onClick={() => setMobileOpen(false)} />
      )}

      {/* Sidebar */}
      <div className={`${isMobile ? (mobileOpen ? 'translate-x-0' : '-translate-x-full') : ''} transition-transform duration-300 z-40`}>
        <Sidebar collapsed={isMobile ? false : collapsed} onToggle={handleToggle} />
      </div>

      {/* Main content */}
      <div className={`flex-1 flex flex-col transition-all duration-300 ${
        isMobile ? 'ml-0' : collapsed ? 'ml-[72px]' : 'ml-[260px]'
      }`}>
        <TopBar onMenuClick={isMobile ? () => setMobileOpen(true) : undefined} />
        <main className="flex-1 overflow-y-auto">
          <div className="p-4 md:p-6 max-w-[1600px] mx-auto">
            {children}
          </div>
        </main>
      </div>
      <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2">
        {toasts.map(t => (
          <Toast key={t.id} {...t} onClose={() => removeToast(t.id)} />
        ))}
      </div>
    </div>
  )
}

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <ToastProvider>
      <LayoutInner>{children}</LayoutInner>
    </ToastProvider>
  )
}
