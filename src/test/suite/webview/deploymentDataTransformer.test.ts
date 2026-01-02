import * as assert from 'assert';
import * as k8s from '@kubernetes/client-node';
import { transformDeploymentData } from '../../../webview/deploymentDataTransformer';

/**
 * Helper function to create a complete mock V1Deployment with all fields populated.
 */
function createMockV1Deployment(): k8s.V1Deployment {
    const now = new Date();
    const creationTimestamp = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000); // 5 days ago
    
    return {
        metadata: {
            name: 'test-deployment',
            namespace: 'default',
            creationTimestamp: creationTimestamp,
            generation: 3,
            labels: {
                'app': 'test-app',
                'version': 'v1.0.0'
            },
            annotations: {
                'deployment.kubernetes.io/revision': '3'
            }
        },
        spec: {
            replicas: 3,
            paused: false,
            revisionHistoryLimit: 10,
            progressDeadlineSeconds: 600,
            minReadySeconds: 0,
            strategy: {
                type: 'RollingUpdate',
                rollingUpdate: {
                    maxSurge: '25%',
                    maxUnavailable: '25%'
                }
            },
            selector: {
                matchLabels: {
                    'app': 'test-app'
                }
            },
            template: {
                metadata: {
                    labels: {
                        'app': 'test-app'
                    }
                },
                spec: {
                    containers: [
                        {
                            name: 'app-container',
                            image: 'test-image:1.0.0',
                            imagePullPolicy: 'IfNotPresent',
                            ports: [
                                {
                                    name: 'http',
                                    containerPort: 8080,
                                    protocol: 'TCP'
                                }
                            ],
                            env: [
                                {
                                    name: 'ENV_VAR',
                                    value: 'test-value'
                                },
                                {
                                    name: 'SECRET_VAR',
                                    valueFrom: {
                                        secretKeyRef: {
                                            name: 'test-secret',
                                            key: 'password'
                                        }
                                    }
                                },
                                {
                                    name: 'CONFIG_VAR',
                                    valueFrom: {
                                        configMapKeyRef: {
                                            name: 'test-config',
                                            key: 'config-key'
                                        }
                                    }
                                }
                            ],
                            volumeMounts: [
                                {
                                    name: 'config-volume',
                                    mountPath: '/etc/config'
                                }
                            ],
                            resources: {
                                requests: {
                                    cpu: '100m',
                                    memory: '128Mi'
                                },
                                limits: {
                                    cpu: '500m',
                                    memory: '512Mi'
                                }
                            },
                            livenessProbe: {
                                httpGet: {
                                    path: '/health',
                                    port: 8080,
                                    scheme: 'HTTP'
                                },
                                initialDelaySeconds: 30,
                                periodSeconds: 10,
                                timeoutSeconds: 5,
                                successThreshold: 1,
                                failureThreshold: 3
                            },
                            readinessProbe: {
                                httpGet: {
                                    path: '/ready',
                                    port: 8080,
                                    scheme: 'HTTP'
                                },
                                initialDelaySeconds: 10,
                                periodSeconds: 5,
                                timeoutSeconds: 3,
                                successThreshold: 1,
                                failureThreshold: 3
                            }
                        }
                    ],
                    initContainers: [
                        {
                            name: 'init-container',
                            image: 'init-image:latest',
                            command: ['/bin/sh', '-c', 'echo init']
                        }
                    ],
                    volumes: [
                        {
                            name: 'config-volume',
                            configMap: {
                                name: 'test-configmap'
                            }
                        }
                    ],
                    restartPolicy: 'Always',
                    serviceAccountName: 'test-service-account',
                    securityContext: {
                        runAsUser: 1000,
                        runAsGroup: 1000,
                        fsGroup: 1000,
                        runAsNonRoot: true
                    }
                }
            }
        },
        status: {
            observedGeneration: 3,
            replicas: 3,
            updatedReplicas: 3,
            readyReplicas: 3,
            availableReplicas: 3,
            conditions: [
                {
                    type: 'Available',
                    status: 'True',
                    reason: 'MinimumReplicasAvailable',
                    message: 'Deployment has minimum availability.',
                    lastUpdateTime: new Date(now.getTime() - 2 * 60 * 60 * 1000), // 2 hours ago
                    lastTransitionTime: new Date(now.getTime() - 2 * 60 * 60 * 1000)
                },
                {
                    type: 'Progressing',
                    status: 'True',
                    reason: 'NewReplicaSetAvailable',
                    message: 'ReplicaSet "test-deployment-abc123" has successfully progressed.',
                    lastUpdateTime: new Date(now.getTime() - 1 * 60 * 60 * 1000), // 1 hour ago
                    lastTransitionTime: new Date(now.getTime() - 1 * 60 * 60 * 1000)
                }
            ]
        }
    };
}

