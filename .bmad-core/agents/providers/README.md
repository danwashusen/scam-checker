# Provider-Specific Agent Configurations

This directory contains IDE/provider-specific configurations for BMAD agents, allowing customization of agent behavior based on the AI provider being used.

## Structure

```
providers/
├── claude/              # Claude-specific configurations
│   ├── agent-template.md # Template for generating Claude native agents
│   ├── dev.yaml         # Configuration for dev agent in Claude
│   ├── architect.yaml   # Configuration for architect agent
│   └── ...              # Other agent configurations
└── [provider]/          # Other provider configurations (future)
```

## Configuration Format

Each provider configuration file is a YAML file with the following structure:

```yaml
# Provider identifier
provider: claude

# Model to use (provider-specific)
model: opus # Options: opus, sonnet, haiku

# Tools specification
tools: all # Which tools the agent can access

# Color for visual distinction in Claude interface
color: blue # Options: blue, green, red, purple, etc.

# Native agent wrapper settings
wrapper:
  name: BMAD-dev # Name for the native agent
```

## How It Works

### For Claude Code

When BMAD is installed for Claude Code with provider configurations:

1. **Standard Command**: Creates the usual BMAD command in `.claude/commands/BMad/agents/[agent].md`
   - Invoked with: `/BMad/agents/dev`
   - Uses current selected model

2. **Native Agent Wrapper**: If provider config exists, also creates a native agent in `.claude/agents/`
   - Invoked with: `/BMAD-dev` (configured wrapper name)
   - Uses the model specified in the provider config (e.g., `opus`)
   - Automatically loads and assumes the full BMAD agent persona

### Benefits

- **Model Control**: Ensure specific agents use optimal models (e.g., Opus for complex dev tasks)
- **Provider Optimization**: Configure settings for each AI provider's strengths
- **Backward Compatible**: Existing BMAD commands continue to work
- **User Choice**: Users can choose between native agent (with specified model) or command (with current model)
- **Visual Distinction**: Color-coded agents for easy identification

## Adding Provider Configurations

To add a configuration for a new provider:

1. Create a directory for the provider (e.g., `providers/gemini/`)
2. Add YAML configuration files for each agent you want to customize
3. Include provider-specific settings and model preferences
4. Create an agent template file for native agent generation
5. The installer will automatically detect and use these configurations

## Example Usage

After installation with provider configs:

```bash
# Use native agent with specified model (e.g., Opus)
@agent-BMAD-dev what's your name?

# Use standard command with current model
/BMad/agents/dev
```

Both approaches load the same BMAD agent persona, but the native agent ensures the specified model and settings are used.
