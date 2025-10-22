import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { storeSchema } from '@/lib/validation';
import { useAuth } from '@/contexts/AuthContext';

export interface Store {
  id: string;
  name: string;
  category_name: string;
  created_at: string;
  updated_at: string;
}

export const useStores = () => {
  return useQuery({
    queryKey: ['stores'],
    queryFn: async () => {
      console.log('Fetching stores...');
      const { data, error } = await supabase
        .from('stores')
        .select('*')
        .order('name', { ascending: true });
      
      if (error) {
        console.error('Error fetching stores:', error);
        throw error;
      }
      console.log('Stores fetched:', data?.length, 'records');
      console.log('Store names in database:', data?.map(s => s.name));
      return data as Store[];
    },
  });
};

export const useStoreByName = (storeName: string) => {
  return useQuery({
    queryKey: ['store', storeName],
    queryFn: async () => {
      if (!storeName) return null;
      
      console.log('Looking up store:', storeName);
      const { data, error } = await supabase
        .from('stores')
        .select('*')
        .eq('name', storeName)
        .maybeSingle();
      
      if (error) {
        console.error('Error looking up store:', error);
        throw error;
      }
      console.log('Store lookup result:', data);
      return data as Store | null;
    },
    enabled: !!storeName,
  });
};

// Calculate Levenshtein distance between two strings
const levenshteinDistance = (str1: string, str2: string): number => {
  const len1 = str1.length;
  const len2 = str2.length;
  const matrix: number[][] = [];

  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,      // deletion
        matrix[i][j - 1] + 1,      // insertion
        matrix[i - 1][j - 1] + cost // substitution
      );
    }
  }

  return matrix[len1][len2];
};

// Calculate similarity ratio between two strings (0-1)
const calculateSimilarityRatio = (str1: string, str2: string): number => {
  const maxLen = Math.max(str1.length, str2.length);
  if (maxLen === 0) return 1.0;
  const distance = levenshteinDistance(str1, str2);
  return 1 - distance / maxLen;
};

// Improved function for smart store matching with Levenshtein distance
export const findBestStoreMatch = (description: string, existingStores: Store[]): Store | null => {
  if (!description || existingStores.length === 0) return null;

  const cleanedDescription = extractStoreName(description);
  if (!cleanedDescription) return null;
  
  // First, try exact match with cleaned description
  let match = existingStores.find(
    store => store.name.toUpperCase() === cleanedDescription
  );
  if (match) return match;

  // Try to find if cleaned description contains any existing store name (exact substring)
  match = existingStores.find(
    store => {
      const storeName = store.name.toUpperCase();
      return cleanedDescription.includes(storeName) && storeName.length > 3;
    }
  );
  if (match) return match;

  // Try to find if any existing store name contains the cleaned description
  match = existingStores.find(
    store => {
      const storeName = store.name.toUpperCase();
      return storeName.includes(cleanedDescription) && cleanedDescription.length > 3;
    }
  );
  if (match) return match;

  // Advanced fuzzy matching using Levenshtein distance
  let bestMatch: Store | null = null;
  let bestSimilarity = 0;

  for (const store of existingStores) {
    const storeName = store.name.toUpperCase();
    
    // Calculate similarity
    const similarity = calculateSimilarityRatio(cleanedDescription, storeName);
    
    // Also check if the beginning of the strings match well
    const prefixLength = Math.min(cleanedDescription.length, storeName.length);
    const prefixSimilarity = calculateSimilarityRatio(
      cleanedDescription.substring(0, prefixLength),
      storeName.substring(0, prefixLength)
    );
    
    // Weighted similarity (give more weight to prefix matching)
    const weightedSimilarity = (similarity * 0.6) + (prefixSimilarity * 0.4);
    
    if (weightedSimilarity > bestSimilarity) {
      bestSimilarity = weightedSimilarity;
      bestMatch = store;
    }
  }

  // Return match if similarity is high enough (75% threshold)
  if (bestSimilarity > 0.75) {
    return bestMatch;
  }

  // Keyword-based matching as fallback
  const keywords = cleanedDescription.split(' ').filter(word => word.length > 3);
  if (keywords.length > 0) {
    const keywordMatch = existingStores.find(store => {
      const storeKeywords = store.name.toUpperCase().split(' ').filter(w => w.length > 3);
      const matchingKeywords = keywords.filter(keyword => 
        storeKeywords.some(storeKeyword => 
          storeKeyword.includes(keyword) || keyword.includes(storeKeyword)
        )
      );
      // Match if at least 2 keywords match, or 1 keyword for short names
      return matchingKeywords.length >= Math.min(2, keywords.length);
    });
    if (keywordMatch) return keywordMatch;
  }

  return null;
};

