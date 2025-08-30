import Link from 'next/link'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Navigation } from '@/components/layout/navigation'
import { FileQuestion, Home, Search } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      
      <main className="flex-1 flex items-center justify-center">
        <div className="container mx-auto px-4 py-16">
          <div className="max-w-2xl mx-auto text-center">
            <Card>
              <CardHeader>
                <div className="w-16 h-16 bg-muted rounded-lg flex items-center justify-center mx-auto mb-4">
                  <FileQuestion className="h-8 w-8 text-muted-foreground" />
                </div>
                <CardTitle className="text-3xl">404 - Page Not Found</CardTitle>
                <CardDescription className="text-lg">
                  Sorry, we couldn&apos;t find the page you&apos;re looking for.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <p className="text-muted-foreground">
                  The page you requested might have been moved, deleted, or you entered the wrong URL.
                </p>
                
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Button asChild>
                    <Link href="/" className="flex items-center gap-2">
                      <Home className="h-4 w-4" />
                      Go Home
                    </Link>
                  </Button>
                  <Button variant="outline" asChild>
                    <Link href="/about" className="flex items-center gap-2">
                      <Search className="h-4 w-4" />
                      Learn More
                    </Link>
                  </Button>
                </div>

                <div className="border-t pt-6">
                  <p className="text-sm text-muted-foreground mb-4">
                    You might be looking for:
                  </p>
                  <div className="flex justify-center">
                    <Navigation orientation="vertical" className="text-left" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}