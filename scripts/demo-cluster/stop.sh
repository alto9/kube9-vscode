#!/usr/bin/env bash
set -e

PROFILE="kube9-demo"

# Check if Minikube is installed
if ! command -v minikube &> /dev/null; then
    echo "Error: Minikube not found. Please install Minikube:"
    echo "  macOS: brew install minikube"
    echo "  Linux: https://minikube.sigs.k8s.io/docs/start/"
    exit 1
fi

# Check if cluster is running
if ! minikube status --profile="${PROFILE}" &> /dev/null; then
    echo "Demo cluster is not running"
    echo ""
    echo "To start the cluster, run:"
    echo "  ./scripts/demo-cluster/start.sh"
    exit 0
fi

# Stop Minikube cluster
echo "Stopping demo cluster (profile: ${PROFILE})..."
minikube stop --profile="${PROFILE}"

echo ""
echo "✓ Demo cluster stopped successfully"
echo "✓ Cluster state has been preserved"
echo ""
echo "To restart the cluster, run:"
echo "  ./scripts/demo-cluster/start.sh"
echo ""
echo "Note: All cluster data and configurations will be restored when you restart."