/**
 * Helper function to create a minimal mock V1Deployment with only required fields.
 */
function createMockV1DeploymentMinimal(): k8s.V1Deployment {
    return {
        metadata: {
            name: 'minimal-deployment',
            namespace: 'default'
        },
        spec: {
            replicas: 1,
            selector: {
                matchLabels: {}
            },
            template: {
                metadata: {},
                spec: {
                    containers: [
                        {
                            name: 'container',
                            image: 'image:latest'
                        }
                    ]
                }
            }
        },
        status: {}
    };
}

/**
 * Helper function to create a mock V1ReplicaSet with revision annotation.
 */
function createMockV1ReplicaSet(name: string, revision: number, replicas: number = 3): k8s.V1ReplicaSet {
    const creationTimestamp = new Date(Date.now() - revision * 60 * 60 * 1000); // Older for higher revision
    
    return {
        metadata: {
            name: name,
            namespace: 'default',
            creationTimestamp: creationTimestamp,
            annotations: {
                'deployment.kubernetes.io/revision': String(revision)
            }
        },
        spec: {
            replicas: replicas,
            selector: {
                matchLabels: {
                    'app': 'test-app'
                }
            },
            template: {
                metadata: {
                    labels: {
                        'app': 'test-app'
                    }
                },
                spec: {
                    containers: [
                        {
                            name: 'app-container',
                            image: `test-image:${revision}.0.0`
                        }
                    ]
                }
            }
        },
        status: {
            replicas: replicas,
            readyReplicas: replicas,
            availableReplicas: replicas
        }
    };
}

/**
 * Helper function to create a mock CoreV1Event.
 */
function createMockCoreV1Event(
    reason: string,
    type: 'Normal' | 'Warning' = 'Normal',
    hoursAgo: number = 0
): k8s.CoreV1Event {
    const timestamp = new Date(Date.now() - hoursAgo * 60 * 60 * 1000);
    
    return {
        metadata: {
            name: `event-${reason.toLowerCase()}`,
            namespace: 'default',
            creationTimestamp: timestamp
        },
        type: type,
        reason: reason,
        message: `Event message for ${reason}`,
        firstTimestamp: timestamp,
        lastTimestamp: timestamp,
        count: 1,
        source: {
            component: 'deployment-controller'
        },
        involvedObject: {
            kind: 'Deployment',
            name: 'test-deployment',
            namespace: 'default'
        }
    };
}

