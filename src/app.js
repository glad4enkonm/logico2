import React, { useEffect, useState } from 'react';
const data = {
    // The array of nodes
    nodes: [
      {
        id: 'node1', // String, unique and required
        x: 100, // Number, the x coordinate
        y: 200, // Number, the y coordinate
      },
      {
        id: 'node2', // String, unique and required
        x: 300, // Number, the x coordinate
        y: 200, // Number, the y coordinate
      },
    ],
    // The array of edges
    edges: [
      {
        source: 'node1', // String, required, the id of the source node
        target: 'node2', // String, required, the id of the target node
      },
    ],
  };
import G6 from '@antv/g6';

export function App() {
  const ref = React.useRef(null)
  let graph = null

  const width = window.innerWidth
    || document.documentElement.clientWidth
    || document.body.clientWidth;

  const height = window.innerHeight
    || document.documentElement.clientHeight
    || document.body.clientHeight;

  useEffect(() => {
    if(!graph) {      
      graph = new G6.Graph({
        container: ref.current,
        width: width * 0.8,
        height: height * 0.95,
        modes: {
          default: ['drag-canvas', 'drag-node', 'zoom-canvas']
        },
        defaultNode: {
            type: "circle",
            size: [100],
            color: "#5B8FF9",
            style: {
              fill: "#9EC9FF",
              lineWidth: 3
            },
            labelCfg: {
              style: {
                fill: "#fff",
                fontSize: 20
              }
            }
          },
          defaultEdge: {
            style: {
              stroke: "#e2e2e2"
            }
          }
      })
    }
    
    graph.data(data)
  
    graph.render()    
    graph.paint()
    
  }, [])

  return (
    <div ref={ref}>      
    </div>
  );
}