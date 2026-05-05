import React, { forwardRef } from 'react'
import { useTheme } from '../../context/ThemeContext'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = '', ...props }, ref) => {
    const { isIceBlue } = useTheme()
    
    const baseClasses = `
      w-full rounded-lg border px-4 py-3 
      text-sm transition-all duration-300
      focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed
      ${className}
    `
    
    const iceBlueClasses = `
      border-iceBlue-200 bg-white text-slate-800 placeholder-slate-400
      focus:border-iceBlue-500 focus:shadow-ice-blue-focus
      ${error ? 'border-red-500 focus:border-red-500' : ''}
    `
    
    const darkClasses = `
      border-coal-600 bg-coal-800 text-silver-100 placeholder-silver-700 
      focus:border-ice-500/50 focus:bg-coal-700 focus:shadow-glow-ice-focus
      ${error ? 'border-red-500/50 focus:border-red-500 focus:shadow-none' : ''}
    `
    
    return (
      <div className="w-full">
        {label ? (
          <label className={`mb-2 block text-xs font-medium tracking-wide uppercase ${
            isIceBlue ? 'text-iceBlue-700' : 'text-silver-500'
          }`}>
            {label}
          </label>
        ) : null}
        <input
          ref={ref}
          className={`${baseClasses} ${isIceBlue ? iceBlueClasses : darkClasses}`}
          {...props}
        />
        {error ? (
          <p className="mt-1.5 text-xs text-red-400 font-medium">{error}</p>
        ) : null}
      </div>
    )
  }
)

Input.displayName = 'Input'
