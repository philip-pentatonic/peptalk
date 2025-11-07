import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'PepTalk - Evidence-Based Peptide Reference',
  description: 'Citation-first peptide research platform with evidence from PubMed and ClinicalTrials.gov',
  keywords: ['peptides', 'research', 'evidence-based', 'citations', 'clinical trials'],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <div className="min-h-screen flex flex-col">
          <header className="border-b bg-white">
            <div className="container mx-auto px-4 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <h1 className="text-2xl font-bold text-gray-900">
                    <a href="/">PepTalk</a>
                  </h1>
                  <span className="text-sm text-gray-500">Evidence-Based Reference</span>
                </div>
                <nav className="flex items-center space-x-6">
                  <a href="/peptides" className="text-gray-600 hover:text-gray-900">
                    Browse Peptides
                  </a>
                  <a href="/news" className="text-gray-600 hover:text-gray-900">
                    Latest Research
                  </a>
                  <a href="/about" className="text-gray-600 hover:text-gray-900">
                    About
                  </a>
                  <a href="/account" className="text-gray-600 hover:text-gray-900">
                    Account
                  </a>
                </nav>
              </div>
            </div>
          </header>

          <main className="flex-1">
            {children}
          </main>

          <footer className="border-t bg-gray-50 mt-auto">
            <div className="container mx-auto px-4 py-8">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">PepTalk</h3>
                  <p className="text-sm text-gray-600">
                    Citation-first peptide reference platform. Evidence from PubMed and ClinicalTrials.gov.
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">Resources</h3>
                  <ul className="space-y-2 text-sm">
                    <li>
                      <a href="/peptides" className="text-gray-600 hover:text-gray-900">
                        Browse Peptides
                      </a>
                    </li>
                    <li>
                      <a href="/about" className="text-gray-600 hover:text-gray-900">
                        About
                      </a>
                    </li>
                    <li>
                      <a href="/methodology" className="text-gray-600 hover:text-gray-900">
                        Methodology
                      </a>
                    </li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">Legal</h3>
                  <ul className="space-y-2 text-sm">
                    <li>
                      <a href="/terms" className="text-gray-600 hover:text-gray-900">
                        Terms of Service
                      </a>
                    </li>
                    <li>
                      <a href="/privacy" className="text-gray-600 hover:text-gray-900">
                        Privacy Policy
                      </a>
                    </li>
                  </ul>
                  <p className="text-xs text-gray-500 mt-4">
                    For educational purposes only. Not medical advice.
                  </p>
                </div>
              </div>
              <div className="mt-8 pt-8 border-t text-center text-sm text-gray-500">
                © {new Date().getFullYear()} PepTalk. All rights reserved.
              </div>
            </div>
          </footer>
        </div>
      </body>
    </html>
  )
}