// Helper function to clean and extract store name from transaction description
export const extractStoreName = (description: string): string => {
  let cleaned = description.toUpperCase().trim();
  
  // Remove common payment processor prefixes
  const prefixes = ['SQ *', 'SQ*', 'PAYPAL *', 'PAYPAL*', 'STRIPE *', 'STRIPE*', 
                   'VENMO *', 'VENMO*', 'ZELLE *', 'ZELLE*', 'CASHAPP *', 'CASHAPP*',
                   'TST*', 'TST *', 'MTA*', 'MTA *', 'POS ', 'DEBIT ', 'PURCHASE '];
  for (const prefix of prefixes) {
    if (cleaned.startsWith(prefix)) {
      cleaned = cleaned.substring(prefix.length).trim();
    }
  }
  
  // Remove phone numbers (various formats)
  cleaned = cleaned.replace(/\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b/g, '');  // 888-254-7299
  cleaned = cleaned.replace(/\b\d{10,11}\b/g, '');  // 8552800278
  
  // Remove dates and times
  cleaned = cleaned.replace(/\b\d{1,2}[-/]\d{1,2}[-/]?\d{0,4}\b/g, '');  // 01-16, 12/25
  cleaned = cleaned.replace(/\b(MON|TUE|WED|THU|FRI|SAT|SUN)\s+\d{1,2}(AM|PM)\b/gi, '');  // FRI 9PM
  
  // Remove long transaction IDs (8+ consecutive alphanumeric chars at end)
  cleaned = cleaned.replace(/[A-Z0-9]{8,}$/g, '');
  
  // Remove location/state codes at the end (NY, NJ, CA, etc.) followed by numbers
  cleaned = cleaned.replace(/\s+[A-Z]{2}\d+.*$/g, '');
  
  // Remove common payment suffixes
  const suffixes = [
    'WEB SALES', 'WEB SALE', 'ONLINE', 'PAC', 'USD', 'INR', 'EUR', 'GBP',
    'PURCHASE', 'PYMT', 'PAYMENT', 'DC', 'DEBIT', 'CREDIT', 'INTL'
  ];
  for (const suffix of suffixes) {
    const regex = new RegExp(`\\s+${suffix}\\s*$`, 'i');
    cleaned = cleaned.replace(regex, '');
  }
  
  // Remove amounts with currency symbols or decimal points
  cleaned = cleaned.replace(/\$?\d+\.\d{2}\s*(@|AT)?/g, '');
  cleaned = cleaned.replace(/\d+\.\d+\s*(USD|INR|EUR|GBP)/gi, '');
  
  // Remove extra whitespace and trim
  cleaned = cleaned.replace(/\s+/g, ' ').trim();
  
  // Remove trailing asterisks and special characters
  cleaned = cleaned.replace(/[*#]+$/g, '').trim();
  
  // Take first 50 characters as the store name
  return cleaned.substring(0, 50).trim();
};

export const useAddStore = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async (store: Omit<Store, 'id' | 'created_at' | 'updated_at'>) => {
      if (!user) throw new Error('You must be logged in to add stores');
      
      // Validate input
      const validated = storeSchema.parse({
        name: store.name,
        category_name: store.category_name
      });
      
      console.log('Adding store mapping:', validated);
      
      // Check if store already exists to avoid duplicates
      const { data: existingStore } = await supabase
        .from('stores')
        .select('*')
        .eq('name', validated.name)
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (existingStore) {
        console.log('Store already exists, updating instead:', existingStore);
        const { data, error } = await supabase
          .from('stores')
          .update({ category_name: validated.category_name, updated_at: new Date().toISOString() })
          .eq('id', existingStore.id)
          .select()
          .single();
        
        if (error) {
          console.error('Error updating existing store:', error);
          throw error;
        }
        console.log('Existing store updated successfully:', data);
        return data;
      }
      
      const { data, error } = await supabase
        .from('stores')
        .insert([{
          name: validated.name,
          category_name: validated.category_name,
          user_id: user.id
        }])
        .select()
        .single();
      
      if (error) {
        console.error('Error adding store:', error);
        throw error;
      }
      console.log('New store added successfully:', data);
      return data;
    },
    onSuccess: () => {
      console.log('Invalidating stores query cache');
      queryClient.invalidateQueries({ queryKey: ['stores'] });
    },
  });
};

// Batch insert stores
export const useAddMultipleStores = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async (stores: Omit<Store, 'id' | 'created_at' | 'updated_at'>[]) => {
      if (!user) throw new Error('You must be logged in to add stores');
      
      console.log('Batch adding store mappings:', stores.length);
      
      // Check for existing stores in one query
      const storeNames = stores.map(s => s.name);
      const { data: existingStores } = await supabase
        .from('stores')
        .select('*')
        .in('name', storeNames)
        .eq('user_id', user.id);
      
      const existingStoreNames = new Set(existingStores?.map(s => s.name) || []);
      
      // Filter out stores that already exist
      const newStores = stores
        .filter(s => !existingStoreNames.has(s.name))
        .map(s => ({
          name: s.name,
          category_name: s.category_name,
          user_id: user.id
        }));
      
      if (newStores.length === 0) {
        console.log('All stores already exist');
        return [];
      }
      
      // Batch insert all new stores
      const { data, error } = await supabase
        .from('stores')
        .insert(newStores)
        .select();
      
      if (error) {
        console.error('Error batch adding stores:', error);
        throw error;
      }
      console.log('Batch added stores successfully:', data?.length);
      return data;
    },
    onSuccess: () => {
      console.log('Invalidating stores query cache');
      queryClient.invalidateQueries({ queryKey: ['stores'] });
    },
  });
};

export const useUpdateStore = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Store> & { id: string }) => {
      console.log('Updating store:', id, updates);
      const { data, error } = await supabase
        .from('stores')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      
      if (error) {
        console.error('Error updating store:', error);
        throw error;
      }
      console.log('Store updated successfully:', data);
      return data;
    },
    onSuccess: () => {
      console.log('Invalidating stores query cache');
      queryClient.invalidateQueries({ queryKey: ['stores'] });
    },
  });
};
