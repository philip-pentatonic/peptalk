# Cloudflare API Token Setup

**Last Updated:** 2025-11-04

---

## 🔑 Required Token Scopes for PepTalk

You need a Cloudflare API Token with the following permissions:

### Option 1: Use Wrangler Login (Recommended for Development)

This is the **easiest method** and what you've already done:

```bash
wrangler login
```

This opens a browser and grants full permissions automatically. Perfect for:
- ✅ Local development
- ✅ Testing
- ✅ Initial setup
- ✅ Manual deployments

**You're already logged in!** You can proceed with deployment.

---

### Option 2: Create Custom API Token (Recommended for CI/CD)

For production deployments, GitHub Actions, or CI/CD pipelines, create a custom token.

**Create Token:** https://dash.cloudflare.com/profile/api-tokens

#### Required Permissions:

**Account Permissions:**
- ✅ **Account Settings** → Read
- ✅ **Workers R2 Storage** → Edit
- ✅ **Workers KV Storage** → Edit
- ✅ **D1** → Edit

**Zone Permissions:** (if using custom domain)
- ✅ **Zone** → Read
- ✅ **DNS** → Edit
- ✅ **Workers Routes** → Edit

**User Permissions:**
- ✅ **User Details** → Read

#### Step-by-Step Token Creation:

1. **Go to:** https://dash.cloudflare.com/profile/api-tokens

2. **Click:** "Create Token"

3. **Select:** "Create Custom Token"

4. **Configure Permissions:**

   ```
   Account Permissions:
   ├─ Account Settings: Read
   ├─ Workers R2 Storage: Edit
   ├─ Workers KV Storage: Edit
   └─ D1: Edit

   Zone Permissions (optional, for custom domains):
   ├─ Zone: Read
   ├─ DNS: Edit
   └─ Workers Routes: Edit

   User Permissions:
   └─ User Details: Read
   ```

5. **Account Resources:** Select your account

6. **Zone Resources:** (if using custom domain)
   - Select: Specific zone
   - Choose: your domain

7. **Client IP Address Filtering:** (optional)
   - Leave blank for any IP
   - Or restrict to your server IPs

8. **TTL:** (optional)
   - Leave blank for no expiration
   - Or set expiration date

9. **Click:** "Continue to summary"

10. **Click:** "Create Token"

11. **Copy the token** (starts with something like: `xxx-yyy-zzz`)
    - ⚠️ **Save it now!** You won't see it again

---

## 🔐 Using the Token

### For Local Development (Already Done)

You've already logged in with `wrangler login`, so you're all set!

```bash
# Check your login status
wrangler whoami

# Output shows your email and account ID
```

### For CI/CD (GitHub Actions, etc.)

Set the token as an environment variable:

```bash
export CLOUDFLARE_API_TOKEN=your_token_here
```

Or in GitHub Actions secrets:
```yaml
# .github/workflows/deploy.yml
env:
  CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
```

---

## 📋 Token Template

If creating a custom token, use this template:

**Token Name:** `PepTalk Production Deployment`

**Permissions:**
```json
{
  "account": {
    "Account Settings": "read",
    "Workers R2 Storage": "edit",
    "Workers KV Storage": "edit",
    "D1": "edit"
  },
  "user": {
    "User Details": "read"
  }
}
```

**For Custom Domain (add these):**
```json
{
  "zone": {
    "Zone": "read",
    "DNS": "edit",
    "Workers Routes": "edit"
  }
}
```

---

## 🎯 What Each Permission Does

### Account Permissions

**Account Settings (Read)**
- Allows Wrangler to read your account information
- Required for: All deployments

**Workers R2 Storage (Edit)**
- Allows creating/deleting R2 buckets
- Allows uploading/downloading files to R2
- Required for: PDF storage

**Workers KV Storage (Edit)**
- Allows creating/deleting KV namespaces
- Allows reading/writing KV data
- Required for: Rate limiting

**D1 (Edit)**
- Allows creating/deleting D1 databases
- Allows running migrations
- Allows executing queries
- Required for: Database operations

### Zone Permissions (Only if using custom domain)

**Zone (Read)**
- Read zone information
- Required for: Custom domain setup

**DNS (Edit)**
- Add/edit DNS records
- Required for: Pointing domain to Workers

**Workers Routes (Edit)**
- Create routes for Workers
- Required for: Custom domain routing

### User Permissions

**User Details (Read)**
- Read your user information
- Required for: Authentication and account access

---

## ✅ Verification

After creating your token, test it:

```bash
# Set the token
export CLOUDFLARE_API_TOKEN=your_token_here

# Test with Wrangler
wrangler whoami

# Should show:
# Account: Your Account Name
# Account ID: xxxxxxxxxx
```

---

## 🚨 Security Best Practices

### DO:
- ✅ Use custom tokens for production
- ✅ Limit token scope to only what's needed
- ✅ Set token expiration dates
- ✅ Restrict by IP address if possible
- ✅ Store tokens in secrets manager (GitHub Secrets, etc.)
- ✅ Rotate tokens regularly

### DON'T:
- ❌ Share tokens in public repos
- ❌ Commit tokens to git
- ❌ Use global API keys (use tokens instead)
- ❌ Give tokens more permissions than needed
- ❌ Use the same token for dev and prod

---

## 📝 Environment Variables Summary

### Development (Local)

You've already done this with `wrangler login`! No token needed.

```bash
# Already logged in ✅
wrangler whoami
```

### Production (CI/CD)

Create custom token and set:

```bash
export CLOUDFLARE_API_TOKEN=your_custom_token
export CLOUDFLARE_ACCOUNT_ID=your_account_id
```

---

## 🔄 Next Steps

Since you've already logged in with `wrangler login`, you can proceed directly to:

1. **Create D1 Database:**
   ```bash
   wrangler d1 create peptalk-db
   ```

2. **Create R2 Bucket:**
   ```bash
   wrangler r2 bucket create peptalk-pdfs
   ```

3. **Create KV Namespace:**
   ```bash
   wrangler kv:namespace create RATE_LIMIT
   ```

4. **Deploy Workers:**
   ```bash
   cd apps/workers
   wrangler deploy
   ```

Everything will work with your current login! 🎉

---

## 🆘 Troubleshooting

### "Not authenticated" error

```bash
# Re-login
wrangler login

# Or set token manually
export CLOUDFLARE_API_TOKEN=your_token
```

### "Insufficient permissions" error

Your token needs additional scopes. Recreate with:
- Account Settings: Read
- D1: Edit
- R2 Storage: Edit
- KV Storage: Edit

### "Account ID not found" error

```bash
# Get your account ID
wrangler whoami

# Set it explicitly
export CLOUDFLARE_ACCOUNT_ID=your_account_id
```

---

## ✅ You're Ready!

Since you've already run `wrangler login` successfully, you have all the permissions you need for local development and deployment!

**No additional token setup required for now.**

Proceed with the deployment steps in `DEPLOYMENT_GUIDE.md`! 🚀
