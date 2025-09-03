# Claude Code Configuration

## MCP Server Usage

### IMPORTANT: Mandatory MCP Server Usage

When working on tasks that align with any MCP server's capabilities, you MUST use the appropriate MCP server. Do not attempt to work around or substitute MCP functionality with other approaches.

### shadcn MCP

- **Purpose**: Provides direct access to shadcn/ui component documentation, examples, and implementation details
- **When to use**: MUST be used when adding new shadcn/ui components to the project, checking component APIs and props, understanding component usage patterns, reviewing available components, implementing UI components that follow shadcn/ui patterns, troubleshooting shadcn component issues, or exploring component customization options. This server provides the most up-to-date and accurate shadcn/ui information and should be the primary source for all shadcn/ui related development tasks.
- **⚠️ MANDATORY USAGE**: This server MUST be used for all shadcn/ui component work - no manual documentation lookup or guessing component APIs
- **Usage notes**: Access via HTTP transport, provides comprehensive component listings and detailed implementation examples
- **Source**: Project-level (.mcp.json)

### Context7 MCP

- **Purpose**: Retrieves current, up-to-date documentation for external libraries and frameworks
- **When to use**: MUST be used when working with external libraries beyond basic usage, implementing complex library integrations, troubleshooting library-specific issues, understanding API changes or updates, exploring advanced library features, checking for deprecated methods or new alternatives, researching library best practices, or when you need the most current documentation for any third-party package. This includes but is not limited to: React libraries, UI frameworks, utility libraries, build tools, testing frameworks, and any npm packages used in the project.
- **⚠️ MANDATORY USAGE**: This server MUST be used instead of relying on potentially outdated knowledge when working with external libraries - always get current documentation
- **Usage notes**: Requires library resolution first, then documentation retrieval; supports version-specific documentation lookup
- **Source**: Project-level (.mcp.json)

### Playwright MCP

- **Purpose**: Provides comprehensive browser automation capabilities for testing, UI validation, and web interaction
- **When to use**: MUST be used when performing end-to-end testing, validating UI functionality in browsers, taking screenshots for documentation or testing, automating browser interactions, testing responsive design across different viewport sizes, validating form submissions and user flows, checking for accessibility issues through browser testing, debugging frontend issues that require browser inspection, testing JavaScript functionality in real browser environments, or automating any task that requires browser interaction. This includes both development testing and production validation scenarios.
- **⚠️ MANDATORY USAGE**: This server MUST be used for all browser automation tasks - do not attempt manual testing or alternative automation approaches
- **Usage notes**: Supports multiple browser types, can handle complex user interactions, provides detailed browser logs and network monitoring
- **Source**: Project-level (.mcp.json)

### Playwright MCP Lifecycle Management (mandatory)

- If you start a Playwright MCP session, you must close it before ending the task.
- Always call the MCP action(s) to close any created pages/contexts and then end the session/shutdown via the server.
- On interruption or error, perform an MCP cleanup step before exit to avoid orphan Playwright MCP sessions.

## Project Notes

- Uses Next.js 15 App Router
- shadcn/ui for components
- TypeScript strict mode
- AWS Lambda backend

## Development Server Management

### Mandatory Dev Server Requirements

### Server Lifecycle Management

1. **Starting the server**:
   - Use: `npm run dev` with `run_in_background: true`
   - Monitor server startup and confirm it's running
   - Provide user with localhost URL (typically http://localhost:3000)

2. **During development**:
   - Keep server running throughout development session
   - Monitor server output for errors or warnings
   - Direct user to refresh browser to see changes

3. **Server cleanup**:
   - ALWAYS stop the dev server before ending development sessions
   - Use KillBash tool to terminate background processes
   - Also ensure any Playwright MCP sessions you started are closed (see Playwright MCP Lifecycle Management)
   - Ensure no orphaned processes remain running

## Hooks Configuration

### Post-Edit Formatting
```json
{
  "hooks": {
    "post-edit": "if [[ \"$CLAUDE_FILE_PATH\" == *.ts ]]; then npx prettier --write \"$CLAUDE_FILE_PATH\"; fi"
  }
}
```
