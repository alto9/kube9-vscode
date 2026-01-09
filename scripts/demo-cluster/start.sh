#!/usr/bin/env bash
set -e

PROFILE="kube9-demo"
KUBECONFIG_DIR="./demo-cluster"
KUBECONFIG_FILE="${KUBECONFIG_DIR}/kubeconfig"

# Check if Minikube is installed
if ! command -v minikube &> /dev/null; then
    echo "Error: Minikube not found. Please install Minikube:"
    echo "  macOS: brew install minikube"
    echo "  Linux: https://minikube.sigs.k8s.io/docs/start/"
    exit 1
fi

# Check if cluster already exists
if minikube status --profile="${PROFILE}" &> /dev/null; then
    echo "Demo cluster is already running"
    echo "Kubeconfig: ${KUBECONFIG_FILE}"
    echo ""
    echo "To populate with a scenario, run:"
    echo "  ./scripts/demo-cluster/populate.sh <scenario-name>"
    exit 0
fi

# Create kubeconfig directory
mkdir -p "${KUBECONFIG_DIR}"

# Start Minikube cluster
echo "Starting demo cluster (profile: ${PROFILE})..."
minikube start \
    --profile="${PROFILE}" \
    --cpus=2 \
    --memory=4096 \
    --driver=docker \
    --kubernetes-version=stable

# Export isolated kubeconfig
echo "Exporting isolated kubeconfig..."
MINIKUBE_KUBECONFIG=$(minikube kubectl --profile="${PROFILE}" -- config view --flatten --minify)
echo "${MINIKUBE_KUBECONFIG}" > "${KUBECONFIG_FILE}"

echo ""
echo "✓ Demo cluster started successfully"
echo "✓ Kubeconfig: ${KUBECONFIG_FILE}"
echo ""
echo "Available scenarios:"
echo "  - with-operator    : Cluster with kube9-operator deployed"
echo "  - without-operator : Cluster without operator (Free Tier)"
echo "  - healthy          : All workloads in healthy state"
echo "  - degraded         : Various workloads in error states"
echo ""
echo "To populate with a scenario, run:"
echo "  ./scripts/demo-cluster/populate.sh <scenario-name>"
echo ""
echo "To use this cluster in VS Code, run the debug configuration:"
echo "  'Extension (Demo Cluster)'"
