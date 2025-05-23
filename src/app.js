import React, { useEffect, useState } from 'react'
import RightPanel from './components/rightPanel'
import G6 from '@antv/g6'

const nodes = [...Array(30)].map((_, i) => ({ id: `Node${i + 1}`, label: `Node${i + 1}` }))
let edges = new Set();
while (edges.size < 60) {
  const source = `Node${Math.floor(Math.random() * 30) + 1}`
  const target = `Node${Math.floor(Math.random() * 30) + 1}`
  const label = `${source}To${target}`
  const id = label

  // Add the edge to the set. If the edge already exists, it won't be added again.
  edges.add({ source, target, label, id });
}

// Convert the set back to an array.
edges = Array.from(edges)

// Generating some key value data
const allValues = {}
nodes.forEach(e => allValues[e.id] = [...Array(Math.floor(Math.random() * 50) + 1)].reduce((o, _, i) => (o['key' + i] = 'value' + Math.floor(Math.random() * 100), o), {}))
edges.forEach(e => allValues[e.id] = [...Array(Math.floor(Math.random() * 50) + 1)].reduce((o, _, i) => (o['key' + i] = 'value' + Math.floor(Math.random() * 100), o), {}))

const data = { nodes, edges }

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

const highlited = { nodes: [], edges: [] }

function adjustLayout(graph) {
  // Get the graph data
  let data = graph.save();

  // Adjust nodeSpacing based on the number of nodes
  let nodeSpacing = Math.sqrt(data.nodes.length) * 1000;

  // Adjust center based on the graph size
  let center = [graph.getWidth() / 2, graph.getHeight() / 2];

  // Update the layout configuration
  graph.updateLayout({
    nodeSpacing: nodeSpacing,
    center: center,
    // other layout parameters...
  });

  // Re-render the graph
  graph.render();
}

export function App() {
  const ref = React.useRef(null)
  let graph = null

  const width = window.innerWidth
    || document.documentElement.clientWidth
    || document.body.clientWidth

  const height = window.innerHeight
    || document.documentElement.clientHeight
    || document.body.clientHeight

  const [selectedElementValues, setSelectedElementValues] = useState({});
  const [selectedElementLabel, setSelectedElementLabel] = useState("Select element");

  useEffect(() => {
    if (!graph) {
      graph = new G6.Graph({
        container: ref.current,
        width: width - 300,
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
        layout: {
          type: 'gForce',
          center: [700, 700], // The center of the graph by default
          preventOverlap: true,
          coulombDisScale: 0.0015,
          nodeSpacing: 50,
          onTick: () => {
            console.log('ticking');
          },
          onLayoutEnd: () => {
            console.log('force layout done');
          },
          workerEnabled: true, // Whether to activate web-worker
          //gpuEnabled: true     // Whether to enable the GPU parallel computing, supported by G6 4.0
        },
      });
    }

    graph.on('edge:click', (e) => {
      setSelectedElementValues(allValues[e.item._cfg.id])
      setSelectedElementLabel(e.item._cfg.model.label)
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
      setSelectedElementValues(allValues[e.item._cfg.id])
      setSelectedElementLabel(e.item._cfg.model.label)
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

    // Reset styles when clicking elsewhere on the canvas
    graph.on('canvas:click', () => {
      setSelectedElementValues({})
      setSelectedElementLabel("")
      highlited.edges.forEach(el => graph.updateItem(el, {
        style: defaultStyle,
      }))

      highlited.nodes.forEach(el => graph.updateItem(el, {
        style: defaultNodeStyle,
      }))

      highlited.edges = []
      highlited.nodes = []

      graph.paint();
    });

    graph.data(data)

    graph.render()
    adjustLayout(graph)
    graph.paint()

  }, [])

  return (
    <div>
      <div ref={ref}>
      </div>
      <RightPanel data={selectedElementValues} caption={selectedElementLabel} />
    </div>
  );
}