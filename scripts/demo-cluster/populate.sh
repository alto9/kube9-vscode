#!/usr/bin/env bash
set -e

PROFILE="kube9-demo"
KUBECONFIG_FILE="./demo-cluster/kubeconfig"
SCENARIOS_DIR="./scripts/demo-cluster/scenarios"

# Show usage if no arguments
if [ $# -eq 0 ]; then
    echo "Usage: $0 <scenario-name>"
    echo ""
    echo "Available scenarios:"
    echo "  with-operator    - Cluster with kube9-operator deployed"
    echo "  without-operator - Cluster without operator (Free Tier)"
    echo "  healthy          - All workloads in healthy state"
    echo "  degraded         - Various workloads in error states"
    echo ""
    echo "Example:"
    echo "  $0 with-operator"
    exit 1
fi

SCENARIO_NAME="$1"
SCENARIO_FILE="${SCENARIOS_DIR}/${SCENARIO_NAME}.yaml"

# Check if Minikube is installed
if ! command -v minikube &> /dev/null; then
    echo "Error: Minikube not found. Please install Minikube:"
    echo "  macOS: brew install minikube"
    echo "  Linux: https://minikube.sigs.k8s.io/docs/start/"
    exit 1
fi

# Check if kubectl is installed
if ! command -v kubectl &> /dev/null; then
    echo "Error: kubectl not found. Please install kubectl:"
    echo "  https://kubernetes.io/docs/tasks/tools/"
    exit 1
fi

# Validate scenario exists
if [ ! -f "${SCENARIO_FILE}" ]; then
    echo "Error: Scenario '${SCENARIO_NAME}' not found"
    echo "File does not exist: ${SCENARIO_FILE}"
    echo ""
    echo "Available scenarios:"
    if [ -d "${SCENARIOS_DIR}" ]; then
        for scenario in "${SCENARIOS_DIR}"/*.yaml; do
            if [ -f "${scenario}" ]; then
                basename=$(basename "${scenario}" .yaml)
                echo "  - ${basename}"
            fi
        done
    fi
    exit 1
fi

# Check if Minikube cluster is running
if ! minikube status --profile="${PROFILE}" &> /dev/null; then
    echo "Error: Demo cluster is not running"
    echo "Start it first: ./scripts/demo-cluster/start.sh"
    exit 1
fi

# Check if kubeconfig exists
if [ ! -f "${KUBECONFIG_FILE}" ]; then
    echo "Error: Kubeconfig not found: ${KUBECONFIG_FILE}"
    exit 1
fi

# Check if cluster has existing resources (except kube-system)
export KUBECONFIG="${KUBECONFIG_FILE}"
RESOURCE_COUNT=$(kubectl get all --all-namespaces --ignore-not-found 2>/dev/null | grep -v "kube-system" | grep -v "^NAME" | wc -l | tr -d ' ')

if [ "${RESOURCE_COUNT}" -gt 0 ]; then
    echo "Warning: Demo cluster contains existing resources"
    echo ""
    read -p "Delete all existing resources before deploying scenario? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "Cleaning up existing resources..."
        
        # Delete all namespaces except system namespaces
        # Try using jq if available, otherwise use grep/awk
        if command -v jq &> /dev/null; then
            kubectl get namespaces -o json 2>/dev/null | \
                jq -r '.items[] | select(.metadata.name | IN("kube-system", "kube-public", "kube-node-lease", "default") | not) | .metadata.name' | \
                while read -r ns; do
                    if [ -n "${ns}" ]; then
                        kubectl delete namespace "${ns}" --wait=false 2>/dev/null || true
                    fi
                done
        else
            # Fallback: use kubectl output parsing
            kubectl get namespaces -o name 2>/dev/null | \
                grep -v "namespace/kube-system" | \
                grep -v "namespace/kube-public" | \
                grep -v "namespace/kube-node-lease" | \
                grep -v "namespace/default" | \
                sed 's/namespace\///' | \
                while read -r ns; do
                    if [ -n "${ns}" ]; then
                        kubectl delete namespace "${ns}" --wait=false 2>/dev/null || true
                    fi
                done
        fi
        
        # Delete resources in default namespace
        kubectl delete all --all -n default --wait=false 2>/dev/null || true
        
        echo "Waiting for cleanup to complete..."
        sleep 5
    fi
fi

# Apply scenario
echo "Deploying scenario: ${SCENARIO_NAME}..."
kubectl apply -f "${SCENARIO_FILE}"

# Wait for resources to be created
echo "Waiting for resources to be created..."
sleep 3

# Show deployed resources
echo ""
echo "✓ Scenario '${SCENARIO_NAME}' deployed successfully"
echo ""
echo "Created resources:"
kubectl get all --all-namespaces 2>/dev/null | grep -v "kube-system" || echo "No resources created yet (may be pending)"

echo ""
echo "To view the cluster in VS Code, run the debug configuration:"
echo "  'Extension (Demo Cluster)'"
