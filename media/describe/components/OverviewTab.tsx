import React from 'react';
import { NamespaceOverview, NamespaceMetadata } from '../../../src/providers/NamespaceDescribeProvider';
import { InfoGrid } from './InfoGrid';
import { InfoItem } from './InfoItem';
import { KeyValueList } from './KeyValueList';
import { formatTimestamp } from '../utils';

interface OverviewTabProps {
    /** Namespace overview data */
    data: NamespaceOverview;
    /** Namespace metadata including labels and annotations */
    metadata: NamespaceMetadata;
}

/**
 * Overview tab component displaying namespace status, metadata, labels, and annotations.
 */
export const OverviewTab: React.FC<OverviewTabProps> = ({ data, metadata }) => {
    return (
        <div className="overview-tab">
            <section className="info-section">
                <h2>Status</h2>
                <InfoGrid>
                    <InfoItem label="Name" value={data.name} />
                    <InfoItem label="Phase" value={data.phase} />
                    <InfoItem label="Age" value={data.age} />
                    <InfoItem label="Created" value={formatTimestamp(data.creationTimestamp)} />
                </InfoGrid>
            </section>

            <section className="info-section">
                <h2>Metadata</h2>
                <InfoGrid>
                    <InfoItem label="UID" value={data.uid} copyable />
                    <InfoItem label="Resource Version" value={data.resourceVersion} />
                </InfoGrid>
            </section>

            {Object.keys(metadata.labels).length > 0 && (
                <section className="info-section">
                    <h2>Labels</h2>
                    <KeyValueList items={metadata.labels} copyable />
                </section>
            )}

            {Object.keys(metadata.annotations).length > 0 && (
                <section className="info-section">
                    <h2>Annotations</h2>
                    <KeyValueList items={metadata.annotations} copyable />
                </section>
            )}
        </div>
    );
};

