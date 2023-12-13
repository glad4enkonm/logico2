import React, { useEffect, useState } from 'react';
const data = { nodes: [...Array(30)].map((_, i) => ({ id: `node${i + 1}`, label: `node${i + 1}` })), edges: [...Array(60)].map(() => ({ source: `node${Math.floor(Math.random() * 30) + 1}`, target: `node${Math.floor(Math.random() * 30) + 1}`, label: `edge${Math.floor(Math.random() * 60) + 1}` })) }
/*{
    // The array of nodes
    nodes: [
      {
        id: 'node1',
        label: 'node1',
      },
      {
        id: 'node2',
        label: 'node2',
      },
    ],
    // The array of edges
    edges: [
      {
        source: 'node1',
        target: 'node2',
        label: 'node1toNode2',
      },
    ],
  }; */
import G6 from '@antv/g6';

// Define the highlight styles for the edge and nodes
const highlightStyle = {
  stroke: '#03DAC6', // Highlight color for the edge        
  // Additional styles if needed
}

const defaultStyle = {
  stroke: "#343434", // Borders and dividers color for edges
}, defaultNodeStyle = {
  stroke: "#BB86FC"
}


const highlited = {nodes:[], edges:[]}

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
    if (!graph) {
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
          color: "#BB86FC", // Accent Color for the border of the nodes
          style: {
            fill: "#121212", // Dark background color for nodes
            lineWidth: 3,
            stroke: "#BB86FC", // Optional: if you want the node border to have the accent color
          },
          labelCfg: {
            style: {
              fill: "#E0E0E0", // Primary text color for labels
              fontSize: 20
            }
          }
        },
        defaultEdge: {
          style: {
            stroke: "#343434", // Borders and dividers color for edges
          },
          labelCfg: {
            style: {
              fill: "#E0E0E0", // Primary text color for labels
              fontSize: 20
            }
          }
        },
      });
    }

    graph.on('edge:click', (e) => {
      highlited.edges.push(e.item)      
      highlited.nodes.push(e.item.getSource(), e.item.getTarget())      

      const elements = highlited.edges.concat(highlited.nodes)
      elements.forEach(el => graph.updateItem(el, {
        style: highlightStyle,
      }))

      graph.paint();
    });

    graph.on('node:click', (e) => {
      const node = e.item; // The clicked node
      highlited.nodes.push(node);
      
      // Get connected edges for the clicked node
      const edges = graph.getEdges().filter(edge => {
          return edge.getSource() === node || edge.getTarget() === node;
      });
  
      // Add the connected edges to the highlighted list
      edges.forEach(edge => {
          highlited.edges.push(edge);
          
          // Additionally, highlight the opposite node of each edge
          const source = edge.getSource();
          const target = edge.getTarget();
          if (source !== node && highlited.nodes.indexOf(source) === -1) {
              highlited.nodes.push(source);
          }
          if (target !== node && highlited.nodes.indexOf(target) === -1) {
              highlited.nodes.push(target);
          }
      });
  
      // Apply the highlight style to all highlighted elements
      const elements = highlited.edges.concat(highlited.nodes);
      elements.forEach(el => graph.updateItem(el, {
          style: highlightStyle,
      }));
  
      graph.paint();
  });

    // Optional: Reset styles when clicking elsewhere on the canvas
    graph.on('canvas:click', () => {
      highlited.edges.forEach(el => graph.updateItem(el, {
        style: defaultStyle,
      }))

      highlited.nodes.forEach(el => graph.updateItem(el, {
        style: defaultNodeStyle,
      }))

      highlited.edges = highlited.nodes = []

      graph.paint();
    });

    graph.data(data)

    graph.render()
    graph.paint()

  }, [])

  return (
    <div ref={ref}>
    </div>
  );
}