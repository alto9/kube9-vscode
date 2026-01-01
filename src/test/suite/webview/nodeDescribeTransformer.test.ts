import * as assert from 'assert';
import * as k8s from '@kubernetes/client-node';
import { transformNodeData } from '../../../webview/nodeDescribeTransformer';

/**
 * Helper function to create a complete mock V1Node with all fields populated.
 */
function createMockV1Node(): k8s.V1Node {
    const now = new Date();
    const creationTimestamp = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); // 7 days ago
    
    return {
        metadata: {
            name: 'test-node',
            creationTimestamp: creationTimestamp,
            labels: {
                'node-role.kubernetes.io/control-plane': 'true',
                'kubernetes.io/arch': 'amd64',
                'kubernetes.io/os': 'linux',
                'test-label': 'test-value'
            }
        },
        spec: {
            taints: [
                {
                    key: 'test-taint',
                    value: 'test-value',
                    effect: 'NoSchedule'
                }
            ]
        },
        status: {
            conditions: [
                {
                    type: 'Ready',
                    status: 'True',
                    reason: 'KubeletReady',
                    message: 'kubelet is posting ready status',
                    lastTransitionTime: new Date(now.getTime() - 2 * 60 * 60 * 1000) // 2 hours ago
                },
                {
                    type: 'MemoryPressure',
                    status: 'False',
                    reason: 'KubeletHasSufficientMemory',
                    message: 'kubelet has sufficient memory available',
                    lastTransitionTime: new Date(now.getTime() - 1 * 60 * 60 * 1000) // 1 hour ago
                }
            ],
            addresses: [
                {
                    type: 'InternalIP',
                    address: '10.0.0.1'
                },
                {
                    type: 'Hostname',
                    address: 'test-node'
                }
            ],
            capacity: {
                cpu: '4',
                memory: '8Gi',
                pods: '110',
                'ephemeral-storage': '20Gi'
            },
            allocatable: {
                cpu: '3.5',
                memory: '7Gi',
                pods: '110',
                'ephemeral-storage': '20Gi'
            },
            nodeInfo: {
                machineID: 'test-machine-id',
                systemUUID: 'test-system-uuid',
                bootID: 'test-boot-id',
                kernelVersion: '5.4.0',
                osImage: 'Ubuntu 20.04',
                containerRuntimeVersion: 'containerd://1.4.0',
                kubeletVersion: 'v1.20.0',
                kubeProxyVersion: 'v1.20.0',
                operatingSystem: 'linux',
                architecture: 'amd64'
            }
        }
    };
}

/**
 * Helper function to create a minimal mock V1Node with only required fields.
 */
function createMockV1NodeMinimal(): k8s.V1Node {
    return {
        metadata: {
            name: 'minimal-node'
        },
        status: {
            capacity: {},
            allocatable: {},
            nodeInfo: {
                architecture: '',
                bootID: '',
                containerRuntimeVersion: '',
                kernelVersion: '',
                kubeletVersion: '',
                kubeProxyVersion: '',
                machineID: '',
                operatingSystem: '',
                osImage: '',
                systemUUID: ''
            }
        }
    };
}

/**
 * Helper function to create a complete mock V1Pod with containers and resources.
 */
function createMockV1Pod(name: string, namespace: string = 'default'): k8s.V1Pod {
    const creationTimestamp = new Date(Date.now() - 2 * 60 * 60 * 1000); // 2 hours ago
    
    return {
        metadata: {
            name: name,
            namespace: namespace,
            creationTimestamp: creationTimestamp
        },
        spec: {
            containers: [
                {
                    name: 'container1',
                    resources: {
                        requests: {
                            cpu: '500m',
                            memory: '512Mi'
                        },
                        limits: {
                            cpu: '1',
                            memory: '1Gi'
                        }
                    }
                },
                {
                    name: 'container2',
                    resources: {
                        requests: {
                            cpu: '250m',
                            memory: '256Mi'
                        },
                        limits: {
                            cpu: '500m',
                            memory: '512Mi'
                        }
                    }
                }
            ]
        },
        status: {
            phase: 'Running',
            containerStatuses: [
                {
                    name: 'container1',
                    restartCount: 2,
                    ready: true,
                    image: 'test-image:latest',
                    imageID: 'docker://test-image-id'
                },
                {
                    name: 'container2',
                    restartCount: 1,
                    ready: true,
                    image: 'test-image:latest',
                    imageID: 'docker://test-image-id'
                }
            ]
        }
    };
}

