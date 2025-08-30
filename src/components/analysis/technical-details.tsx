'use client'

import * as React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Spinner } from '@/components/ui/spinner'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Calendar, 
  Shield, 
  Server, 
  Lock, 
  AlertCircle,
  CheckCircle,
  Clock
} from 'lucide-react'
import { cn } from '@/lib/utils'

// Helper function to format dates consistently for SSR
const formatDate = (dateString: string) => {
  try {
    const date = new Date(dateString)
    // Use a consistent format that won't vary by locale/timezone
    return date.toISOString().split('T')[0] // YYYY-MM-DD format
  } catch {
    return dateString
  }
}

interface DomainAgeData {
  createdDate: string
  ageInDays: number
  registrar: string
  status: 'valid' | 'invalid' | 'unknown'
}

interface SSLCertificateData {
  valid: boolean
  issuer: string
  validFrom: string
  validTo: string
  protocol: string
}

interface ReputationData {
  score: number
  sources: string[]
  categories: string[]
  lastChecked: string
}

interface TechnicalDetailsProps {
  domainAge?: DomainAgeData | null
  sslCertificate?: SSLCertificateData | null
  reputation?: ReputationData | null
  loading?: boolean
  className?: string
}

// Mock data for demonstration
const mockData = {
  domainAge: {
    createdDate: '2020-03-15',
    ageInDays: 1400,
    registrar: 'Example Registrar Inc.',
    status: 'valid'
  },
  sslCertificate: {
    valid: true,
    issuer: 'Let\'s Encrypt Authority X3',
    validFrom: '2024-01-15',
    validTo: '2024-04-15',
    protocol: 'TLS 1.3'
  },
  reputation: {
    score: 85,
    sources: ['VirusTotal', 'Google Safe Browsing', 'Phishtank'],
    categories: ['Clean', 'Not Malicious'],
    lastChecked: '2024-01-20'
  }
}

export function TechnicalDetails({
  domainAge,
  sslCertificate,
  reputation,
  loading = false,
  className,
}: TechnicalDetailsProps) {
  // Use mock data for demonstration when no real data is provided
  const data = {
    domainAge: domainAge || (loading ? null : mockData.domainAge),
    sslCertificate: sslCertificate || (loading ? null : mockData.sslCertificate),
    reputation: reputation || (loading ? null : mockData.reputation),
  }

  if (loading) {
    return (
      <Card className={cn('w-full', className)}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Spinner size="sm" />
            Loading Technical Details...
          </CardTitle>
          <CardDescription>
            Gathering domain, SSL, and reputation information
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="h-6 bg-muted rounded animate-pulse" />
                <div className="h-4 bg-muted rounded animate-pulse w-3/4" />
                <div className="h-4 bg-muted rounded animate-pulse w-1/2" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  const hasData = data.domainAge || data.sslCertificate || data.reputation

  return (
    <Card className={cn('w-full', className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Server className="h-5 w-5" />
          Technical Analysis
        </CardTitle>
        <CardDescription>
          Detailed technical information about the domain and security
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!hasData ? (
          <div className="text-center py-8 text-muted-foreground">
            <AlertCircle className="h-8 w-8 mx-auto mb-4 opacity-50" />
            <p className="text-sm">
              Technical analysis details will appear here after URL analysis is complete.
            </p>
            <p className="text-xs mt-2">
              This component is ready for backend integration with existing analysis types.
            </p>
          </div>
        ) : (
          <Tabs defaultValue="domain" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="domain">Domain</TabsTrigger>
              <TabsTrigger value="ssl">SSL</TabsTrigger>
              <TabsTrigger value="reputation">Reputation</TabsTrigger>
            </TabsList>

            <TabsContent value="domain" className="space-y-4">
              {data.domainAge ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    <span className="font-medium">Domain Information</span>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="text-sm font-medium">Created Date</div>
                      <div className="text-sm text-muted-foreground">
                        {formatDate(data.domainAge.createdDate)}
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="text-sm font-medium">Domain Age</div>
                      <div className="text-sm text-muted-foreground">
                        {Math.floor(data.domainAge.ageInDays / 365)} years, {data.domainAge.ageInDays % 365} days
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="text-sm font-medium">Registrar</div>
                      <div className="text-sm text-muted-foreground">
                        {data.domainAge.registrar}
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="text-sm font-medium">Status</div>
                      <Badge variant={data.domainAge.status === 'valid' ? 'default' : 'destructive'}>
                        {data.domainAge.status}
                      </Badge>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">Domain information not available</div>
              )}
            </TabsContent>

            <TabsContent value="ssl" className="space-y-4">
              {data.sslCertificate ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Lock className="h-4 w-4" />
                    <span className="font-medium">SSL Certificate</span>
                    {data.sslCertificate.valid ? (
                      <CheckCircle className="h-4 w-4 text-success" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-destructive" />
                    )}
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="text-sm font-medium">Status</div>
                      <Badge variant={data.sslCertificate.valid ? 'default' : 'destructive'}>
                        {data.sslCertificate.valid ? 'Valid' : 'Invalid'}
                      </Badge>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="text-sm font-medium">Protocol</div>
                      <div className="text-sm text-muted-foreground">
                        {data.sslCertificate.protocol}
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="text-sm font-medium">Issuer</div>
                      <div className="text-sm text-muted-foreground">
                        {data.sslCertificate.issuer}
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="text-sm font-medium">Valid Until</div>
                      <div className="text-sm text-muted-foreground">
                        {formatDate(data.sslCertificate.validTo)}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">SSL information not available</div>
              )}
            </TabsContent>

            <TabsContent value="reputation" className="space-y-4">
              {data.reputation ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    <span className="font-medium">Reputation Analysis</span>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Reputation Score</span>
                      <Badge variant={data.reputation.score > 80 ? 'default' : data.reputation.score > 50 ? 'secondary' : 'destructive'}>
                        {data.reputation.score}%
                      </Badge>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="text-sm font-medium">Sources Checked</div>
                      <div className="flex flex-wrap gap-2">
                        {data.reputation.sources.map((source: string) => (
                          <Badge key={source} variant="outline">
                            {source}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="text-sm font-medium">Categories</div>
                      <div className="flex flex-wrap gap-2">
                        {data.reputation.categories.map((category: string) => (
                          <Badge key={category} variant="secondary">
                            {category}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      <span>Last checked: {formatDate(data.reputation.lastChecked)}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">Reputation information not available</div>
              )}
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
    </Card>
  )
}