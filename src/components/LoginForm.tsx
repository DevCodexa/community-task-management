import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Mail, Lock, ArrowRight } from 'lucide-react'
import { Input } from './ui/Input'
import { Button } from './ui/Button'
import { supabase } from '../lib/supabase'

export const LoginForm: React.FC = () => {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        setError(error.message)
      } else {
        // Başarılı giriş - Dashboard'a yönlendirme
        navigate('/dashboard')
      }
    } catch (err) {
      setError('Beklenmeyen bir hata oluştu. Lütfen tekrar deneyin.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="w-full max-w-sm">
      <div className="mb-10">
        <h1 className="font-display text-3xl font-bold tracking-tight text-silver-100">
          Giriş Yap
        </h1>
        <p className="mt-2 text-sm text-silver-600">
          Hesabınıza erişmek için bilgilerinizi girin
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="relative">
          <Mail className="absolute left-3.5 top-[2.6rem] h-4 w-4 text-silver-600 pointer-events-none" />
          <Input
            label="E-posta"
            type="email"
            placeholder="ornek@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="pl-10"
          />
        </div>

        <div className="relative">
          <Lock className="absolute left-3.5 top-[2.6rem] h-4 w-4 text-silver-600 pointer-events-none" />
          <Input
            label="Şifre"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="pl-10"
          />
        </div>

        {error ? (
          <div className="rounded-md border border-red-500/20 bg-red-500/10 px-4 py-3">
            <p className="text-xs text-red-400">{error}</p>
          </div>
        ) : null}

        <div className="flex items-center justify-between">
          <a
            href="#"
            className="text-xs text-silver-500 hover:text-ice-400 transition-colors duration-200"
          >
            Şifremi Unuttum
          </a>
        </div>

        <Button type="submit" isLoading={isLoading} className="w-full group">
          <span>Giriş Yap</span>
          <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </Button>

        <div className="pt-4 text-center">
          <p className="text-xs text-silver-600">
            Hesabınız yok mu?{' '}
            <a
              href="#"
              className="font-medium text-silver-300 hover:text-ice-400 transition-colors duration-200"
            >
              Hesap Oluştur
            </a>
          </p>
        </div>
      </form>
    </div>
  )
}
