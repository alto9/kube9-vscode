/**
 * Main JavaScript for namespace webview panel.
 * Handles user interactions, message passing with extension, and UI state management.
 */

(function() {
    'use strict';

    // Update UI based on whether this is "All Namespaces" view
    const isAllNamespaces = window.initialIsAllNamespaces || false;
    
    if (isAllNamespaces) {
        const icon = document.getElementById('namespace-icon');
        const badge = document.getElementById('scope-badge');
        
        if (icon) {
            icon.classList.add('all-namespaces');
        }
        
        if (badge) {
            badge.textContent = 'CLUSTER-WIDE';
        }
    }

    // Set up message passing for communication with extension
    const vscode = acquireVsCodeApi();

    // Get button elements
    const setDefaultNamespaceButton = document.getElementById('set-default-namespace');
    const btnIcon = setDefaultNamespaceButton?.querySelector('.btn-icon');
    const btnText = setDefaultNamespaceButton?.querySelector('.btn-text');
    const namespaceTitle = document.querySelector('h1.namespace-title');

    /**
     * Update the button state based on whether the namespace is active.
     * 
     * @param {boolean} isActive - Whether this namespace is the active/default namespace
     * @param {string} namespaceName - The namespace name (for validation/logging)
     */
    function updateButtonState(isActive, namespaceName) {
        if (!setDefaultNamespaceButton || !btnIcon || !btnText) {
            console.warn('Button elements not found, cannot update state');
            return;
        }

        if (isActive) {
            // Namespace is active - show disabled/selected state
            setDefaultNamespaceButton.disabled = true;
            btnIcon.style.display = 'inline';
            btnIcon.classList.remove('hidden');
            btnText.textContent = 'Default Namespace';
        } else {
            // Namespace is not active - show enabled state
            setDefaultNamespaceButton.disabled = false;
            btnIcon.style.display = 'none';
            btnIcon.classList.add('hidden');
            btnText.textContent = 'Set as Default Namespace';
        }
    }

    /**
     * Send a refresh request to the extension.
     */
    function refresh() {
        vscode.postMessage({
            command: 'refresh'
        });
    }

    /**
     * Send a request to open a specific resource.
     * 
     * @param {string} resourceType - The type of resource (e.g., 'pod', 'deployment')
     * @param {string} resourceName - The name of the resource
     */
    function openResource(resourceType, resourceName) {
        vscode.postMessage({
            command: 'openResource',
            data: {
                type: resourceType,
                name: resourceName
            }
        });
    }

    /**
     * Select a workload type and update pill selector UI state.
     * Sends a fetchWorkloads message to the extension to load workload data.
     * 
     * @param {string} workloadType - The workload type to select (e.g., 'deployments', 'statefulsets')
     */
    function selectWorkloadType(workloadType) {
        // Remove active class from all pills
        const allPills = document.querySelectorAll('.pill-selector');
        allPills.forEach(pill => pill.classList.remove('active'));
        
        // Add active class to clicked pill
        const activePill = document.querySelector(`[data-workload-type="${workloadType}"]`);
        if (activePill) {
            activePill.classList.add('active');
        }
        
        // Send fetchWorkloads message to extension
        vscode.postMessage({
            command: 'fetchWorkloads',
            data: { workloadType }
        });
    }

    /**
     * Render the workloads table with data received from the extension.
     * Clears existing rows and generates new rows for each workload, or shows empty state.
     * 
     * @param {Object} data - WorkloadsTableData object containing workloads array and metadata
     */
    function renderWorkloadsTable(data) {
        const tbody = document.getElementById('workloads-tbody');
        
        // Clear existing rows
        tbody.innerHTML = '';
        
        // Check if workloads array is empty
        if (!data.workloads || data.workloads.length === 0) {
            showEmptyState(data.workloadType);
            return;
        }
        
        // Hide empty state if visible and show table
        hideEmptyState();
        
        // Create row for each workload
        data.workloads.forEach(workload => {
            const row = createWorkloadRow(workload);
            tbody.appendChild(row);
        });
    }

    /**
     * Create a table row element for a single workload entry.
     * 
     * @param {Object} workload - WorkloadEntry object with name, namespace, health, and replica info
     * @returns {HTMLTableRowElement} The created table row element
     */
    function createWorkloadRow(workload) {
        const tr = document.createElement('tr');
        tr.className = 'workload-row';
        tr.setAttribute('data-workload-name', workload.name);
        tr.setAttribute('data-workload-type', workload.workloadType || '');
        
        // Name column
        const nameTd = document.createElement('td');
        nameTd.className = 'workload-name';
        nameTd.textContent = workload.name;
        tr.appendChild(nameTd);
        
        // Namespace column
        const namespaceTd = document.createElement('td');
        namespaceTd.className = 'workload-namespace';
        namespaceTd.textContent = workload.namespace;
        tr.appendChild(namespaceTd);
        
        // Health column
        const healthTd = document.createElement('td');
        healthTd.className = 'workload-health';
        
        const healthIndicator = document.createElement('span');
        healthIndicator.className = `health-indicator ${getHealthIndicatorClass(workload.health.status)}`;
        healthIndicator.textContent = '●';
        
        const healthText = document.createElement('span');
        healthText.className = 'health-text';
        healthText.textContent = workload.health.status;
        
        healthTd.appendChild(healthIndicator);
        healthTd.appendChild(healthText);
        tr.appendChild(healthTd);
        
        // Replicas column
        const replicasTd = document.createElement('td');
        replicasTd.className = 'workload-replicas';
        replicasTd.textContent = `${workload.readyReplicas}/${workload.desiredReplicas}`;
        tr.appendChild(replicasTd);
        
        return tr;
    }

    /**
     * Map health status to CSS class name.
     * 
     * @param {string} status - HealthStatus ('Healthy', 'Degraded', 'Unhealthy', 'Unknown')
     * @returns {string} CSS class name for the health indicator
     */
    function getHealthIndicatorClass(status) {
        const statusMap = {
            'Healthy': 'healthy',
            'Degraded': 'degraded',
            'Unhealthy': 'unhealthy',
            'Unknown': 'unknown'
        };
        return statusMap[status] || 'unknown';
    }

    /**
     * Display empty state message when no workloads of the selected type exist.
     * 
     * @param {string} workloadType - The workload type ('Deployment', 'StatefulSet', 'DaemonSet', 'CronJob')
     */
    function showEmptyState(workloadType) {
        const tableContainer = document.querySelector('.table-container');
        const emptyState = document.querySelector('.empty-state');
        const emptyMessage = document.getElementById('empty-message');
        
        // Hide table
        if (tableContainer) {
            tableContainer.style.display = 'none';
        }
        
        // Show empty state
        if (emptyState) {
            emptyState.style.display = 'block';
        }
        
        // Set type-specific message
        if (emptyMessage) {
            const typeMessages = {
                'Deployment': 'No deployments found in this namespace',
                'StatefulSet': 'No statefulsets found in this namespace',
                'DaemonSet': 'No daemonsets found in this namespace',
                'CronJob': 'No cronjobs found in this namespace'
            };
            emptyMessage.textContent = typeMessages[workloadType] || 'No workloads found in this namespace';
        }
    }

    /**
     * Hide the empty state and show the table container.
     */
    function hideEmptyState() {
        const tableContainer = document.querySelector('.table-container');
        const emptyState = document.querySelector('.empty-state');
        
        // Hide empty state
        if (emptyState) {
            emptyState.style.display = 'none';
        }
        
        // Show table container
        if (tableContainer) {
            tableContainer.style.display = 'block';
        }
    }

    // Notification management
    let notificationTimeout = null;
    const notificationElement = document.getElementById('context-notification');
    const notificationMessageElement = document.getElementById('notification-message');
    const notificationCloseButton = document.getElementById('notification-close');

    /**
     * Show a notification banner with a message.
     * The notification will auto-dismiss after 5 seconds.
     * 
     * @param {string} message - The message to display in the notification
     */
    function showNotification(message) {
        // Clear any existing timeout to prevent premature dismissal
        if (notificationTimeout) {
            clearTimeout(notificationTimeout);
            notificationTimeout = null;
        }

        // Set the message text
        notificationMessageElement.textContent = message;

        // Remove hide class if present and add show class
        notificationElement.classList.remove('hide');
        notificationElement.classList.add('show');

        // Set timeout to auto-dismiss after 5 seconds
        notificationTimeout = setTimeout(() => {
            hideNotification();
        }, 5000);
    }

    /**
     * Hide the notification banner.
     * Adds fade-out animation before fully hiding.
     */
    function hideNotification() {
        // Clear any pending timeout
        if (notificationTimeout) {
            clearTimeout(notificationTimeout);
            notificationTimeout = null;
        }

        // Add hide class to trigger fade-out
        notificationElement.classList.add('hide');

        // After transition completes, remove show class
        setTimeout(() => {
            notificationElement.classList.remove('show');
            notificationElement.classList.remove('hide');
        }, 300); // Match the CSS transition duration
    }

    // Handle notification close button click
    notificationCloseButton.addEventListener('click', () => {
        hideNotification();
    });

    // Handle button click for setting default namespace
    if (setDefaultNamespaceButton) {
        setDefaultNamespaceButton.addEventListener('click', () => {
            // Prevent action if button is disabled
            if (setDefaultNamespaceButton.disabled) {
                return;
            }

            // Read namespace name from the title element
            const namespaceName = namespaceTitle?.textContent?.trim();
            
            // For "All Namespaces" view, don't allow setting as default
            if (isAllNamespaces || !namespaceName || namespaceName === 'All Namespaces') {
                return;
            }

            // Send setActiveNamespace message to extension
            vscode.postMessage({
                command: 'setActiveNamespace',
                data: {
                    namespace: namespaceName,
                    contextName: window.initialContextName
                }
            });
        });
    }

    // Handle button click for viewing namespace YAML
    const viewNamespaceYamlButton = document.getElementById('view-namespace-yaml');
    if (viewNamespaceYamlButton) {
        viewNamespaceYamlButton.addEventListener('click', () => {
            // Read namespace name from the title element
            const namespaceName = namespaceTitle?.textContent?.trim();
            
            // For "All Namespaces" view, don't show YAML
            if (isAllNamespaces || !namespaceName || namespaceName === 'All Namespaces') {
                return;
            }

            // Send openYAML message to extension
            vscode.postMessage({
                command: 'openYAML',
                resource: {
                    kind: 'Namespace',
                    name: namespaceName,
                    apiVersion: 'v1'
                }
            });
        });
    }

    // Initialize pill selector event listeners
    const pillSelectors = document.querySelectorAll('.pill-selector');
    pillSelectors.forEach(pill => {
        pill.addEventListener('click', () => {
            const workloadType = pill.getAttribute('data-workload-type');
            if (workloadType) {
                selectWorkloadType(workloadType);
            }
        });
    });

    // Handle incoming messages from extension
    window.addEventListener('message', event => {
        const message = event.data;
        
        switch (message.command) {
            case 'namespaceData':
                // Namespace data is no longer needed for dropdown, but we keep the handler
                // in case it's used for other purposes
                break;
            
            case 'namespaceContextChanged':
                // Validate message data exists
                if (!message.data) {
                    console.warn('namespaceContextChanged message missing data property');
                    break;
                }
                
                // Extract isActive flag - ensure it's a boolean
                // Default to false if missing, undefined, or not a boolean
                const isActive = typeof message.data.isActive === 'boolean' 
                    ? message.data.isActive 
                    : false;
                
                // Get namespace name from title element for validation/logging
                const namespaceName = namespaceTitle?.textContent?.trim();
                
                // Update button state based on isActive flag
                // This handles transitions: enabled ↔ disabled/selected
                updateButtonState(isActive, namespaceName);
                
                // Show notification if the change was external
                if (message.data.source === 'external') {
                    let notificationMessage;
                    if (message.data.namespace) {
                        // Format matches story requirement: "Namespace context changed externally to: <namespace>"
                        notificationMessage = `Namespace context changed externally to: ${message.data.namespace}`;
                    } else {
                        notificationMessage = 'Namespace context cleared externally';
                    }
                    showNotification(notificationMessage);
                }
                // Note: Handler intentionally does not trigger resource refreshes
                // to avoid unnecessary reloads when namespace context changes
                break;
            
            case 'workloadsData':
                if (message.data) {
                    renderWorkloadsTable(message.data);
                }
                break;
            
            case 'resourceUpdated':
                // Resource was updated (e.g., via YAML editor save)
                // Refresh the current workload view to reflect changes
                console.log('Resource updated, refreshing workload data');
                
                // Get the currently selected workload type pill
                const selectedPill = document.querySelector('.workload-type-pill.selected');
                if (selectedPill) {
                    const workloadType = selectedPill.dataset.type;
                    console.log(`Fetching updated workload data for type: ${workloadType}`);
                    
                    // Request fresh workload data from extension
                    vscode.postMessage({
                        command: 'fetchWorkloads',
                        data: { workloadType }
                    });
                } else {
                    console.log('No workload type selected, skipping refresh');
                }
                break;
        }
    });

    // Store functions in global scope for future use
    window.kube9Namespace = {
        refresh,
        openResource,
        updateButtonState,
        selectWorkloadType,
        renderWorkloadsTable,
        showEmptyState,
        hideEmptyState
    };

    // Initialize button state on load
    // For "All Namespaces" view, disable the button
    // For regular namespace view, start with disabled state (will be updated when first message arrives)
    if (isAllNamespaces) {
        // Disable button for "All Namespaces" view
        if (setDefaultNamespaceButton) {
            setDefaultNamespaceButton.disabled = true;
            if (btnIcon) {
                btnIcon.style.display = 'none';
                btnIcon.classList.add('hidden');
            }
            if (btnText) {
                btnText.textContent = 'Set as Default Namespace';
            }
        }
    } else {
        // Initialize with inactive state (will be updated by first namespaceContextChanged message)
        const initialNamespaceName = namespaceTitle?.textContent?.trim();
        if (initialNamespaceName) {
            updateButtonState(false, initialNamespaceName);
        }
    }

    // Automatically fetch workloads for the initially active tab (deployments)
    // This ensures data is loaded when the webview first opens
    const initialActivePill = document.querySelector('.pill-selector.active');
    if (initialActivePill) {
        const workloadType = initialActivePill.getAttribute('data-workload-type');
        if (workloadType) {
            // Fetch workloads for the initially selected type
            selectWorkloadType(workloadType);
        }
    }
})();
