#!/usr/bin/env bash
# One-time Azure setup for the Tapiro demo. Safe to re-run.
#
# Creates (or updates):
#   - resource group + Container Apps environment (shared with Scoop)
#   - Container Apps: tapiro-api-internal, tapiro-api-external (public),
#     tapiro-ml (internal only). All scale to zero.
#   - Static Web Apps (Free): tapiro-web, tapiro-demo-store
#   - an Entra app with a federated credential so GitHub Actions can deploy
#     without a stored password
#
# Needs: az CLI logged in (az login), and these exported in your shell.
# Nothing here is written to disk.
#   MONGODB_URI             Atlas connection string
#   REDIS_URL               rediss://... from Upstash
#   AI_SERVICE_API_KEY      any long random string (openssl rand -hex 32)
#   AUTH0_DOMAIN, AUTH0_AUDIENCE, AUTH0_SPA_CLIENT_ID,
#   AUTH0_M2M_CLIENT_ID, AUTH0_M2M_CLIENT_SECRET,
#   AUTH0_USER_ROLE_ID, AUTH0_STORE_ROLE_ID
# Optional:
#   GHCR_USERNAME, GHCR_TOKEN   only if the GHCR packages are private
set -euo pipefail
# Secrets and env vars are passed as unquoted lists below. Turn off globbing
# so characters like ? in a connection string are never expanded.
set -f

RG="${RG:-rg-portfolio}"
LOCATION="${LOCATION:-southeastasia}"
SWA_LOCATION="${SWA_LOCATION:-eastasia}"   # Static Web Apps has fewer regions
ENV_NAME="${ENV_NAME:-cae-portfolio}"
REPO="${REPO:-CDevmina/Tapiro}"
BRANCH="${BRANCH:-Development}"
PLACEHOLDER_IMAGE="mcr.microsoft.com/k8se/quickstart:latest"

for v in MONGODB_URI REDIS_URL AI_SERVICE_API_KEY AUTH0_DOMAIN AUTH0_AUDIENCE AUTH0_SPA_CLIENT_ID \
  AUTH0_M2M_CLIENT_ID AUTH0_M2M_CLIENT_SECRET AUTH0_USER_ROLE_ID AUTH0_STORE_ROLE_ID; do
  if [ -z "${!v:-}" ]; then echo "Missing $v" >&2; exit 1; fi
done

az config set extension.use_dynamic_install=yes_without_prompt >/dev/null
SUBSCRIPTION_ID="$(az account show --query id -o tsv)"
TENANT_ID="$(az account show --query tenantId -o tsv)"

echo "== Resource group and Container Apps environment"
az group create -n "$RG" -l "$LOCATION" -o none
if ! az containerapp env show -n "$ENV_NAME" -g "$RG" -o none 2>/dev/null; then
  # No Log Analytics workspace: keeps the bill at zero. Use the portal's
  # log stream to debug.
  az containerapp env create -n "$ENV_NAME" -g "$RG" -l "$LOCATION" --logs-destination none -o none
fi

echo "== Static Web Apps"
for app in tapiro-web tapiro-demo-store; do
  az staticwebapp show -n "$app" -g "$RG" -o none 2>/dev/null ||
    az staticwebapp create -n "$app" -g "$RG" -l "$SWA_LOCATION" --sku Free -o none
done
WEB_HOST="$(az staticwebapp show -n tapiro-web -g "$RG" --query defaultHostname -o tsv)"
DEMO_HOST="$(az staticwebapp show -n tapiro-demo-store -g "$RG" --query defaultHostname -o tsv)"

registry_args=()
if [ -n "${GHCR_TOKEN:-}" ]; then
  registry_args=(--registry-server ghcr.io --registry-username "$GHCR_USERNAME" --registry-password "$GHCR_TOKEN")
fi

# create_or_update NAME PORT INGRESS CPU MEMORY SECRETS ENVVARS
create_or_update() {
  local name=$1 port=$2 ingress=$3 cpu=$4 memory=$5 secrets=$6 envvars=$7
  if az containerapp show -n "$name" -g "$RG" -o none 2>/dev/null; then
    # shellcheck disable=SC2086
    az containerapp secret set -n "$name" -g "$RG" --secrets $secrets -o none
    # shellcheck disable=SC2086
    az containerapp update -n "$name" -g "$RG" --set-env-vars $envvars -o none
  else
    # Starts with a placeholder image. The deploy workflow swaps in the real one.
    # shellcheck disable=SC2086
    az containerapp create -n "$name" -g "$RG" --environment "$ENV_NAME" \
      --image "$PLACEHOLDER_IMAGE" --target-port "$port" --ingress "$ingress" \
      --cpu "$cpu" --memory "$memory" --min-replicas 0 --max-replicas 1 \
      --secrets $secrets --env-vars $envvars "${registry_args[@]}" -o none
  fi
}

COMMON_SECRETS="mongodb-uri=$MONGODB_URI redis-url=$REDIS_URL ai-key=$AI_SERVICE_API_KEY"

echo "== tapiro-ml (internal only)"
create_or_update tapiro-ml 8000 internal 0.5 1.0Gi "$COMMON_SECRETS" \
  "MONGODB_URI=secretref:mongodb-uri MONGODB_DB_NAME=tapiro REDIS_URL=secretref:redis-url \
   SECRET_KEY=secretref:ai-key HF_HUB_OFFLINE=1 \
   API_BASE_URL=http://tapiro-api-internal EXTERNAL_API_URL=http://tapiro-api-external"

