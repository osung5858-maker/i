interface PageBodyProps {
  children: React.ReactNode
  className?: string
  noPadding?: boolean
}

export default function PageBody({ children, className = '', noPadding = false }: PageBodyProps) {
  return (
    <div className={`flex-1 overflow-y-auto bg-[#F5F4F1] ${noPadding ? '' : 'px-5 pt-4'} pb-28 ${className}`}>
      <div className="max-w-lg mx-auto w-full space-y-3">
        {children}
      </div>
    </div>
  )
}
