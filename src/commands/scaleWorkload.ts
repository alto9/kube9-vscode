// Imports will be used in story 004 when implementing the command handler
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import * as vscode from 'vscode';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { ClusterTreeItem } from '../tree/ClusterTreeItem';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { WorkloadCommands } from '../kubectl/WorkloadCommands';

/**
 * Validates replica count input for VSCode input dialog.
 * Returns undefined for valid input, or an error message string for invalid input.
 * 
 * @param input - The input string to validate
 * @returns undefined if input is valid, error message string if invalid
 */
export function validateReplicaCount(input: string): string | undefined {
    // Check if empty
    if (!input || input.trim() === '') {
        return 'Replica count is required';
    }
    
    // Trim input for validation
    const trimmedInput = input.trim();
    
    // Check if input is a valid integer (allows leading zeros, but must be all digits)
    // Use regex to ensure entire string is numeric (no letters, no decimals)
    if (!/^-?\d+$/.test(trimmedInput)) {
        return 'Replica count must be a number';
    }
    
    // Parse as integer
    const count = parseInt(trimmedInput, 10);
    
    // Check minimum (allow 0)
    if (count < 0) {
        return 'Replica count must be a positive number (0 or greater)';
    }
    
    // Check maximum
    if (count > 1000) {
        return 'Replica count must not exceed 1000';
    }
    
    // Valid input
    return undefined;
}

