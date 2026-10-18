#!/usr/bin/env bash
# Builds the API image and deploys API + Mongo to a local kind cluster.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CLUSTER_NAME="${CLUSTER_NAME:-skillswap}"
IMAGE="${IMAGE:-skillswap-api:local}"

for cmd in docker kind kubectl; do
  command -v "$cmd" >/dev/null || { echo "install $cmd first"; exit 1; }
done

if ! kind get clusters 2>/dev/null | grep -qx "$CLUSTER_NAME"; then
  kind create cluster --name "$CLUSTER_NAME"
fi

echo "building $IMAGE"
docker build -t "$IMAGE" "$ROOT/backend"

echo "loading image into kind"
kind load docker-image "$IMAGE" --name "$CLUSTER_NAME"

kubectl apply -f "$ROOT/deploy/k8s/namespace.yaml"
kubectl apply -f "$ROOT/deploy/k8s/configmap.yaml"

kubectl -n skillswap create secret generic skillswap-api-secrets \
  --from-literal=JWT_SECRET="local-dev-jwt-secret-change-me-please-32chars" \
  --from-literal=MONGODB_URI="mongodb://mongodb:27017/skillswap" \
  --dry-run=client -o yaml | kubectl apply -f -

kubectl apply -f "$ROOT/deploy/k8s/mongodb.yaml"

TMP="$(mktemp)"
sed "s|image: skillswap-api:local|image: ${IMAGE}|" \
  "$ROOT/deploy/k8s/api.yaml" > "$TMP"
kubectl apply -f "$TMP"
rm -f "$TMP"

kubectl -n skillswap rollout status deploy/mongodb --timeout=180s
kubectl -n skillswap rollout status deploy/skillswap-api --timeout=180s

echo "done"
echo "kubectl -n skillswap port-forward svc/skillswap-api 5000:5000"
echo "curl http://localhost:5000/api/health"
echo "rollback: kubectl -n skillswap rollout undo deploy/skillswap-api"
