import Link from 'next/link'

export default function HomePage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col items-center justify-center min-h-[80vh] text-center">
        <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-6xl">
          Scam Checker
        </h1>
        <p className="mt-6 text-lg leading-8 text-muted-foreground max-w-2xl">
          A comprehensive URL analysis tool that helps you identify potentially 
          malicious websites through multi-factor risk assessment.
        </p>
        
        <div className="mt-10 flex items-center justify-center gap-x-6">
          <Link
            href="/analyze"
            className="rounded-md bg-primary px-3.5 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            Analyze URL
          </Link>
          <Link
            href="/about"
            className="text-sm font-semibold leading-6 text-foreground hover:text-foreground/80"
          >
            Learn more <span aria-hidden="true">→</span>
          </Link>
        </div>
        
        <div className="mt-16 grid grid-cols-1 gap-8 sm:grid-cols-3 max-w-4xl">
          <div className="text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
              <svg className="h-6 w-6 text-primary" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.623 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
              </svg>
            </div>
            <h3 className="mt-4 text-lg font-semibold text-foreground">Multi-Factor Analysis</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Combines WHOIS, SSL, reputation, and content analysis for comprehensive risk assessment.
            </p>
          </div>
          
          <div className="text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
              <svg className="h-6 w-6 text-primary" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
              </svg>
            </div>
            <h3 className="mt-4 text-lg font-semibold text-foreground">Real-Time Results</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Fast analysis with intelligent caching for improved performance and user experience.
            </p>
          </div>
          
          <div className="text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
              <svg className="h-6 w-6 text-primary" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
              </svg>
            </div>
            <h3 className="mt-4 text-lg font-semibold text-foreground">Clear Explanations</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Detailed technical information with user-friendly explanations for all risk levels.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}