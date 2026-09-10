#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════
# TROCO — CLOUD LOGGING ANALYZER
# Fetches and filters Cloud Functions & App Check error logs from the last 2 hours.
# ═══════════════════════════════════════════════════════════════════

PROJECT_ID=${GCP_PROJECT_ID:-"troco-app"}
SINCE_DURATION="2h"

echo "🔍 Analyzing Cloud Functions & Firestore logs for project: $PROJECT_ID (Last $SINCE_DURATION)..."

# 1. Cloud Function Errors
echo ""
echo "=== [1] Cloud Function Errors (Severity >= ERROR) ==="
gcloud logging read "resource.type=\"cloud_function\" severity>=ERROR timestamp >= \"$(date -u -d "$SINCE_DURATION ago" +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || date -u -v-2H +%Y-%m-%dT%H:%M:%SZ)\"" \
  --project="$PROJECT_ID" \
  --limit=25 \
  --format="table(timestamp, resource.labels.function_name, textPayload, jsonPayload.message)"

# 2. App Check Verification Failures
echo ""
echo "=== [2] App Check Rejections ==="
gcloud logging read "resource.type=\"cloud_function\" jsonPayload.error.message=~\"App Check\"" \
  --project="$PROJECT_ID" \
  --limit=15 \
  --format="table(timestamp, resource.labels.function_name, jsonPayload.error.message)"

# 3. Transfer & Stripe Webhook Errors
echo ""
echo "=== [3] Financial & Transfer Function Errors ==="
gcloud logging read "resource.type=\"cloud_function\" (resource.labels.function_name=\"transferAtomically\" OR resource.labels.function_name=\"stripeWebhook\" OR resource.labels.function_name=\"applyPayment\") severity>=WARNING" \
  --project="$PROJECT_ID" \
  --limit=20 \
  --format="table(timestamp, resource.labels.function_name, severity, textPayload, jsonPayload.message)"

# 4. WebRTC Signaling / Call LifeCycle Logs
echo ""
echo "=== [4] WebRTC & Calls Lifecycle Events ==="
gcloud logging read "jsonPayload.category=\"webrtc\" OR jsonPayload.action=~\"call_\"" \
  --project="$PROJECT_ID" \
  --limit=20 \
  --format="table(timestamp, jsonPayload.action, jsonPayload.callId, jsonPayload.message)"

echo ""
echo "✅ Analysis complete."
