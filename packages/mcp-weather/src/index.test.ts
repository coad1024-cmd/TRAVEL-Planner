import { describe, it, expect, vi } from 'vitest';

// Mock MCP SDK to prevent server startup during import
vi.mock('@modelcontextprotocol/sdk/server/mcp.js', () => ({
  McpServer: class {
    tool = vi.fn();
    connect = vi.fn().mockResolvedValue(undefined);
  },
}));
vi.mock('@modelcontextprotocol/sdk/server/stdio.js', () => ({
  StdioServerTransport: class {},
}));

import { mockForecast } from './index.js';

describe('mcp-weather', () => {
  describe('mockForecast', () => {
    it('generates the requested number of days', () => {
      const result = mockForecast(34.0, 75.3, 5);
      expect(result.length).toBe(5);
    });

    it('returns Pahalgam-specific descriptions when coords match', () => {
      // Pahalgam is approx 34.01, 75.31
      const result = mockForecast(34.0161, 75.3147, 1);
      expect(result[0].description).toContain('Excellent weather') || 
      expect(result[0].description).toContain('Peak summer') ||
      expect(result[0].description).toContain('Warm and sunny');
    });

    it('returns generic description for other locations', () => {
      const result = mockForecast(10.0, 20.0, 1);
      expect(result[0].description).toBe('Partly cloudy with light breeze');
    });

    it('clamps days_ahead to 7', () => {
      const result = mockForecast(34, 75, 10);
      expect(result.length).toBe(7);
    });
  });
});
