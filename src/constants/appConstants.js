export const NODE_STYLE = {
  stroke: "#BB86FC",
};

export const EDGE_STYLE = {
  stroke: "#343434",
};

export const HIGHLIGHT_STYLE = {
  stroke: "#03DAC6",
};

export const GRAPH_LAYOUT_OPTIONS = {
  type: 'gForce',
  center: [700, 700],
  preventOverlap: true,
  coulombDisScale: 0.0015,
  nodeSpacing: 50,
  workerEnabled: true,
};

export const GRAPH_MODES = {
  default: ['drag-canvas', 'drag-node', 'zoom-canvas'],
};

export const DEFAULT_NODE = {
  type: "circle",
  size: [100],
  color: "#BB86FC",
  style: {
    fill: "#121212",
    lineWidth: 3,
    stroke: "#BB86FC",
  },
  labelCfg: {
    style: {
      fill: "#E0E0E0",
      fontSize: 20,
    },
  },
};

export const DEFAULT_EDGE = {
  style: {
    stroke: "#343434",
  },
  labelCfg: {
    style: {
      fill: "#E0E0E0",
      fontSize: 20,
    },
  },
};

export const BUTTON_EVENTS = {
  NEW: 'new',
  OPEN: 'open',
  SAVE_AS: 'saveAs',
  RANDOM: 'random',
  JSON_DIFF_DONE: 'jsonDiffDone',
};

/**
 * Default values for graph generation
 * @type {Object}
 * @property {number} DEFAULT_NODE_COUNT - Default number of nodes
 * @property {number} DEFAULT_EDGE_COUNT - Default number of edges
 */
export const GRAPH_GENERATION_DEFAULTS = {
  DEFAULT_NODE_COUNT: 5,
  DEFAULT_EDGE_COUNT: 3,
};