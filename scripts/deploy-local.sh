#!/usr/bin/env bash
set -e

cd "$(dirname "$0")/.."

if ! kind get clusters 2>/dev/null | grep -q skillswap; then
  kind create cluster --name skillswap
fi

docker build -t skillswap-api:local backend/
kind load docker-image skillswap-api:local --name skillswap

kubectl apply -f deploy/k8s/namespace.yaml
kubectl apply -f deploy/k8s/configmap.yaml

kubectl -n skillswap create secret generic skillswap-api-secrets \
  --from-literal=JWT_SECRET=local-dev-secret-change-me \
  --from-literal=MONGODB_URI=mongodb://mongodb:27017/skillswap \
  --dry-run=client -o yaml | kubectl apply -f -

kubectl apply -f deploy/k8s/mongodb.yaml
kubectl apply -f deploy/k8s/api.yaml

kubectl -n skillswap rollout status deploy/mongodb
kubectl -n skillswap rollout status deploy/skillswap-api

echo "port-forward: kubectl -n skillswap port-forward svc/skillswap-api 5000:5000"
echo "health: curl http://localhost:5000/api/health"
echo "rollback: kubectl -n skillswap rollout undo deploy/skillswap-api"