/**
 * Helper function to create a minimal mock V1Pod.
 */
function createMockV1PodMinimal(name: string, namespace: string = 'default'): k8s.V1Pod {
    return {
        metadata: {
            name: name,
            namespace: namespace
        },
        spec: {
            containers: []
        },
        status: {
            phase: 'Pending'
        }
    };
}

suite('nodeDescribeTransformer Tests', () => {
    suite('transformNodeData', () => {
        test('should transform complete V1Node with all fields', () => {
            const mockNode = createMockV1Node();
            const mockPods: k8s.V1Pod[] = [];
            
            const result = transformNodeData(mockNode, mockPods);
            
            assert.strictEqual(result.name, 'test-node');
            assert.strictEqual(result.overview.name, 'test-node');
            assert.strictEqual(result.overview.status, 'Ready');
            assert.deepStrictEqual(result.overview.roles, ['control-plane']);
            assert.ok(result.overview.creationTimestamp.length > 0);
            assert.strictEqual(result.overview.kubernetesVersion, 'v1.20.0');
            assert.strictEqual(result.overview.containerRuntime, 'containerd://1.4.0');
            assert.strictEqual(result.overview.osImage, 'Ubuntu 20.04');
            assert.strictEqual(result.overview.kernelVersion, '5.4.0');
            assert.strictEqual(result.overview.architecture, 'amd64');
        });

        test('should transform V1Node with missing optional fields', () => {
            const mockNode = createMockV1NodeMinimal();
            const mockPods: k8s.V1Pod[] = [];
            
            const result = transformNodeData(mockNode, mockPods);
            
            assert.strictEqual(result.name, 'minimal-node');
            assert.strictEqual(result.overview.name, 'minimal-node');
            assert.strictEqual(result.overview.status, 'Unknown');
            assert.deepStrictEqual(result.overview.roles, []);
            assert.strictEqual(result.overview.kubernetesVersion, '');
            assert.strictEqual(result.overview.containerRuntime, '');
        });

        test('should calculate resource metrics correctly', () => {
            const mockNode = createMockV1Node();
            const mockPods: k8s.V1Pod[] = [];
            
            const result = transformNodeData(mockNode, mockPods);
            
            // CPU metrics
            assert.strictEqual(result.resources.cpu.capacityRaw, 4);
            assert.strictEqual(result.resources.cpu.allocatableRaw, 3.5);
            assert.strictEqual(result.resources.cpu.usedRaw, 0);
            assert.strictEqual(result.resources.cpu.availableRaw, 3.5);
            assert.strictEqual(result.resources.cpu.unit, 'cores');
            
            // Memory metrics
            assert.strictEqual(result.resources.memory.capacityRaw, 8 * (1024 ** 3));
            assert.strictEqual(result.resources.memory.allocatableRaw, 7 * (1024 ** 3));
            assert.strictEqual(result.resources.memory.unit, 'bytes');
            
            // Pods metrics
            assert.strictEqual(result.resources.pods.capacityRaw, 110);
            assert.strictEqual(result.resources.pods.allocatableRaw, 110);
            assert.strictEqual(result.resources.pods.unit, 'count');
        });

        test('should calculate usage percentages correctly', () => {
            const mockNode = createMockV1Node();
            const mockPods: k8s.V1Pod[] = [
                createMockV1Pod('pod1')
            ];
            
            const result = transformNodeData(mockNode, mockPods);
            
            // CPU usage should be calculated from pod requests
            // Pod1 has 500m + 250m = 750m = 0.75 cores
            // Allocatable is 3.5 cores
            // Usage percentage should be approximately 21% (0.75 / 3.5 * 100)
            assert.ok(result.resources.cpu.usagePercentage >= 20 && result.resources.cpu.usagePercentage <= 25);
        });

        test('should extract addresses correctly', () => {
            const mockNode = createMockV1Node();
            const mockPods: k8s.V1Pod[] = [];
            
            const result = transformNodeData(mockNode, mockPods);
            
            assert.strictEqual(result.addresses.length, 2);
            assert.strictEqual(result.addresses[0].type, 'InternalIP');
            assert.strictEqual(result.addresses[0].address, '10.0.0.1');
            assert.strictEqual(result.addresses[1].type, 'Hostname');
            assert.strictEqual(result.addresses[1].address, 'test-node');
        });

        test('should extract labels correctly', () => {
            const mockNode = createMockV1Node();
            const mockPods: k8s.V1Pod[] = [];
            
            const result = transformNodeData(mockNode, mockPods);
            
            assert.strictEqual(result.labels['node-role.kubernetes.io/control-plane'], 'true');
            assert.strictEqual(result.labels['kubernetes.io/arch'], 'amd64');
            assert.strictEqual(result.labels['test-label'], 'test-value');
        });

        test('should extract taints correctly', () => {
            const mockNode = createMockV1Node();
            const mockPods: k8s.V1Pod[] = [];
            
            const result = transformNodeData(mockNode, mockPods);
            
            assert.strictEqual(result.taints.length, 1);
            assert.strictEqual(result.taints[0].key, 'test-taint');
            assert.strictEqual(result.taints[0].value, 'test-value');
            assert.strictEqual(result.taints[0].effect, 'NoSchedule');
        });

        test('should aggregate pod requests and limits correctly', () => {
            const mockNode = createMockV1Node();
            const mockPods: k8s.V1Pod[] = [
                createMockV1Pod('pod1'),
                createMockV1Pod('pod2')
            ];
            
            const result = transformNodeData(mockNode, mockPods);
            
            // Each pod has: 500m + 250m = 750m CPU requests = 0.75 cores
            // Two pods: 0.75 * 2 = 1.5 cores total requests
            assert.strictEqual(result.allocation.cpu.requestsRaw, 1.5);
            
            // Each pod has: 1 + 0.5 = 1.5 cores limits
            // Two pods: 1.5 * 2 = 3 cores total limits
            assert.strictEqual(result.allocation.cpu.limitsRaw, 3);
            
            // Memory requests: (512Mi + 256Mi) * 2 = 1536Mi = 1.5Gi
            // In bytes: 1.5 * 1024^3
            assert.ok(result.allocation.memory.requestsRaw > 0);
            
            // Check percentages are calculated
            assert.ok(result.allocation.cpu.requestsPercentage >= 0);
            assert.ok(result.allocation.cpu.limitsPercentage >= 0);
        });

        test('should handle empty pod list', () => {
            const mockNode = createMockV1Node();
            const mockPods: k8s.V1Pod[] = [];
            
            const result = transformNodeData(mockNode, mockPods);
            
            assert.strictEqual(result.pods.length, 0);
            assert.strictEqual(result.resources.cpu.usedRaw, 0);
            assert.strictEqual(result.resources.memory.usedRaw, 0);
            assert.strictEqual(result.resources.pods.usedRaw, 0);
            assert.strictEqual(result.allocation.cpu.requestsRaw, 0);
            assert.strictEqual(result.allocation.cpu.limitsRaw, 0);
        });

        test('should handle null/undefined gracefully', () => {
            const mockNode: k8s.V1Node = {
                metadata: undefined,
                status: undefined
            };
            const mockPods: k8s.V1Pod[] = [];
            
            const result = transformNodeData(mockNode, mockPods);
            
            assert.strictEqual(result.name, 'Unknown');
            assert.strictEqual(result.overview.name, 'Unknown');
            assert.strictEqual(result.overview.status, 'Unknown');
            assert.deepStrictEqual(result.labels, {});
            assert.strictEqual(result.addresses.length, 0);
            assert.strictEqual(result.taints.length, 0);
        });

        test('should extract node conditions with relative time', () => {
            const mockNode = createMockV1Node();
            const mockPods: k8s.V1Pod[] = [];
            
            const result = transformNodeData(mockNode, mockPods);
            
            assert.ok(result.conditions.length >= 2);
            const readyCondition = result.conditions.find(c => c.type === 'Ready');
            assert.ok(readyCondition);
            assert.strictEqual(readyCondition!.status, 'True');
            assert.ok(readyCondition!.relativeTime.length > 0);
            assert.match(readyCondition!.relativeTime, /^\d+[hms] ago$/);
        });

        test('should calculate resource allocation percentages', () => {
            const mockNode = createMockV1Node();
            const mockPods: k8s.V1Pod[] = [
                createMockV1Pod('pod1')
            ];
            
            const result = transformNodeData(mockNode, mockPods);
            
            // Allocatable CPU is 3.5 cores
            // Pod requests: 0.75 cores
            // Percentage: ~21%
            assert.ok(result.allocation.cpu.requestsPercentage >= 0);
            assert.ok(result.allocation.cpu.requestsPercentage <= 100);
            assert.ok(result.allocation.cpu.limitsPercentage >= 0);
            assert.ok(result.allocation.cpu.limitsPercentage <= 100);
            assert.ok(result.allocation.memory.requestsPercentage >= 0);
            assert.ok(result.allocation.memory.requestsPercentage <= 100);
        });

        test('should handle pods with no resource requests', () => {
            const mockNode = createMockV1Node();
            const mockPods: k8s.V1Pod[] = [
                createMockV1PodMinimal('pod-no-resources')
            ];
            
            const result = transformNodeData(mockNode, mockPods);
            
            assert.strictEqual(result.pods.length, 1);
            assert.strictEqual(result.pods[0].cpuRequest, '0');
            assert.strictEqual(result.pods[0].cpuRequestRaw, 0);
            assert.strictEqual(result.pods[0].memoryRequest, '0');
            assert.strictEqual(result.pods[0].memoryRequestRaw, 0);
        });

        test('should handle node with NotReady status', () => {
            const mockNode = createMockV1Node();
            if (mockNode.status?.conditions) {
                const readyCondition = mockNode.status.conditions.find(c => c.type === 'Ready');
                if (readyCondition) {
                    readyCondition.status = 'False';
                }
            }
            const mockPods: k8s.V1Pod[] = [];
            
            const result = transformNodeData(mockNode, mockPods);
            
            assert.strictEqual(result.overview.status, 'NotReady');
        });

        test('should extract pod information correctly', () => {
            const mockNode = createMockV1Node();
            const mockPods: k8s.V1Pod[] = [
                createMockV1Pod('test-pod', 'test-namespace')
            ];
            
            const result = transformNodeData(mockNode, mockPods);
            
            assert.strictEqual(result.pods.length, 1);
            assert.strictEqual(result.pods[0].name, 'test-pod');
            assert.strictEqual(result.pods[0].namespace, 'test-namespace');
            assert.strictEqual(result.pods[0].status, 'Running');
            assert.ok(result.pods[0].cpuRequestRaw > 0);
            assert.ok(result.pods[0].memoryRequestRaw > 0);
            assert.strictEqual(result.pods[0].restartCount, 3); // 2 + 1 from two containers
            assert.ok(result.pods[0].age.length > 0);
        });

        test('should handle node with master role label', () => {
            const mockNode = createMockV1Node();
            if (mockNode.metadata?.labels) {
                mockNode.metadata.labels['node-role.kubernetes.io/master'] = 'true';
            }
            const mockPods: k8s.V1Pod[] = [];
            
            const result = transformNodeData(mockNode, mockPods);
            
            assert.ok(result.overview.roles.includes('master'));
        });

        test('should filter out invalid address types', () => {
            const mockNode = createMockV1Node();
            if (mockNode.status?.addresses) {
                mockNode.status.addresses.push({
                    type: 'InvalidType' as k8s.V1NodeAddress['type'],
                    address: 'invalid'
                });
            }
            const mockPods: k8s.V1Pod[] = [];
            
            const result = transformNodeData(mockNode, mockPods);
            
            // Should only include valid address types
            assert.ok(result.addresses.length <= 2);
            result.addresses.forEach(addr => {
                assert.ok(['Hostname', 'InternalIP', 'ExternalIP', 'InternalDNS', 'ExternalDNS'].includes(addr.type));
            });
        });

        test('should filter out invalid condition types', () => {
            const mockNode = createMockV1Node();
            if (mockNode.status?.conditions) {
                mockNode.status.conditions.push({
                    type: 'InvalidCondition' as k8s.V1NodeCondition['type'],
                    status: 'True',
                    lastTransitionTime: new Date()
                });
            }
            const mockPods: k8s.V1Pod[] = [];
            
            const result = transformNodeData(mockNode, mockPods);
            
            // Should only include valid condition types
            result.conditions.forEach(condition => {
                assert.ok(['Ready', 'MemoryPressure', 'DiskPressure', 'PIDPressure', 'NetworkUnavailable'].includes(condition.type));
            });
        });
    });
});

