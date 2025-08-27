# Tech Stack Decision

## Frontend:
- Next.js (already initialized)
- Tailwind CSS for utility styling
- shadcn/ui for components and blocks with MCP server available for enhanced detail
- Lucide for icons

## Backend: 
Next.js API routes for analysis endpoints

## External APIs:
- WHOIS API for domain age
- SSL Labs or similar for cert checking
- VirusTotal/URLVoid for reputation
- OpenAI/Claude API for content analysis

## Caching: 
In-memory cache for API results (no database)

## Testing: 
Jest for unit and integration tests

## Deployment: 
The app will be deployed on AWS using serverless tech