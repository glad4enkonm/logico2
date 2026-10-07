export const LAYOUT_METHODS = [
  { value: 'forceAtlas2', label: 'Force Atlas 2' },
  { value: 'gForce', label: 'GForce' },
  { value: 'force', label: 'Force' },
  { value: 'fruchterman', label: 'Fruchterman' },
  { value: 'circular', label: 'Circular' },
  { value: 'grid', label: 'Grid' },
  { value: 'concentric', label: 'Concentric' },
  { value: 'dagre', label: 'Dagre (Hierarchical)' },
  { value: 'radial', label: 'Radial' },
  { value: 'random', label: 'Random' },
];

export const LAYOUT_PARAMS = {
  forceAtlas2: {
    kr: { label: 'Repulsion (kr)', type: 'number', default: 1.0, step: 0.1 },
    kg: { label: 'Gravity (kg)', type: 'number', default: 1.0, step: 0.1 },
    speed: { label: 'Speed', type: 'number', default: 1.0, step: 0.1 },
    dissuadeHubs: { label: 'Dissuade Hubs', type: 'boolean', default: true },
    linLog: { label: 'LinLog Mode', type: 'boolean', default: false },
    preventOverlap: { label: 'Prevent Overlap', type: 'boolean', default: true },
    nodeSpacing: { label: 'Node Spacing', type: 'number', default: 50 },
    workerEnabled: { label: 'Worker Enabled', type: 'boolean', default: true },
  },
  gForce: {
    preventOverlap: { label: 'Prevent Overlap', type: 'boolean', default: true },
    coulombDisScale: { label: 'Coulomb Dis Scale', type: 'number', default: 0.0015, step: 0.0001 },
    nodeSpacing: { label: 'Node Spacing', type: 'number', default: 50 },
    linkDistance: { label: 'Link Distance', type: 'number', default: 150 },
    workerEnabled: { label: 'Worker Enabled', type: 'boolean', default: true },
  },
  force: {
    preventOverlap: { label: 'Prevent Overlap', type: 'boolean', default: true },
    nodeSpacing: { label: 'Node Spacing', type: 'number', default: 50 },
    edgeStrength: { label: 'Edge Strength', type: 'number', default: 50, step: 5 },
    nodeStrength: { label: 'Node Strength', type: 'number', default: -30, step: 5 },
    damping: { label: 'Damping', type: 'number', default: 0.9, step: 0.05 },
    workerEnabled: { label: 'Worker Enabled', type: 'boolean', default: true },
  },
  fruchterman: {
    gravity: { label: 'Gravity', type: 'number', default: 10, step: 1 },
    speed: { label: 'Speed', type: 'number', default: 1, step: 0.1 },
    clustering: { label: 'Clustering', type: 'boolean', default: false },
    clusterGravity: { label: 'Cluster Gravity', type: 'number', default: 10, step: 1 },
    workerEnabled: { label: 'Worker Enabled', type: 'boolean', default: true },
  },
  circular: {
    radius: { label: 'Radius', type: 'number', default: 300 },
    clockwise: { label: 'Clockwise', type: 'boolean', default: true },
    divisions: { label: 'Divisions', type: 'number', default: 1 },
    ordering: { label: 'Ordering', type: 'select', default: 'topology', options: ['topology', 'topologyDirected', 'degree'] },
  },
  grid: {
    rows: { label: 'Rows', type: 'number', default: 5 },
    cols: { label: 'Columns', type: 'number', default: 5 },
  },
  concentric: {
    minRadius: { label: 'Min Radius', type: 'number', default: 50 },
    maxRadius: { label: 'Max Radius', type: 'number', default: 300 },
    preventOverlap: { label: 'Prevent Overlap', type: 'boolean', default: true },
  },
  dagre: {
    rankdir: { label: 'Direction', type: 'select', default: 'TB', options: ['TB', 'BT', 'LR', 'RL'] },
    nodesep: { label: 'Node Separation', type: 'number', default: 50 },
    ranksep: { label: 'Rank Separation', type: 'number', default: 50 },
  },
  radial: {
    radius: { label: 'Radius', type: 'number', default: 300 },
    preventOverlap: { label: 'Prevent Overlap', type: 'boolean', default: true },
    nodeSpacing: { label: 'Node Spacing', type: 'number', default: 50 },
  },
  random: {},
};
