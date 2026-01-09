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

# Prompt for confirmation
echo "WARNING: This will DELETE the demo cluster and all its resources."
echo "Profile: ${PROFILE}"
echo ""
read -p "Are you sure you want to continue? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Reset cancelled"
    exit 0
fi

# Delete existing cluster if it exists
if minikube status --profile="${PROFILE}" &> /dev/null; then
    echo "Deleting existing demo cluster..."
    minikube delete --profile="${PROFILE}"
fi

# Remove old kubeconfig
rm -f "${KUBECONFIG_FILE}"

# Create fresh cluster
echo "Creating fresh demo cluster..."
minikube start \
    --profile="${PROFILE}" \
    --cpus=2 \
    --memory=4096 \
    --driver=docker \
    --kubernetes-version=stable

# Export isolated kubeconfig
echo "Exporting isolated kubeconfig..."
mkdir -p "${KUBECONFIG_DIR}"
MINIKUBE_KUBECONFIG=$(minikube kubectl --profile="${PROFILE}" -- config view --flatten --minify)
echo "${MINIKUBE_KUBECONFIG}" > "${KUBECONFIG_FILE}"

echo ""
echo "✓ Demo cluster reset complete"
echo "✓ Kubeconfig: ${KUBECONFIG_FILE}"
echo ""
echo "To populate with a scenario, run:"
echo "  ./scripts/demo-cluster/populate.sh <scenario-name>"
