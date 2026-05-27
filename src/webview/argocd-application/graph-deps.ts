/**
 * Re-exports graph stack packages so esbuild retains them in the IIFE bundle.
 * Graph UI lands in M12 follow-on tickets; this stub satisfies the packaging contract.
 */
export { ReactFlow } from '@xyflow/react';
export { default as dagre } from '@dagrejs/dagre';
