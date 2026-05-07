import React from 'react'
import { LoginForm } from './LoginForm'
import { Link2, Shield, Zap } from 'lucide-react'

export const LoginScreen: React.FC = () => {
  return (
    <div className="relative flex min-h-screen w-full bg-coal-900">
      {/* Sol Panel - Görsel */}
      <div className="relative hidden w-1/2 overflow-hidden md:flex">
        <div className="absolute inset-0 mesh-gradient" />
        
        {/* Glassmorphism katmanları */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="relative h-[28rem] w-[28rem]">
            {/* Dış halka */}
            <div className="absolute inset-0 rounded-full border border-white/[0.04]" />
            <div className="absolute inset-4 rounded-full border border-white/[0.03]" />
            
            {/* Cam efekt kartı */}
            <div className="glass-card absolute inset-0 m-auto flex h-64 w-64 flex-col items-center justify-center rounded-3xl">
              <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03]">
                <Link2 className="h-6 w-6 text-ice-400" />
              </div>
              <h3 className="font-display text-lg font-semibold text-silver-200">
                Yönetim Paneli
              </h3>
              <p className="mt-2 max-w-[180px] text-center text-xs leading-relaxed text-silver-600">
                Görevlerin birbiriyle bağlantılı ve koşullu ilerlemesi
              </p>
            </div>

            {/* Yüzen ikonlar */}
            <div className="absolute left-8 top-12 rounded-xl border border-white/[0.05] bg-white/[0.02] p-3 backdrop-blur-md">
              <Shield className="h-5 w-5 text-silver-500" />
            </div>
            <div className="absolute bottom-16 right-10 rounded-xl border border-white/[0.05] bg-white/[0.02] p-3 backdrop-blur-md">
              <Zap className="h-5 w-5 text-ice-500/70" />
            </div>
          </div>
        </div>

        {/* Alt metin */}
        <div className="absolute bottom-10 left-10">
          <p className="text-xs text-silver-700">
            Topluluk Yönetimi
          </p>
        </div>
      </div>

      {/* Sağ Panel - Form */}
      <div className="flex w-full flex-col items-center justify-center px-6 py-12 md:w-1/2 md:px-12 lg:px-20">
        <div className="w-full max-w-sm">
          {/* Logo / Marka */}
          <div className="mb-12 flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-coal-500 bg-coal-700">
              <Link2 className="h-4 w-4 text-ice-400" />
            </div>
            <span className="font-display text-sm font-semibold tracking-wide text-silver-300">
              CTM
            </span>
          </div>

          <LoginForm />
        </div>
      </div>
    </div>
  )
}
