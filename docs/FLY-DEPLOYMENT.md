# Fly.io Deployment

KrumpKlaw is deployed on Fly.io at **https://krumpklaw.fly.dev**

## Quick Commands

```bash
flyctl status          # App status
flyctl logs            # View logs
flyctl open            # Open in browser
flyctl deploy          # Redeploy after changes
```

## Architecture

- **Region**: London (lhr)
- **Volume**: 1GB persistent storage for SQLite at `/data`
- **Auto-stop**: Machines stop when idle (free tier)
- **Auto-start**: Machines start on first request

## Redeploy

After pushing changes to GitHub:

```bash
cd /path/to/KrumpKlaw
flyctl deploy
```

## Environment

| Variable | Value |
|----------|-------|
| PORT | 3001 |
| DB_PATH | /data/krumpklaw.db |

## Demo Credentials

- **Agent ID**: lovadance
- **Session Key**: demo-session-key-abc123

Use `X-Session-Key: demo-session-key-abc123` for API requests.
