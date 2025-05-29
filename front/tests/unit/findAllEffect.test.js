import { validateJsonStructure, validateResponseData } from '@/effects/findAll';

describe('findAllEffect validation functions', () => {
  describe('validateJsonStructure', () => {
    it('should validate a correct JSON structure', () => {
      const validJson = JSON.stringify({
        objects: [
          {
            name: 'sword',
            type: 'weapon',
            attributes: { material: 'steel', condition: 'dull edges' },
            definition: 'Bladed combat tool',
            context: 'the sword'
          }
        ],
        relations: [
          {
            type: 'striking',
            source: 'mara',
            target: 'sword',
            definition: 'Applying forceful impact',
            context: 'Mara struck the sword with her hammer'
          }
        ]
      });

      const result = validateJsonStructure(validJson);
      expect(result).toBeDefined();
      expect(result.objects).toBeDefined();
      expect(result.relations).toBeDefined();
    });

    it('should throw an error for invalid JSON', () => {
      const invalidJson = '{invalid json}';
      expect(() => validateJsonStructure(invalidJson)).toThrow('Invalid JSON structure');
    });

    it('should throw an error for missing objects array', () => {
      const invalidJson = JSON.stringify({
        relations: []
      });
      expect(() => validateJsonStructure(invalidJson)).toThrow('Invalid objects structure');
    });

    it('should throw an error for invalid object structure', () => {
      const invalidJson = JSON.stringify({
        objects: [
          {
            name: 'sword',
            // Missing required fields
          }
        ],
        relations: []
      });
      expect(() => validateJsonStructure(invalidJson)).toThrow('Invalid object structure');
    });

    it('should throw an error for missing relations array', () => {
      const invalidJson = JSON.stringify({
        objects: []
      });
      expect(() => validateJsonStructure(invalidJson)).toThrow('Invalid relations structure');
    });

    it('should throw an error for invalid relation structure', () => {
      const invalidJson = JSON.stringify({
        objects: [],
        relations: [
          {
            // Missing required fields
          }
        ]
      });
      expect(() => validateJsonStructure(invalidJson)).toThrow('Invalid relation structure');
    });
  });

  describe('validateResponseData', () => {
    it('should validate a correct response structure', () => {
      const validResponse = {
        nodes: [{ id: '1', label: 'Node 1' }],
        edges: [{ source: '1', target: '2', label: 'Edge 1' }],
        links: [{ id: '1', relatedIds: ['2', '3'] }]
      };

      const result = validateResponseData(validResponse);
      expect(result).toBeDefined();
      expect(result.nodes).toEqual(validResponse.nodes);
      expect(result.edges).toEqual(validResponse.edges);
      expect(result.links).toEqual(validResponse.links);
    });

    it('should handle missing arrays in response', () => {
      const validResponse = {
        // No nodes, edges, or links
      };

      const result = validateResponseData(validResponse);
      expect(result).toBeDefined();
      expect(result.nodes).toEqual([]);
      expect(result.edges).toEqual([]);
      expect(result.links).toEqual([]);
    });

    it('should throw an error for non-object response', () => {
      expect(() => validateResponseData(null)).toThrow('Invalid response from server');
      expect(() => validateResponseData('string')).toThrow('Invalid response from server');
    });

    it('should throw an error for invalid nodes array', () => {
      const invalidResponse = {
        nodes: 'not an array',
        edges: [],
        links: []
      };

      expect(() => validateResponseData(invalidResponse)).toThrow('Invalid response structure: matchedNodes is not an array');
    });

    it('should throw an error for invalid edges array', () => {
      const invalidResponse = {
        nodes: [],
        edges: 'not an array',
        links: []
      };

      expect(() => validateResponseData(invalidResponse)).toThrow('Invalid response structure: matchedEdges is not an array');
    });

    it('should throw an error for invalid links array', () => {
      const invalidResponse = {
        nodes: [],
        edges: [],
        links: 'not an array'
      };

      expect(() => validateResponseData(invalidResponse)).toThrow('Invalid response structure: links is not an array');
    });
  });
});