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

# Check if Helm is installed (required for with-operator scenario)
if [ "${SCENARIO_NAME}" = "with-operator" ]; then
    if ! command -v helm &> /dev/null; then
        echo "Error: Helm not found. Helm is required for with-operator scenario."
        echo "  macOS: brew install helm"
        echo "  Linux: https://helm.sh/docs/intro/install/"
        exit 1
    fi
fi

# Validate scenario exists (or handle special cases)
if [ "${SCENARIO_NAME}" = "with-operator" ]; then
    # with-operator uses Helm + workloads file
    WORKLOADS_FILE="${SCENARIOS_DIR}/with-operator-workloads.yaml"
    if [ ! -f "${WORKLOADS_FILE}" ]; then
        echo "Error: Workloads file not found: ${WORKLOADS_FILE}"
        exit 1
    fi
elif [ ! -f "${SCENARIO_FILE}" ]; then
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
        
        # Uninstall Helm releases if any exist
        if command -v helm &> /dev/null; then
            HELM_RELEASES=$(helm list --all-namespaces -q 2>/dev/null || true)
            if [ -n "${HELM_RELEASES}" ]; then
                echo "Uninstalling Helm releases..."
                while IFS= read -r release; do
                    if [ -n "${release}" ]; then
                        RELEASE_NAMESPACE=$(helm list --all-namespaces -f "^${release}$" -o json 2>/dev/null | jq -r '.[0].namespace' 2>/dev/null || echo "")
                        if [ -n "${RELEASE_NAMESPACE}" ]; then
                            echo "  Uninstalling ${release} from ${RELEASE_NAMESPACE}..."
                            helm uninstall "${release}" --namespace "${RELEASE_NAMESPACE}" --wait 2>/dev/null || true
                        fi
                    fi
                done <<< "${HELM_RELEASES}"
            fi
        fi
        
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

# Deploy scenario
echo "Deploying scenario: ${SCENARIO_NAME}..."

if [ "${SCENARIO_NAME}" = "with-operator" ]; then
    # Install kube9-operator via Helm
    OPERATOR_CHART_PATH="../kube9-operator/charts/kube9-operator"
    
    # Check if chart path exists
    if [ ! -d "${OPERATOR_CHART_PATH}" ]; then
        echo "Error: kube9-operator chart not found at ${OPERATOR_CHART_PATH}"
        echo "Make sure kube9-operator repository is cloned at the expected location"
        exit 1
    fi
    
    echo "Installing kube9-operator via Helm..."
    helm install kube9-operator "${OPERATOR_CHART_PATH}" \
        --namespace kube9-system \
        --create-namespace \
        --wait \
        --timeout 5m
    
    echo ""
    echo "✓ kube9-operator installed successfully"
    echo ""
    
    # Apply demo workloads
    echo "Deploying demo workloads..."
    kubectl apply -f "${WORKLOADS_FILE}"
    
    # Wait for resources to be created
    echo "Waiting for resources to be created..."
    sleep 3
else
    # Standard scenario - apply YAML
    kubectl apply -f "${SCENARIO_FILE}"
    
    # Wait for resources to be created
    echo "Waiting for resources to be created..."
    sleep 3
fi

# Show deployed resources
echo ""
echo "✓ Scenario '${SCENARIO_NAME}' deployed successfully"
echo ""
echo "Created resources:"
kubectl get all --all-namespaces 2>/dev/null | grep -v "kube-system" || echo "No resources created yet (may be pending)"

echo ""
echo "To view the cluster in VS Code, run the debug configuration:"
echo "  'Extension (Demo Cluster)'"
