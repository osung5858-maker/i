export default function FeedbackLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="overflow-y-auto bg-white"
      style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 9999 }}
    >
      {children}
    </div>
  )
}
