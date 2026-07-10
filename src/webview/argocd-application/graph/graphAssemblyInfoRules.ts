export const GRAPH_ASSEMBLY_INVALID_ROW_BANNER_MESSAGE =
    'Some managed resources could not be shown because Argo CD returned incomplete resource rows.';

export function shouldShowGraphAssemblyInfoBanner(skippedInvalidResourceRows: boolean | undefined): boolean {
    return skippedInvalidResourceRows === true;
}