echo "== tapiro-api-external"
create_or_update tapiro-api-external 3001 external 0.25 0.5Gi "$COMMON_SECRETS" \
  "NODE_ENV=production PORT=3001 MONGODB_URI=secretref:mongodb-uri DB_NAME=tapiro \
   REDIS_URL=secretref:redis-url AI_SERVICE_URL=http://tapiro-ml/api AI_SERVICE_API_KEY=secretref:ai-key \
   ALLOWED_ORIGINS=https://$DEMO_HOST"

echo "== tapiro-api-internal"
INTERNAL_FQDN="$(az containerapp show -n tapiro-api-internal -g "$RG" --query properties.configuration.ingress.fqdn -o tsv 2>/dev/null || true)"
create_or_update tapiro-api-internal 3000 external 0.25 0.5Gi \
  "$COMMON_SECRETS auth0-m2m-secret=$AUTH0_M2M_CLIENT_SECRET" \
  "NODE_ENV=production PORT=3000 MONGODB_URI=secretref:mongodb-uri DB_NAME=tapiro \
   REDIS_URL=secretref:redis-url FRONTEND_URL=https://$WEB_HOST \
   BASE_URL=https://${INTERNAL_FQDN:-pending} \
   AUTH0_DOMAIN=$AUTH0_DOMAIN AUTH0_ISSUER_BASE_URL=https://$AUTH0_DOMAIN AUTH0_AUDIENCE=$AUTH0_AUDIENCE \
   AUTH0_SPA_CLIENT_ID=$AUTH0_SPA_CLIENT_ID AUTH0_M2M_CLIENT_ID=$AUTH0_M2M_CLIENT_ID \
   AUTH0_M2M_CLIENT_SECRET=secretref:auth0-m2m-secret \
   AUTH0_USER_ROLE_ID=$AUTH0_USER_ROLE_ID AUTH0_STORE_ROLE_ID=$AUTH0_STORE_ROLE_ID \
   AI_SERVICE_URL=http://tapiro-ml/api AI_SERVICE_API_KEY=secretref:ai-key \
   EXTERNAL_API_URL=http://tapiro-api-external"
INTERNAL_FQDN="$(az containerapp show -n tapiro-api-internal -g "$RG" --query properties.configuration.ingress.fqdn -o tsv)"
az containerapp update -n tapiro-api-internal -g "$RG" --set-env-vars "BASE_URL=https://$INTERNAL_FQDN" -o none
EXTERNAL_FQDN="$(az containerapp show -n tapiro-api-external -g "$RG" --query properties.configuration.ingress.fqdn -o tsv)"

echo "== GitHub Actions login (OIDC)"
APP_NAME="github-deploy-portfolio"
APP_ID="$(az ad app list --display-name "$APP_NAME" --query '[0].appId' -o tsv)"
if [ -z "$APP_ID" ]; then
  APP_ID="$(az ad app create --display-name "$APP_NAME" --query appId -o tsv)"
  az ad sp create --id "$APP_ID" -o none
fi
CRED_NAME="$(echo "$REPO-$BRANCH" | tr '/' '-' | tr '[:upper:]' '[:lower:]')"
if ! az ad app federated-credential list --id "$APP_ID" --query "[?name=='$CRED_NAME']" -o tsv | grep -q .; then
  az ad app federated-credential create --id "$APP_ID" --parameters "{
    \"name\": \"$CRED_NAME\",
    \"issuer\": \"https://token.actions.githubusercontent.com\",
    \"subject\": \"repo:$REPO:ref:refs/heads/$BRANCH\",
    \"audiences\": [\"api://AzureADTokenExchange\"]
  }" -o none
fi
az role assignment create --assignee "$APP_ID" --role Contributor \
  --scope "/subscriptions/$SUBSCRIPTION_ID/resourceGroups/$RG" -o none 2>/dev/null || true

cat <<EOF

Done. Add these to GitHub: $REPO > Settings > Secrets and variables > Actions

Variables:
  AZURE_CLIENT_ID=$APP_ID
  AZURE_TENANT_ID=$TENANT_ID
  AZURE_SUBSCRIPTION_ID=$SUBSCRIPTION_ID
  AZURE_RESOURCE_GROUP=$RG
  VITE_API_URL=https://$INTERNAL_FQDN
  VITE_STORE_API_URL=https://$EXTERNAL_FQDN
  VITE_AUTH0_DOMAIN=$AUTH0_DOMAIN
  VITE_AUTH0_CLIENT_ID=$AUTH0_SPA_CLIENT_ID
  VITE_AUTH0_AUDIENCE=$AUTH0_AUDIENCE
  DEMO_USER_EMAIL=demo.user@tapiro.demo
  DEMO_STORE_EMAIL=demo.store@tapiro.demo

Secrets:
  SWA_TOKEN_WEB=\$(az staticwebapp secrets list -n tapiro-web -g $RG --query properties.apiKey -o tsv)
  SWA_TOKEN_DEMO=\$(az staticwebapp secrets list -n tapiro-demo-store -g $RG --query properties.apiKey -o tsv)
  MONGODB_URI, AUTH0_M2M_CLIENT_SECRET (same values as above)
  AUTH0_M2M_CLIENT_ID, AUTH0_USER_ROLE_ID, AUTH0_STORE_ROLE_ID
  DEMO_USER_PASSWORD, DEMO_STORE_PASSWORD   (shown on the home page, so pick throwaway ones)
  DEMO_STORE_API_KEY                        (openssl rand -hex 32)

In Auth0 > Applications > your SPA, add https://$WEB_HOST to
Allowed Callback URLs, Allowed Logout URLs and Allowed Web Origins.

Site:      https://$WEB_HOST
Demo shop: https://$DEMO_HOST
EOF
