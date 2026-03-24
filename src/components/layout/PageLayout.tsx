import PageHeader from './PageHeader'
import PageBody from './PageBody'

interface PageLayoutProps {
  title: string
  showBack?: boolean
  rightAction?: React.ReactNode
  subtitle?: string
  children: React.ReactNode
  noPadding?: boolean
  headerTransparent?: boolean
}

export default function PageLayout({ title, showBack, rightAction, subtitle, children, noPadding, headerTransparent }: PageLayoutProps) {
  return (
    <div className="min-h-[100dvh] bg-[#FFF9F5] flex flex-col">
      <PageHeader title={title} showBack={showBack} rightAction={rightAction} subtitle={subtitle} transparent={headerTransparent} />
      <PageBody noPadding={noPadding}>
        {children}
      </PageBody>
    </div>
  )
}

export { PageHeader, PageBody }
