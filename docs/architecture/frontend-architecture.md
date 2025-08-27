# Frontend Architecture

## Project Tree Structure

### Complete Frontend Organization
```
scam-checker/
├── src/                              # Application source code
│   ├── app/                          # Next.js App Router directory
│   │   ├── globals.css               # Global styles
│   │   ├── layout.tsx                # Root layout component
│   │   ├── page.tsx                  # Home page component
│   │   ├── loading.tsx               # Loading UI component
│   │   ├── error.tsx                 # Error UI component
│   │   └── api/                      # API route handlers (development/local)
│   │       └── analyze/              # URL analysis endpoints
│   │           └── route.ts          # Main analysis API endpoint
│   │
│   ├── components/                   # Reusable React components
│   │   ├── ui/                       # Base UI components (shadcn/ui)
│   │   │   ├── button.tsx            # Core button component
│   │   │   ├── input.tsx             # Form input component
│   │   │   ├── card.tsx              # Card layout component
│   │   │   ├── badge.tsx             # Status/label badges
│   │   │   ├── progress.tsx          # Progress indicators
│   │   │   ├── alert.tsx             # Alert/notification component
│   │   │   └── spinner.tsx           # Loading spinner
│   │   │
│   │   ├── analysis/                 # URL analysis specific components
│   │   │   ├── url-input-form.tsx    # Main URL submission form
│   │   │   ├── risk-display.tsx      # Risk score visualization
│   │   │   ├── technical-details.tsx # Technical analysis results
│   │   │   ├── explanation-panel.tsx # AI-generated explanations
│   │   │   ├── loading-states.tsx    # Analysis loading indicators
│   │   │   └── result-summary.tsx    # Quick results overview
│   │   │
│   │   └── layout/                   # Layout and navigation components
│   │       ├── header.tsx            # Main site header
│   │       ├── footer.tsx            # Site footer
│   │       ├── navigation.tsx        # Navigation menu
│   │       └── sidebar.tsx           # Technical details sidebar
│   │
│   ├── lib/                          # Shared utilities and configurations
│   │   ├── utils.ts                  # General utility functions
│   │   ├── validation.ts             # URL validation logic
│   │   ├── cache.ts                  # Client-side caching utilities
│   │   ├── api-client.ts             # API communication layer
│   │   └── analysis/                 # Analysis engine utilities
│   │       ├── whois.ts              # WHOIS integration (client helpers)
│   │       ├── ssl.ts                # SSL certificate display helpers
│   │       ├── reputation.ts         # Reputation data formatting
│   │       └── scoring.ts            # Risk scoring display logic
│   │
│   ├── types/                        # TypeScript type definitions
│   │   ├── analysis.ts               # Analysis result types
│   │   ├── api.ts                    # API request/response types
│   │   └── ui.ts                     # UI component prop types
│   │
│   └── hooks/                        # Custom React hooks
│       ├── use-analysis.ts           # URL analysis hook
│       ├── use-debounce.ts           # Input debouncing hook
│       └── use-local-storage.ts      # Local storage state hook
│
└── public/                           # Static assets
    ├── images/                       # Image assets
    ├── icons/                        # Icon assets
    └── favicon.ico                   # Site favicon
```

## Component Architecture

### Design Principles
- **Feature-First Organization**: Components grouped by functionality (ui, analysis, layout)
- **Single Responsibility**: Each component has one clear purpose
- **Composition Over Inheritance**: Use composition patterns for flexibility
- **Accessibility First**: All components built with WCAG 2.1 compliance
- **Performance Optimized**: Lazy loading and code splitting by feature

### Component Categories

#### Base UI Components (`src/components/ui/`)
**Purpose**: Foundational design system components using shadcn/ui
- **Reusable across entire application**
- **Consistent styling and behavior**
- **Accessibility built-in**
- **Customizable via props and CSS variables**

```typescript
// Example: button.tsx
export interface ButtonProps {
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link'
  size?: 'default' | 'sm' | 'lg' | 'icon'
  children: React.ReactNode
}
```

#### Analysis Components (`src/components/analysis/`)
**Purpose**: Domain-specific components for URL analysis functionality
- **Business logic integration**
- **State management via hooks**
- **API communication**
- **Complex user interactions**

```typescript
// Example: url-input-form.tsx
export interface URLInputFormProps {
  onSubmit: (url: string) => Promise<void>
  isLoading?: boolean
  initialValue?: string
  validationRules?: ValidationRule[]
}
```

#### Layout Components (`src/components/layout/`)
**Purpose**: Application structure and navigation
- **Page layout consistency**
- **Navigation state management**
- **Responsive design patterns**
- **SEO optimization**

### Component Communication Patterns

#### Props Down, Events Up
```typescript
// Parent passes data down, child emits events up
<URLAnalysisForm 
  onSubmit={handleURLSubmit}
  isLoading={analysis.isLoading}
  validationRules={urlValidationRules}
/>
```

#### Context for Cross-Component State
```typescript
// Theme context for UI consistency
const ThemeContext = createContext<{
  theme: 'light' | 'dark'
  toggleTheme: () => void
}>()
```

#### Custom Hooks for Logic Reuse
```typescript
// Encapsulate complex state logic in hooks
const { analyzeURL, result, isLoading, error } = useAnalysis()
```

## State Management Architecture

### State Structure
```typescript
// stores/analysisStore.ts - Zustand store
interface AnalysisState {
  currentUrl: string;
  isAnalyzing: boolean;
  currentResult: AnalysisResult | null;
  recentAnalyses: AnalysisResult[];
  viewMode: 'simple' | 'technical';
  expandedSections: Set<string>;
  
  analyzeUrl: (url: string) => Promise<void>;
  toggleViewMode: () => void;
  toggleSection: (sectionId: string) => void;
  clearResult: () => void;
}
```

## Frontend Services Layer

### API Client Setup
```typescript
// lib/api-client.ts
class ApiClient {
  private baseUrl: string;
  private apiKey?: string;
  
  constructor() {
    this.baseUrl = process.env.NEXT_PUBLIC_API_URL || '/api';
  }
  
  async analyze(url: string, options?: AnalysisOptions): Promise<AnalysisResult> {
    return this.request<AnalysisResult>('/analyze', {
      method: 'POST',
      body: JSON.stringify({ url, ...options }),
    });
  }
}

export const apiClient = new ApiClient();
```
