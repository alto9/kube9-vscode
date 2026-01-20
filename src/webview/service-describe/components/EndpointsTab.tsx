import React from 'react';
import { ServiceEndpoints } from '../../../providers/ServiceDescribeProvider';

/**
 * Props for EndpointsTab component.
 */
interface EndpointsTabProps {
    /** Endpoints data to display */
    data: ServiceEndpoints;
}

/**
 * Endpoints tab component that displays Service endpoint information (Pod IPs and ports).
 */
export const EndpointsTab: React.FC<EndpointsTabProps> = ({ data }) => {
    // Handle empty state
    if (data.totalEndpoints === 0) {
        return (
            <div className="empty-state">
                <p>No endpoints found for this Service</p>
                <p className="hint">This may indicate that no Pods match the Service selectors, or the Service type is ExternalName</p>
            </div>
        );
    }

    return (
        <div className="endpoints-tab">
            <div className="section">
                <h2>Endpoints ({data.totalEndpoints})</h2>
                {data.subsets.map((subset, subsetIndex) => (
                    <div key={subsetIndex} className="endpoint-subset">
                        {subset.addresses.length > 0 && (
                            <div className="endpoint-addresses" style={{ marginBottom: '24px' }}>
                                <h3 style={{ marginBottom: '12px', fontSize: '1em', fontWeight: 600, color: 'var(--vscode-foreground)' }}>Addresses ({subset.addresses.length})</h3>
                                <table className="conditions-table">
                                    <thead>
                                        <tr>
                                            <th>IP Address</th>
                                            <th>Pod Name</th>
                                            <th>Node Name</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {subset.addresses.map((address, addrIndex) => (
                                            <tr key={addrIndex}>
                                                <td>{address.ip}</td>
                                                <td>{address.podName || '-'}</td>
                                                <td>{address.nodeName || '-'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {subset.ports.length > 0 && (
                            <div className="endpoint-ports">
                                <h3 style={{ marginBottom: '12px', fontSize: '1em', fontWeight: 600, color: 'var(--vscode-foreground)' }}>Ports ({subset.ports.length})</h3>
                                <table className="conditions-table">
                                    <thead>
                                        <tr>
                                            <th>Name</th>
                                            <th>Port</th>
                                            <th>Protocol</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {subset.ports.map((port, portIndex) => (
                                            <tr key={portIndex}>
                                                <td>{port.name || '-'}</td>
                                                <td>{port.port}</td>
                                                <td>{port.protocol}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};
