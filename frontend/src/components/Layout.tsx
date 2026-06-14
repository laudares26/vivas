import { useState, type ReactNode } from 'react'
import Sidebar from './Sidebar'
import TopBar from './TopBar'
import Toast, { ToastProvider, useToast } from './Toast'

function LayoutInner({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false)
  const { toasts, removeToast } = useToast()

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />
      <div className={`flex-1 flex flex-col transition-all duration-300 ${collapsed ? 'ml-[72px]' : 'ml-[260px]'}`}>
        <TopBar />
        <main className="flex-1 overflow-y-auto">
          <div className="p-6 max-w-[1600px] mx-auto">
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
