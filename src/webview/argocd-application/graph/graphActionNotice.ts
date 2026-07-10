/** User-cancelled confirmations (e.g. restart dialog) must not surface the graph action banner. */
export function shouldShowGraphActionNotice(success: boolean, message: string): boolean {
    return !success && message !== 'Cancelled';
}
