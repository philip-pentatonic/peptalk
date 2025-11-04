# PepTalk — Operations Runbook

**Version:** 1.0
**Last Updated:** 2025-11-04

---

## Overview

This runbook provides step-by-step procedures for common operational tasks, troubleshooting, and incident response.

**Quick Links:**
- [Monitoring Dashboards](#monitoring)
- [Common Issues](#common-issues)
- [Emergency Procedures](#emergency-procedures)

---

## Monitoring

### Dashboards

**Cloudflare Workers:**
- URL: https://dash.cloudflare.com → Workers → peptalk-api
- Metrics: Requests, errors, latency

**Cloudflare Pages:**
- URL: https://dash.cloudflare.com → Pages → peptalk
- Metrics: Deployments, build time, traffic

**D1 Database:**
- URL: https://dash.cloudflare.com → D1 → peptalk-production-db
- Metrics: Storage, queries, errors

**Stripe:**
- URL: https://dashboard.stripe.com
- Metrics: Subscriptions, revenue, failed payments

### Key Metrics

| Metric | Target | Alert Threshold |
|--------|--------|----------------|
| Error rate | <1% | >5% for 5 min |
| P95 latency | <500ms | >2000ms for 10 min |
| Uptime | 99.9% | Any downtime |
| Pipeline success | >95% | <90% for 24h |

---

## Daily Operations

### Morning Checklist

1. **Check overnight pipeline runs**
   ```bash
   # View recent logs
   wrangler tail --env production | grep "pipeline"
   ```

2. **Review error logs**
   - Cloudflare Dashboard → Workers → Logs
   - Look for 5xx errors or spike in 4xx

3. **Check subscription status**
   - Stripe Dashboard → Subscriptions
   - Note any past_due or canceled

4. **Verify cron jobs ran**
   - Check last `nightly-ingest` timestamp in logs

### Weekly Tasks

1. **Review cost reports**
   - LLM usage (Claude + GPT)
   - Cloudflare billing
   - Stripe fees

2. **Check for security updates**
   ```bash
   pnpm audit
   ```

3. **Review user feedback**
   - GitHub issues
   - Support emails

4. **Backup database**
   ```bash
   wrangler d1 export peptalk-production-db --output backup-$(date +%Y-%m-%d).sql
   ```

---

## Common Issues

### Issue: Pipeline Failed for Peptide X

**Symptoms:**
- Error in logs: "Pipeline failed for BPC-157"
- PDF not updated
- No new page version

**Diagnosis:**
```bash
# Check logs
wrangler tail --env production | grep "BPC-157"

# Common causes:
# - PubMed API timeout
# - LLM API error
# - Compliance check failed
```

**Resolution:**
1. Check specific error in logs
2. If LLM error, retry manually:
   ```bash
   cd packages/research
   pnpm cli run-single "BPC-157"
   ```
3. If compliance failed, review output and fix prompt if needed
4. If PubMed timeout, retry (usually transient)

**Prevention:**
- Add retry logic with exponential backoff
- Monitor PubMed API status

---

### Issue: User Can't Access PDF

**Symptoms:**
- User reports "Subscription required" error
- User claims they have active subscription

**Diagnosis:**
```bash
# Check subscription in D1
wrangler d1 execute peptalk-production-db --command "
  SELECT s.status, s.current_period_end, u.email
  FROM subscriptions s
  JOIN users u ON u.id = s.user_id
  WHERE u.email = 'user@example.com'
"
```

**Possible Causes:**
1. **Subscription expired:** `current_period_end` < now
2. **Stripe webhook not processed:** Check Stripe Dashboard → Webhooks
3. **Session invalid:** User needs to log in again

**Resolution:**
1. If expired, direct user to billing portal
2. If webhook missed:
   ```bash
   # Manually update subscription
   wrangler d1 execute peptalk-production-db --command "
     UPDATE subscriptions
     SET status = 'active', current_period_end = '2026-01-01T00:00:00Z'
     WHERE user_id = '<user-id>'
   "
   ```
3. If session issue, ask user to log out and back in

---

### Issue: High Error Rate (>5%)

**Symptoms:**
- Alert: "Error rate exceeded 5%"
- Cloudflare shows spike in 5xx errors

**Diagnosis:**
```bash
# Check recent errors
wrangler tail --env production --status error

# Common causes:
# - D1 database overload
# - R2 API error
# - Code bug in recent deploy
```

**Resolution:**
1. **If D1 overload:**
   - Check query performance
   - Add indexes if needed
   - Consider read replicas

2. **If R2 error:**
   - Check Cloudflare status page
   - Usually resolves automatically

3. **If code bug:**
   - Rollback to previous deployment:
     ```bash
     wrangler rollback --env production
     ```
   - Fix bug and redeploy

**Prevention:**
- Load testing before major releases
- Gradual rollout (canary deployments)

---

### Issue: Stripe Webhook Failed

**Symptoms:**
- Stripe Dashboard shows failed webhook delivery
- User subscription not updated

**Diagnosis:**
1. Check Stripe Dashboard → Webhooks → Event details
2. Look for error message (e.g., "400 Bad Request")

**Resolution:**
1. **If signature verification failed:**
   - Check `STRIPE_WEBHOOK_SECRET` is correct
   - Rotate secret if compromised

2. **If timeout:**
   - Webhook handler took >30s (Stripe limit)
   - Optimize handler or move to async job

3. **Resend event manually:**
   - Stripe Dashboard → Event → Resend

**Prevention:**
- Webhook handler should be <5s
- Use idempotency keys to prevent duplicates

---

## Emergency Procedures

### Production Down

**Severity: P0**

**Steps:**
1. **Verify outage:**
   ```bash
   curl https://api.peptalk.com/api/health
   ```

2. **Check Cloudflare status:**
   - https://www.cloudflarestatus.com/

3. **If Cloudflare issue:**
   - Wait for resolution (usually <15 min)
   - Post status update

4. **If code issue:**
   - Rollback immediately:
     ```bash
     wrangler rollback --env production
     ```

5. **Communicate:**
   - Post status on Twitter/Status page
   - Email affected users (if >1 hour)

**Post-mortem:**
- Document timeline
- Identify root cause
- Implement fix + prevention

---

### Database Corruption

**Severity: P1**

**Steps:**
1. **Stop all writes:**
   - Disable cron jobs
   - Set Workers to read-only mode

2. **Assess damage:**
   ```bash
   wrangler d1 execute peptalk-production-db --command "PRAGMA integrity_check"
   ```

3. **Restore from backup:**
   ```bash
   # Latest backup
   wrangler d1 execute peptalk-production-db --file backup-latest.sql
   ```

4. **Verify restore:**
   - Check key tables (peptides, users, subscriptions)
   - Run data validation queries

5. **Re-enable writes:**
   - Enable cron jobs
   - Remove read-only mode

**Prevention:**
- Daily automated backups
- Test restore procedure monthly

---

### Security Incident

**Severity: P0**

**Types:**
- Unauthorized access
- Data breach
- DDoS attack

**Immediate Actions:**
1. **Contain:**
   - Block malicious IPs
   - Disable compromised accounts
   - Rotate all secrets

2. **Investigate:**
   - Review access logs
   - Identify scope of breach
   - Preserve evidence

3. **Remediate:**
   - Patch vulnerability
   - Force password resets (if applicable)
   - Update security measures

4. **Communicate:**
   - Notify affected users within 72 hours (GDPR)
   - Report to authorities if required

**Post-incident:**
- Full security audit
- Update security policies
- Implement additional safeguards

---

## Maintenance Windows

### Planned Maintenance

**Schedule:** Sundays 2-4 AM UTC (lowest traffic)

**Procedure:**
1. **Announce 48 hours in advance:**
   - Email to subscribers
   - Status page update

2. **Pre-maintenance:**
   - Backup database
   - Test changes in staging
   - Prepare rollback plan

3. **During maintenance:**
   - Display maintenance page
   - Execute changes
   - Validate everything works

4. **Post-maintenance:**
   - Run smoke tests
   - Monitor for errors
   - Update status page

---

## Database Operations

### Run Query

```bash
# Read query (safe)
wrangler d1 execute peptalk-production-db --command "
  SELECT COUNT(*) FROM peptides
"

# Write query (dangerous, use with caution)
wrangler d1 execute peptalk-production-db --command "
  UPDATE peptides SET evidence_grade = 'high' WHERE slug = 'bpc-157'
"
```

### Apply Migration

```bash
# Test locally first
wrangler d1 migrations apply peptalk-db --local

# Backup before applying
wrangler d1 export peptalk-production-db --output pre-migration-backup.sql

# Apply to production
wrangler d1 migrations apply peptalk-production-db --remote
```

### Export Data

```bash
# Full export
wrangler d1 export peptalk-production-db --output full-export-$(date +%Y-%m-%d).sql

# Table-specific export
wrangler d1 execute peptalk-production-db --command "
  SELECT * FROM users
" --json > users-export.json
```

---

## Scaling Operations

### Add More Peptides

**Capacity Check:**
```bash
# Current peptide count
wrangler d1 execute peptalk-production-db --command "SELECT COUNT(*) FROM peptides"

# Current study count
wrangler d1 execute peptalk-production-db --command "SELECT COUNT(*) FROM studies"
```

**Limits:**
- D1: 100k rows free tier (10k peptides = ~50k studies)
- R2: Unlimited storage (cost: $0.015/GB)
- Workers: 100k requests/day free (scales automatically)

**Process:**
1. Add peptides to `catalog/peptides.yaml`
2. Run batch ingestion:
   ```bash
   pnpm cli run-batch catalog/peptides.yaml
   ```
3. Monitor LLM costs (increases linearly)

---

## Cost Monitoring

### View Current Costs

**Cloudflare:**
- Dashboard → Billing → Usage

**LLM:**
```bash
# Sum token usage from logs
wrangler tail --env production | grep "tokens_used" | awk '{sum+=$NF} END {print sum}'
```

**Stripe:**
- Dashboard → Developers → Logs → Filter by "charge.succeeded"

### Set Budget Alerts

**Cloudflare:**
- Dashboard → Billing → Set billing threshold

**Stripe:**
- Dashboard → Settings → Notifications → Billing alerts

---

## Contact Information

### On-Call Rotation

| Role | Primary | Backup |
|------|---------|--------|
| Engineering | eng@peptalk.com | - |
| Security | security@peptalk.com | - |

### Escalation

1. **L1:** Check runbook, attempt self-service fix
2. **L2:** Contact on-call engineer
3. **L3:** Contact Cloudflare/Stripe support

### External Support

- **Cloudflare:** Enterprise support (if upgraded)
- **Stripe:** Dashboard → Help → Chat support
- **Anthropic:** api@anthropic.com
- **OpenAI:** help.openai.com

---

## References

- [06-deployment.md](./06-deployment.md) - Deployment procedures
- [08-security.md](./08-security.md) - Security protocols
- [Cloudflare Status](https://www.cloudflarestatus.com/)

---

**Document Owner:** Engineering Team
**Lines:** 395 (within 400-line limit ✓)
