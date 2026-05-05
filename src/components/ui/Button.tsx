import React from 'react'
import { Loader2 } from 'lucide-react'
import { useTheme } from '../../context/ThemeContext'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'ghost' | 'blue' | 'outline'
  isLoading?: boolean
  children: React.ReactNode
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  isLoading = false,
  children,
  className = '',
  disabled,
  ...props
}) => {
  const { isIceBlue } = useTheme()
  
  const baseStyles =
    'inline-flex items-center justify-center rounded-lg px-5 py-3 text-sm font-medium transition-all duration-200 focus:outline-none focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed'

  const iceBlueVariants = {
    primary: 'bg-iceBlue-600 text-white hover:bg-iceBlue-700 active:scale-[0.98]',
    ghost: 'bg-transparent text-iceBlue-600 hover:bg-iceBlue-50',
    blue: 'bg-gradient-to-r from-iceBlue-500 to-iceBlue-600 text-white hover:from-iceBlue-600 hover:to-iceBlue-700 shadow-ice-blue active:scale-[0.98]',
    outline: 'border-2 border-iceBlue-500 text-iceBlue-600 hover:bg-iceBlue-50 active:scale-[0.98]',
  }

  const darkVariants = {
    primary: 'bg-coal-700 text-silver-100 border border-coal-500 hover:bg-coal-600 hover:border-silver-600 hover:shadow-glow-ice active:scale-[0.98]',
    ghost: 'bg-transparent text-silver-400 hover:text-silver-200 hover:bg-white/5',
    blue: 'bg-gradient-to-r from-blueMor-500 to-blueMor-600 text-white hover:from-blueMor-600 hover:to-blueMor-700 shadow-glow-blue active:scale-[0.98]',
    outline: 'border-2 border-blueMor-500 text-blueMor-400 hover:bg-blueMor-500/10 active:scale-[0.98]',
  }

  const variants = isIceBlue ? iceBlueVariants : darkVariants
  const currentVariant = variant === 'blue' || variant === 'outline' ? variant : 'primary'

  return (
    <button
      className={`${baseStyles} ${variants[currentVariant]} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin text-ice-400" />
      ) : null}
      {children}
    </button>
  )
}
