
import { describe, it, expect } from 'vitest';
import { extractStoreName, findBestStoreMatch, Store } from './useStores';

describe('extractStoreName', () => {
  it('should extract correctly for typical Lyft description', () => {
    expect(extractStoreName('LYFT *RIDE SUN 2AM 8552800278')).toBe('LYFT *RIDE');
    expect(extractStoreName('LYFT *RIDE SAT 1AM 8552800278')).toBe('LYFT *RIDE');
  });

  it('should handle cases with state codes and suffixes', () => {
    expect(extractStoreName('WALMART STORE 1234 CA')).toBe('WALMART');
    expect(extractStoreName('TARGET INC. #3456')).toBe('TARGET');
  });

  it('should trim and clean up trailing numbers or dates', () => {
    expect(extractStoreName('STARBUCKS 05/06/2024 0045')).toBe('STARBUCKS');
  });
});

describe('findBestStoreMatch', () => {
  const stores: Store[] = [
    { id: '1', name: 'LYFT *RIDE', category_name: 'Transport', created_at: '', updated_at: '' },
    { id: '2', name: 'WALMART', category_name: 'Groceries', created_at: '', updated_at: '' },
    { id: '3', name: 'STARBUCKS', category_name: 'Coffee', created_at: '', updated_at: '' },
  ];

  it('matches by exact extracted name', () => {
    const input = 'LYFT *RIDE SUN 2AM 8552800278';
    const match = findBestStoreMatch(input, stores);
    expect(match?.name).toBe('LYFT *RIDE');
  });

  it('matches by contained store name', () => {
    const input = 'WALMART STORE 3456';
    const match = findBestStoreMatch(input, stores);
    expect(match?.name).toBe('WALMART');
  });

  it('returns null if no match found', () => {
    const input = 'SOME RANDOM VENDOR';
    const match = findBestStoreMatch(input, stores);
    expect(match).toBeNull();
  });

  it('matches by fuzzy similarity', () => {
    const customStores: Store[] = [
      { id: '4', name: 'APPLE STORE', category_name: 'Tech', created_at: '', updated_at: '' },
    ];
    const input = 'APPLE SHOP';
    const match = findBestStoreMatch(input, customStores);
    expect(match?.name).toBe('APPLE STORE');
  });
});
