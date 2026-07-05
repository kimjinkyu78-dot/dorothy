const SECTIONS = [
  { id: 'prices', label: '시세 비교' },
  { id: 'estimated-liq', label: '추정 청산맵' },
  { id: 'dca', label: '물타기 계산' },
] as const

export function SectionNav() {
  return (
    <nav className="sticky top-0 z-40 -mx-4 mb-4 border-b border-slate-800 bg-slate-950/95 px-4 py-2 backdrop-blur-md sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
      <div className="flex gap-1 overflow-x-auto">
        {SECTIONS.map((section) => (
          <a
            key={section.id}
            href={`#${section.id}`}
            className="shrink-0 rounded-lg px-3 py-2 text-sm text-slate-300 transition hover:bg-slate-800 hover:text-white"
          >
            {section.label}
          </a>
        ))}
      </div>
    </nav>
  )
}
