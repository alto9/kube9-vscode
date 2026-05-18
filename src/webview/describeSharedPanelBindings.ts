import { CronJobDescribeWebview } from './CronJobDescribeWebview';
import { DaemonSetDescribeWebview } from './DaemonSetDescribeWebview';
import { DeploymentDescribeWebview } from './DeploymentDescribeWebview';
import { DescribeWebview } from './DescribeWebview';
import { NodeDescribeWebview } from './NodeDescribeWebview';
import { StatefulSetDescribeWebview } from './StatefulSetDescribeWebview';

/**
 * Releases every active message handler on the shared kube9 Describe webview panel
 * (generic Describe plus structured workload/node detail views) so the next view
 * can take exclusive ownership without stale refresh/YAML/navigation handlers.
 */
export function releaseExclusiveDescribePanelBindings(): void {
    DescribeWebview.releaseSharedDescribeMessageBindings();
    DeploymentDescribeWebview.releaseMessageBindings();
    CronJobDescribeWebview.releaseMessageBindings();
    NodeDescribeWebview.releaseMessageBindings();
    StatefulSetDescribeWebview.releaseMessageBindings();
    DaemonSetDescribeWebview.releaseMessageBindings();
}
