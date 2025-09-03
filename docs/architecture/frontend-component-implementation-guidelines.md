# Frontend Component Implementation Guidelines

Always use shadcn/ui components before creating custom implementations.

## Component Selection Hierarchy
```
1. Check shadcn/ui → Use if available
2. Check shadcn blocks/patterns
3. Compose existing shadcn primitives
4. If none apply → Custom (requires justification)
```

## Pre-Implementation Checklist
```
# Component: [Name]
- [ ] Searched shadcn/ui components
- [ ] Checked shadcn blocks
- [ ] Reviewed similar shadcn implementations
- [ ] Selected primary + supporting components
- [ ] If custom: justification and approval recorded
```

## Common Component Mappings (must use)

| UI Need | shadcn Component |
|---------|------------------|
| Navigation bar | NavigationMenu |
| Mobile menu | Sheet |
| Modal/Dialog | Dialog |
| Dropdown menu | DropdownMenu/Select |
| Forms | Form + react-hook-form |
| Loading states | Skeleton |
| Notifications | Toast/Sonner |
| Error messages | Alert |
| Data tables | Table/DataTable |
| Tabs/Accordions | Tabs/Accordion |

## Implementation Process
Use `npx shadcn@latest add <component>` to add required components, implement, add tests, and document usage. Custom components must include a justification file and follow shadcn styling patterns.

## Hydration Safety Checklist

Before implementing any component with dynamic content, ensure SSR/CSR compatibility:

**Required Checks:**
- [ ] No Date/Time values in initial state (use static initial values)
- [ ] No Math.random() or crypto.getRandomValues() in initial render
- [ ] Client-only operations wrapped in useEffect with isClient guard
- [ ] Form state properly initialized with consistent values
- [ ] Debug information is hydration-safe (no dynamic timestamps)
- [ ] Tested with multiple page reloads to verify event handlers remain bound

**Safe Pattern Example:**
```typescript
// Client detection pattern for browser-only operations
const [isClient, setIsClient] = useState(false)
useEffect(() => {
  setIsClient(true)
}, [])

// Use for any client-specific rendering
if (isClient) {
  // Browser-only code here
}
```

**Common Hydration Pitfalls:**
- Using `window`, `document`, or `localStorage` during initial render
- Generating different IDs/keys on server vs client
- Conditional rendering based on user-agent or browser detection
- Dynamic timestamps or random values in initial state

See detailed guidance in `docs/architecture/frontend-component-guidelines.md`.
