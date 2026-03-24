'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const CLOUDS = [
  { href: '/', label: 'Resumen' },
  { href: '/gcp', label: '☁ GCP' },
  { href: '/aws', label: '☁ AWS' },
  { href: '/azure', label: '☁ Azure' },
]

export function Nav() {
  const pathname = usePathname()
  return (
    <nav className="flex items-center gap-1 border-b border-white/10 px-6 py-3 bg-gray-950">
      <span className="text-white font-semibold mr-6">⚡ FinOps — Sioma</span>
      {CLOUDS.map(({ href, label }) => (
        <Link
          key={href}
          href={href}
          className={`px-3 py-1.5 rounded text-sm transition-colors ${
            pathname === href
              ? 'bg-white/10 text-white'
              : 'text-gray-400 hover:text-white hover:bg-white/5'
          }`}
        >
          {label}
        </Link>
      ))}
    </nav>
  )
}
