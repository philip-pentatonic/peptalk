# Railway CLI Quick Reference

## Common Commands We Use

### Authentication
```bash
railway login                    # Login via browser
railway whoami                   # Check logged in user
railway logout                   # Logout
```

### Project Management
```bash
railway list                     # List all projects
railway link --project <ID>      # Link to existing project
railway unlink                   # Unlink from project
railway status                   # Show current project/service info
railway open                     # Open project in browser
```

### Service Management
```bash
railway service                  # Link to a service (interactive)
railway service --help           # Show service command options
railway add                      # Add new service (interactive)
```

### Deployment
```bash
railway up                       # Deploy current directory
railway up --detach              # Deploy without watching logs
railway up --service <NAME>      # Deploy to specific service
railway up --ci                  # CI mode (build logs only)
railway down                     # Remove most recent deployment
railway redeploy                 # Redeploy latest deployment
```

### Environment Variables
```bash
railway variables                              # List all variables
railway variables --kv                        # Show in KEY=VALUE format
railway variables --json                      # Output as JSON
railway variables --set "KEY=VALUE"           # Set single variable
railway variables --set "KEY1=VAL1" \
  --set "KEY2=VAL2"                          # Set multiple variables
railway variables --service <NAME>           # For specific service
railway variables --environment <ENV>        # For specific environment
railway variables --skip-deploys             # Don't trigger redeployment
```

### Logs & Monitoring
```bash
railway logs                     # View deployment logs
railway logs --service <NAME>    # Logs for specific service
railway logs --deployment <ID>   # Logs for specific deployment
```

### Domains
```bash
railway domain                   # Generate Railway domain
railway domain --help            # Domain management options
```

### Other Useful Commands
```bash
railway run <command>            # Run command with Railway env vars
railway shell                    # Open shell with Railway env vars
railway deployment               # Manage deployments
railway environment              # Manage environments (alias: env)
```

## Our Typical Workflow

### Initial Setup
```bash
# 1. Login
railway login

# 2. Link to project
railway link --project 61c8ecaa-f794-4991-8dee-1edaf88357fd

# 3. Check status
railway status
```

### Deploying Research Pipeline
```bash
# If service exists, deploy to it
railway up --detach --service research-pipeline

# If service doesn't exist yet, create via dashboard first
# Then deploy
railway up --detach
```

### Setting Environment Variables
```bash
# Set all required env vars for research service
railway variables \
  --set "PUBMED_EMAIL=support@machinegenie.ai" \
  --set "PUBMED_API_KEY=xxx" \
  --set "ANTHROPIC_API_KEY=xxx" \
  --set "OPENAI_API_KEY=xxx" \
  --set "R2_PUBLIC_URL=https://peptalk-pdfs.polished-glitter-23bb.workers.dev" \
  --set "PORT=3000" \
  --service research-pipeline
```

### Getting Service URL
```bash
# Generate Railway domain
railway domain --service research-pipeline

# Or open in browser to see URL
railway open
```

### Monitoring Deployment
```bash
# Watch logs
railway logs --service research-pipeline

# Check deployment status
railway status
```

### Redeploying After Code Changes
```bash
# Update and redeploy
railway up --detach --service research-pipeline

# Or redeploy without changes
railway redeploy --service research-pipeline
```

## Tips

1. **Always specify `--service`** when you have multiple services in a project
2. **Use `--skip-deploys`** when setting multiple variables to avoid multiple redeployments
3. **Use `--detach`** to avoid waiting for deployment to complete
4. **Use `--ci` mode** in CI/CD pipelines for cleaner logs
5. **Link service once** and Railway remembers it for the current directory

## Project Structure

```
Project: positive-truth (61c8ecaa-f794-4991-8dee-1edaf88357fd)
├── Service: research-pipeline
│   ├── Environment: production
│   ├── Dockerfile: Dockerfile.research
│   └── Config: railway.json
└── Environment Variables
    ├── PUBMED_EMAIL
    ├── PUBMED_API_KEY
    ├── ANTHROPIC_API_KEY
    ├── OPENAI_API_KEY
    ├── R2_PUBLIC_URL
    └── PORT
```

## Troubleshooting

### "No linked project found"
```bash
railway link --project 61c8ecaa-f794-4991-8dee-1edaf88357fd
```

### "No service linked"
```bash
# Either link to existing service
railway service  # Then select from list

# Or specify service in command
railway up --service research-pipeline
```

### "Multiple services found"
```bash
# Always use --service flag
railway up --service research-pipeline
railway logs --service research-pipeline
```

### "The input device is not a TTY"
- This happens in non-interactive environments
- Solution: Use Railway Dashboard for initial setup (creating services, linking)
- Then use CLI with explicit flags (--service, --project, etc.)
