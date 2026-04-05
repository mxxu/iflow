import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'iFlow — 科技信息流',
  description: '聚合全球科技资讯，智能排序，每天更新',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  )
}
