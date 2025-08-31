# Provider-Specific Agent Configurations

This directory contains IDE/provider-specific configurations for BMAD agents, allowing customization of agent behavior based on the AI provider being used.

## Structure

```
providers/
├── claude/           # Claude-specific configurations
│   ├── dev.yaml     # Configuration for dev agent in Claude
│   ├── architect.yaml
│   └── ...
├── gemini/          # Gemini-specific configurations
│   └── ...
└── [provider]/      # Other provider configurations
```

## Configuration Format

Each provider configuration file is a YAML file with the following structure:

```yaml
# Provider identifier
provider: claude

# Model to use (provider-specific)
model: opus          # Options: opus, sonnet, haiku

# Generate native agent wrapper
native-agent: true   # Whether to create a native agent in .claude/agents/

# Tools specification
tools: all          # Which tools the agent can access

# Description for the native agent
description: "BMAD Developer Agent optimized for Claude"

# Additional provider-specific settings
additional-config:
  temperature: 0.7
  max-tokens: 4096

# Native agent wrapper settings (Claude-specific)
wrapper:
  name: bmad-dev          # Name for the native agent
  shortcut: /bmad-dev     # Command to invoke the agent
  priority: high          # Priority level
```

## How It Works

### For Claude Code

When BMAD is installed for Claude Code with provider configurations:

1. **Standard Command**: Creates the usual BMAD command in `.claude/commands/BMad/agents/[agent].md`
   - Invoked with: `/BMad/agents/dev`
   - Uses current selected model

2. **Native Agent Wrapper**: If `native-agent: true`, also creates a native agent in `.claude/agents/`
   - Invoked with: `/bmad-dev` (or configured wrapper name)
   - Uses the model specified in the provider config (e.g., `opus`)
   - Automatically invokes the full BMAD agent functionality

### Benefits

- **Model Control**: Ensure specific agents use optimal models (e.g., Opus for complex dev tasks)
- **Provider Optimization**: Tune settings for each AI provider's strengths
- **Backward Compatible**: Existing BMAD commands continue to work
- **User Choice**: Users can choose between native agent (with specified model) or command (with current model)

## Adding Provider Configurations

To add a configuration for a new provider:

1. Create a directory for the provider (e.g., `providers/gemini/`)
2. Add YAML configuration files for each agent you want to customize
3. Include provider-specific settings and model preferences
4. The installer will automatically detect and use these configurations

## Example Usage

After installation with provider configs:

```bash
# Use native agent with Opus model (Claude)
/bmad-dev

# Use standard command with current model
/BMad/agents/dev
```

Both approaches load the same BMAD agent, but the native agent ensures the specified model is used.