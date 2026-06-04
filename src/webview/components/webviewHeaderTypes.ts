/**
 * Action button definition for WebviewHeader.
 */
export interface WebviewHeaderAction {
    label: string;
    icon?: string;
    onClick: () => void;
    disabled?: boolean;
    busy?: boolean;
}
