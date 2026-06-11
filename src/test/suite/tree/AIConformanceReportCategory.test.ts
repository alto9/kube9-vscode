import * as assert from 'assert';
import {
    AI_CONFORMANCE_REPORT_ID,
    AI_CONFORMANCE_REPORT_LABEL,
    AIConformanceReportCategory,
} from '../../../tree/categories/reports/AIConformanceReportCategory';
import { OperatorSubcategory } from '../../../tree/categories/reports/OperatorSubcategory';

suite('AIConformanceReportCategory', () => {
    const resourceData = {
        context: { name: 'dev-cluster', cluster: 'dev' },
        cluster: { name: 'dev', server: 'https://127.0.0.1:6443' },
    };

    test('createReportItem wires command and stable report id', () => {
        const item = AIConformanceReportCategory.createReportItem(resourceData);

        assert.strictEqual(item.type, 'aiConformanceReport');
        assert.strictEqual(item.label, AI_CONFORMANCE_REPORT_LABEL);
        assert.strictEqual(item.resourceData?.resourceName, AI_CONFORMANCE_REPORT_ID);
        assert.strictEqual(item.command?.command, 'kube9.openAIConformanceReport');
        assert.deepStrictEqual(item.command?.arguments, ['dev-cluster']);
    });

    test('OperatorSubcategory includes Kubernetes AI Conformance after Health', () => {
        const items = OperatorSubcategory.getOperatorReportItems(resourceData);

        assert.strictEqual(items.length, 3);
        assert.strictEqual(items[0].type, 'operatorHealth');
        assert.strictEqual(items[1].type, 'aiConformanceReport');
        assert.strictEqual(items[2].type, 'wellArchitectedSubcategory');
    });
});
