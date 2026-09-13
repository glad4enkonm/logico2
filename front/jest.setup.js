import '@testing-library/jest-dom/extend-expect';

// Polyfill TextEncoder and TextDecoder
global.TextEncoder = require('util').TextEncoder;
global.TextDecoder = require('util').TextDecoder;

// Polyfill DOM
const { JSDOM } = require('jsdom');

global.document = new JSDOM('<!doctype html><html><body></body></html>').window.document;
global.window = global.document.defaultView;
global.navigator = global.window.navigator;
global.requestAnimationFrame = callback => setTimeout(callback, 0);
global.cancelAnimationFrame = id => clearTimeout(id);

// Mock Web Worker (G6's layout controller requires Worker when workerEnabled: true)
global.Worker = class MockWorker {
  constructor() {}
  postMessage() {}
  terminate() {}
  addEventListener() {}
  removeEventListener() {}
  onmessage() {}
  onerror() {}
};

// Mock URL.createObjectURL / revokeObjectURL (G6's layout worker factory uses blob URLs)
if (!URL.createObjectURL) {
  URL.createObjectURL = () => 'blob:mock-url';
}
if (!URL.revokeObjectURL) {
  URL.revokeObjectURL = () => {};
}

// Mock canvas
global.HTMLCanvasElement.prototype.getContext = function() {
  return {
    fillRect: function() {},
    clearRect: function() {},
    getImageData: function() {
      return {
        data: new ArrayBuffer(0)
      };
    },
    putImageData: function() {},
    createPattern: function() {
      return {};
    },
    drawImage: function() {},
    save: function() {},
    restore: function() {},
    scale: function() {},
    rotate: function() {},
    translate: function() {},
    transform: function() {},
    setTransform: function() {},
    clip: function() {},
    resetClip: function() {},
    isPointInPath: function() {},
    isPointInStroke: function() {},
    fill: function() {},
    stroke: function() {},
    drawFocusIfNeeded: function() {},
    clearFocusIfNeeded: function() {},
    scrollPathIntoView: function() {},
    fillText: function() {},
    strokeText: function() {},
    measureText: function() {},
    getLineDash: function() {},
    setLineDash: function() {},
    createConicGradient: function() {},
    createLinearGradient: function() {},
    createPattern: function() {},
    createRadialGradient: function() {},
    drawImage: function() {},
    fill: function() {},
    fillRect: function() {},
    isPointInPath: function() {},
    isPointInStroke: function() {},
    measureText: function() {},
    putImageData: function() {},
    stroke: function() {},
    strokeRect: function() {},
    clearRect: function() {},
    save: function() {},
    restore: function() {},
    scale: function() {},
    rotate: function() {},
    translate: function() {},
    transform: function() {},
    setTransform: function() {},
    clip: function() {},
    resetClip: function() {},
    isPointInPath: function() {},
    isPointInStroke: function() {},
    fillText: function() {},
    strokeText: function() {},
    measureText: function() {},
    getLineDash: function() {},
    setLineDash: function() {},
    createConicGradient: function() {},
    createLinearGradient: function() {},
    createPattern: function() {},
    createRadialGradient: function() {},
    drawImage: function() {},
    fill: function() {},
    fillRect: function() {},
    isPointInPath: function() {},
    isPointInStroke: function() {},
    measureText: function() {},
    putImageData: function() {},
    stroke: function() {},
    strokeRect: function() {}
  };
};