suite('deploymentDataTransformer Tests', () => {
    suite('transformDeploymentData', () => {
        test('should transform complete V1Deployment with all fields', () => {
            const mockDeployment = createMockV1Deployment();
            const mockReplicaSets: k8s.V1ReplicaSet[] = [];
            const mockEvents: k8s.CoreV1Event[] = [];
            
            const result = transformDeploymentData(mockDeployment, mockReplicaSets, mockEvents);
            
            assert.strictEqual(result.name, 'test-deployment');
            assert.strictEqual(result.namespace, 'default');
            assert.strictEqual(result.overview.name, 'test-deployment');
            assert.strictEqual(result.overview.status, 'Available');
            assert.strictEqual(result.overview.generation, 3);
            assert.strictEqual(result.overview.observedGeneration, 3);
            assert.strictEqual(result.overview.paused, false);
            assert.ok(result.overview.creationTimestamp.length > 0);
            assert.ok(result.overview.age.length > 0);
        });

        test('should transform V1Deployment with missing optional fields', () => {
            const mockDeployment = createMockV1DeploymentMinimal();
            const mockReplicaSets: k8s.V1ReplicaSet[] = [];
            const mockEvents: k8s.CoreV1Event[] = [];
            
            const result = transformDeploymentData(mockDeployment, mockReplicaSets, mockEvents);
            
            assert.strictEqual(result.name, 'minimal-deployment');
            assert.strictEqual(result.namespace, 'default');
            assert.strictEqual(result.overview.name, 'minimal-deployment');
            assert.strictEqual(result.overview.status, 'Unknown');
            assert.deepStrictEqual(result.labels, {});
            assert.deepStrictEqual(result.selectors, {});
        });

        test('should extract replica status correctly', () => {
            const mockDeployment = createMockV1Deployment();
            const mockReplicaSets: k8s.V1ReplicaSet[] = [];
            const mockEvents: k8s.CoreV1Event[] = [];
            
            const result = transformDeploymentData(mockDeployment, mockReplicaSets, mockEvents);
            
            assert.strictEqual(result.replicaStatus.desired, 3);
            assert.strictEqual(result.replicaStatus.current, 3);
            assert.strictEqual(result.replicaStatus.ready, 3);
            assert.strictEqual(result.replicaStatus.available, 3);
            assert.strictEqual(result.replicaStatus.unavailable, 0);
            assert.strictEqual(result.replicaStatus.upToDate, 3);
            assert.strictEqual(result.replicaStatus.readyPercentage, 100);
            assert.strictEqual(result.replicaStatus.availablePercentage, 100);
            assert.strictEqual(result.replicaStatus.isHealthy, true);
        });

        test('should calculate replica status percentages correctly', () => {
            const mockDeployment = createMockV1Deployment();
            mockDeployment.spec!.replicas = 5;
            mockDeployment.status!.readyReplicas = 3;
            mockDeployment.status!.availableReplicas = 4;
            
            const mockReplicaSets: k8s.V1ReplicaSet[] = [];
            const mockEvents: k8s.CoreV1Event[] = [];
            
            const result = transformDeploymentData(mockDeployment, mockReplicaSets, mockEvents);
            
            assert.strictEqual(result.replicaStatus.desired, 5);
            assert.strictEqual(result.replicaStatus.ready, 3);
            assert.strictEqual(result.replicaStatus.available, 4);
            assert.strictEqual(result.replicaStatus.readyPercentage, 60);
            assert.strictEqual(result.replicaStatus.availablePercentage, 80);
            assert.strictEqual(result.replicaStatus.isHealthy, false);
        });

        test('should extract RollingUpdate strategy correctly', () => {
            const mockDeployment = createMockV1Deployment();
            const mockReplicaSets: k8s.V1ReplicaSet[] = [];
            const mockEvents: k8s.CoreV1Event[] = [];
            
            const result = transformDeploymentData(mockDeployment, mockReplicaSets, mockEvents);
            
            assert.strictEqual(result.strategy.type, 'RollingUpdate');
            assert.strictEqual(result.strategy.maxSurge, '25%');
            assert.strictEqual(result.strategy.maxUnavailable, '25%');
            assert.strictEqual(result.strategy.revisionHistoryLimit, 10);
            assert.strictEqual(result.strategy.progressDeadlineSeconds, 600);
            assert.strictEqual(result.strategy.minReadySeconds, 0);
        });

        test('should extract Recreate strategy correctly', () => {
            const mockDeployment = createMockV1Deployment();
            mockDeployment.spec!.strategy = {
                type: 'Recreate'
            };
            
            const mockReplicaSets: k8s.V1ReplicaSet[] = [];
            const mockEvents: k8s.CoreV1Event[] = [];
            
            const result = transformDeploymentData(mockDeployment, mockReplicaSets, mockEvents);
            
            assert.strictEqual(result.strategy.type, 'Recreate');
            assert.strictEqual(result.strategy.maxSurge, 'N/A');
            assert.strictEqual(result.strategy.maxSurgeValue, 0);
            assert.strictEqual(result.strategy.maxUnavailable, 'N/A');
            assert.strictEqual(result.strategy.maxUnavailableValue, 0);
        });

        test('should extract pod template correctly', () => {
            const mockDeployment = createMockV1Deployment();
            const mockReplicaSets: k8s.V1ReplicaSet[] = [];
            const mockEvents: k8s.CoreV1Event[] = [];
            
            const result = transformDeploymentData(mockDeployment, mockReplicaSets, mockEvents);
            
            assert.strictEqual(result.podTemplate.containers.length, 1);
            assert.strictEqual(result.podTemplate.initContainers.length, 1);
            assert.strictEqual(result.podTemplate.volumes.length, 1);
            assert.strictEqual(result.podTemplate.restartPolicy, 'Always');
            assert.strictEqual(result.podTemplate.serviceAccount, 'test-service-account');
            
            const container = result.podTemplate.containers[0];
            assert.strictEqual(container.name, 'app-container');
            assert.strictEqual(container.image, 'test-image:1.0.0');
            assert.strictEqual(container.imageTag, '1.0.0');
            assert.strictEqual(container.imagePullPolicy, 'IfNotPresent');
            assert.strictEqual(container.ports.length, 1);
            assert.strictEqual(container.ports[0].name, 'http');
            assert.strictEqual(container.ports[0].containerPort, 8080);
            assert.strictEqual(container.ports[0].protocol, 'TCP');
        });

        test('should extract container resources correctly', () => {
            const mockDeployment = createMockV1Deployment();
            const mockReplicaSets: k8s.V1ReplicaSet[] = [];
            const mockEvents: k8s.CoreV1Event[] = [];
            
            const result = transformDeploymentData(mockDeployment, mockReplicaSets, mockEvents);
            
            const container = result.podTemplate.containers[0];
            assert.strictEqual(container.resources.requests.cpu, '100m');
            assert.strictEqual(container.resources.requests.cpuMillicores, 100);
            assert.strictEqual(container.resources.requests.memory, '128Mi');
            assert.strictEqual(container.resources.limits.cpu, '500m');
            assert.strictEqual(container.resources.limits.cpuMillicores, 500);
            assert.strictEqual(container.resources.limits.memory, '512Mi');
            assert.strictEqual(container.resources.hasRequests, true);
            assert.strictEqual(container.resources.hasLimits, true);
        });

        test('should extract container env vars correctly', () => {
            const mockDeployment = createMockV1Deployment();
            const mockReplicaSets: k8s.V1ReplicaSet[] = [];
            const mockEvents: k8s.CoreV1Event[] = [];
            
            const result = transformDeploymentData(mockDeployment, mockReplicaSets, mockEvents);
            
            const container = result.podTemplate.containers[0];
            assert.strictEqual(container.env.count, 3);
            assert.strictEqual(container.env.hasSecrets, true);
            assert.strictEqual(container.env.hasConfigMaps, true);
        });

        test('should extract probes correctly', () => {
            const mockDeployment = createMockV1Deployment();
            const mockReplicaSets: k8s.V1ReplicaSet[] = [];
            const mockEvents: k8s.CoreV1Event[] = [];
            
            const result = transformDeploymentData(mockDeployment, mockReplicaSets, mockEvents);
            
            const container = result.podTemplate.containers[0];
            assert.ok(container.livenessProbe !== null);
            assert.strictEqual(container.livenessProbe!.type, 'http');
            assert.strictEqual(container.livenessProbe!.initialDelaySeconds, 30);
            assert.strictEqual(container.livenessProbe!.periodSeconds, 10);
            assert.ok(container.livenessProbe!.details.includes('/health'));
            
            assert.ok(container.readinessProbe !== null);
            assert.strictEqual(container.readinessProbe!.type, 'http');
            assert.ok(container.readinessProbe!.details.includes('/ready'));
        });

        test('should extract conditions correctly', () => {
            const mockDeployment = createMockV1Deployment();
            const mockReplicaSets: k8s.V1ReplicaSet[] = [];
            const mockEvents: k8s.CoreV1Event[] = [];
            
            const result = transformDeploymentData(mockDeployment, mockReplicaSets, mockEvents);
            
            assert.strictEqual(result.conditions.length, 2);
            const availableCondition = result.conditions.find(c => c.type === 'Available');
            assert.ok(availableCondition !== undefined);
            assert.strictEqual(availableCondition!.status, 'True');
            assert.strictEqual(availableCondition!.reason, 'MinimumReplicasAvailable');
            assert.strictEqual(availableCondition!.severity, 'success');
            assert.ok(availableCondition!.relativeTime.length > 0);
        });

        test('should transform ReplicaSets correctly', () => {
            const mockDeployment = createMockV1Deployment();
            const mockReplicaSets: k8s.V1ReplicaSet[] = [
                createMockV1ReplicaSet('test-deployment-abc123', 3, 3),
                createMockV1ReplicaSet('test-deployment-def456', 2, 0),
                createMockV1ReplicaSet('test-deployment-ghi789', 1, 0)
            ];
            const mockEvents: k8s.CoreV1Event[] = [];
            
            const result = transformDeploymentData(mockDeployment, mockReplicaSets, mockEvents);
            
            assert.strictEqual(result.replicaSets.length, 3);
            // Should be sorted by revision descending (newest first)
            assert.strictEqual(result.replicaSets[0].revision, 3);
            assert.strictEqual(result.replicaSets[1].revision, 2);
            assert.strictEqual(result.replicaSets[2].revision, 1);
            
            // Current ReplicaSet should be identified
            assert.strictEqual(result.replicaSets[0].isCurrent, true);
            assert.strictEqual(result.replicaSets[1].isCurrent, false);
            assert.strictEqual(result.replicaSets[2].isCurrent, false);
            
            // Check images
            assert.strictEqual(result.replicaSets[0].images.length, 1);
            assert.strictEqual(result.replicaSets[0].images[0], 'test-image:3.0.0');
        });

        test('should filter events to last hour', () => {
            const mockDeployment = createMockV1Deployment();
            const mockReplicaSets: k8s.V1ReplicaSet[] = [];
            const mockEvents: k8s.CoreV1Event[] = [
                createMockCoreV1Event('ScalingReplicaSet', 'Normal', 0.5), // 30 minutes ago - should be included
                createMockCoreV1Event('FailedCreate', 'Warning', 2) // 2 hours ago - should be excluded
            ];
            
            const result = transformDeploymentData(mockDeployment, mockReplicaSets, mockEvents);
            
            // Only recent event should be included
            assert.strictEqual(result.events.length, 1);
            assert.strictEqual(result.events[0].reason, 'ScalingReplicaSet');
        });

        test('should group events by reason', () => {
            const mockDeployment = createMockV1Deployment();
            const mockReplicaSets: k8s.V1ReplicaSet[] = [];
            const mockEvents: k8s.CoreV1Event[] = [
                createMockCoreV1Event('ScalingReplicaSet', 'Normal', 0.1),
                createMockCoreV1Event('ScalingReplicaSet', 'Normal', 0.2),
                createMockCoreV1Event('ScalingReplicaSet', 'Normal', 0.3)
            ];
            
            const result = transformDeploymentData(mockDeployment, mockReplicaSets, mockEvents);
            
            // Events should be grouped by reason
            assert.strictEqual(result.events.length, 1);
            assert.strictEqual(result.events[0].reason, 'ScalingReplicaSet');
            assert.strictEqual(result.events[0].count, 3);
        });

        test('should extract labels and selectors correctly', () => {
            const mockDeployment = createMockV1Deployment();
            const mockReplicaSets: k8s.V1ReplicaSet[] = [];
            const mockEvents: k8s.CoreV1Event[] = [];
            
            const result = transformDeploymentData(mockDeployment, mockReplicaSets, mockEvents);
            
            assert.strictEqual(result.labels['app'], 'test-app');
            assert.strictEqual(result.labels['version'], 'v1.0.0');
            assert.strictEqual(result.selectors['app'], 'test-app');
        });

        test('should handle deployment with no conditions', () => {
            const mockDeployment = createMockV1DeploymentMinimal();
            const mockReplicaSets: k8s.V1ReplicaSet[] = [];
            const mockEvents: k8s.CoreV1Event[] = [];
            
            const result = transformDeploymentData(mockDeployment, mockReplicaSets, mockEvents);
            
            assert.strictEqual(result.overview.status, 'Unknown');
            assert.strictEqual(result.conditions.length, 0);
        });

        test('should handle deployment with ReplicaFailure condition', () => {
            const mockDeployment = createMockV1Deployment();
            mockDeployment.status!.conditions = [
                {
                    type: 'ReplicaFailure',
                    status: 'True',
                    reason: 'FailedCreate',
                    message: 'Failed to create pod',
                    lastUpdateTime: new Date(),
                    lastTransitionTime: new Date()
                }
            ];
            
            const mockReplicaSets: k8s.V1ReplicaSet[] = [];
            const mockEvents: k8s.CoreV1Event[] = [];
            
            const result = transformDeploymentData(mockDeployment, mockReplicaSets, mockEvents);
            
            assert.strictEqual(result.overview.status, 'Failed');
            assert.strictEqual(result.overview.statusMessage, 'Failed to create pod');
        });

        test('should handle deployment with zero replicas', () => {
            const mockDeployment = createMockV1Deployment();
            mockDeployment.spec!.replicas = 0;
            mockDeployment.status!.replicas = 0;
            mockDeployment.status!.readyReplicas = 0;
            mockDeployment.status!.availableReplicas = 0;
            
            const mockReplicaSets: k8s.V1ReplicaSet[] = [];
            const mockEvents: k8s.CoreV1Event[] = [];
            
            const result = transformDeploymentData(mockDeployment, mockReplicaSets, mockEvents);
            
            assert.strictEqual(result.replicaStatus.desired, 0);
            assert.strictEqual(result.replicaStatus.readyPercentage, 0);
            assert.strictEqual(result.replicaStatus.availablePercentage, 0);
            assert.strictEqual(result.replicaStatus.isHealthy, false);
        });

        test('should handle container without resources', () => {
            const mockDeployment = createMockV1DeploymentMinimal();
            const mockReplicaSets: k8s.V1ReplicaSet[] = [];
            const mockEvents: k8s.CoreV1Event[] = [];
            
            const result = transformDeploymentData(mockDeployment, mockReplicaSets, mockEvents);
            
            const container = result.podTemplate.containers[0];
            assert.strictEqual(container.resources.hasRequests, false);
            assert.strictEqual(container.resources.hasLimits, false);
            assert.strictEqual(container.resources.requests.cpu, '0');
            assert.strictEqual(container.resources.requests.memory, '0');
        });

        test('should handle image without tag', () => {
            const mockDeployment = createMockV1DeploymentMinimal();
            mockDeployment.spec!.template!.spec!.containers![0].image = 'test-image';
            
            const mockReplicaSets: k8s.V1ReplicaSet[] = [];
            const mockEvents: k8s.CoreV1Event[] = [];
            
            const result = transformDeploymentData(mockDeployment, mockReplicaSets, mockEvents);
            
            const container = result.podTemplate.containers[0];
            assert.strictEqual(container.image, 'test-image');
            assert.strictEqual(container.imageTag, 'latest');
        });
    });
});

