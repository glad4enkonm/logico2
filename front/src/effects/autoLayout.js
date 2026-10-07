import { applyLayout } from '@/utils/graphUtil';

/**
 * Returns a function that applies a layout configuration to the current graph.
 * @param {React.MutableRefObject<G6.Graph>} graphRef
 * @param {React.MutableRefObject<Object>} graphDataRef
 * @returns {function(Object): void}
 */
export function handleAutoLayoutEffect(graphRef, graphDataRef) {
  return (layoutOptions) => {
    const graph = graphRef.current;
    if (!graph) return;
    applyLayout(graph, graphDataRef.current, layoutOptions);
  };
}
