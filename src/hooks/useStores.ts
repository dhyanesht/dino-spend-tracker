import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { storeSchema } from '@/lib/validation';

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

// Improved function for smart store matching
export const findBestStoreMatch = (description: string, existingStores: Store[]): Store | null => {
  if (!description || !existingStores.length) {
    console.log('No description or stores provided for matching');
    return null;
  }
  
  const cleanDescription = description.toLowerCase().trim();
  console.log('Trying to match description:', cleanDescription);
  console.log('Available stores:', existingStores.map(s => s.name));
  
  // Extract clean store name from description
  const extractedName = extractStoreName(description).toLowerCase().trim();
  console.log('Extracted clean name for matching:', extractedName);
  
  // Try exact match with extracted name first
  const exactMatch = existingStores.find(store => 
    extractedName === store.name.toLowerCase().trim()
  );
  if (exactMatch) {
    console.log('Found exact match with extracted name:', exactMatch.name);
    return exactMatch;
  }
  
  // Try exact match with full description (fallback)
  const exactDescMatch = existingStores.find(store => 
    cleanDescription === store.name.toLowerCase().trim()
  );
  if (exactDescMatch) {
    console.log('Found exact match with full description:', exactDescMatch.name);
    return exactDescMatch;
  }
  
  // Try to find if any store name is contained in the extracted name
  const containsMatch = existingStores.find(store => {
    const storeName = store.name.toLowerCase().trim();
    const matches = extractedName.includes(storeName);
    if (matches) {
      console.log(`Extracted name "${extractedName}" contains store name "${storeName}"`);
    }
    return matches;
  });
  if (containsMatch) {
    console.log('Found contains match:', containsMatch.name);
    return containsMatch;
  }
  
  // Try reverse - if extracted name is contained in any store name
  const reverseMatch = existingStores.find(store => {
    const storeName = store.name.toLowerCase().trim();
    const matches = storeName.includes(extractedName);
    if (matches) {
      console.log(`Store name "${storeName}" contains extracted name "${extractedName}"`);
    }
    return matches;
  });
  if (reverseMatch) {
    console.log('Found reverse match:', reverseMatch.name);
    return reverseMatch;
  }
  
  // Try fuzzy matching by removing common words and checking similarity
  const fuzzyMatch = existingStores.find(store => {
    const storeName = store.name.toLowerCase().trim();
    const storeWords = storeName.split(/\s+/).filter(word => word.length > 2);
    const extractedWords = extractedName.split(/\s+/).filter(word => word.length > 2);
    
    // Check if most significant words match
    const commonWords = storeWords.filter(word => 
      extractedWords.some(extractedWord => 
        extractedWord.includes(word) || word.includes(extractedWord)
      )
    );
    
    const similarity = commonWords.length / Math.max(storeWords.length, extractedWords.length);
    if (similarity >= 0.7) { // 70% similarity threshold
      console.log(`Found fuzzy match: "${storeName}" vs "${extractedName}" (similarity: ${similarity})`);
      return true;
    }
    return false;
  });
  if (fuzzyMatch) {
    console.log('Found fuzzy match:', fuzzyMatch.name);
    return fuzzyMatch;
  }
  
  // Try common store patterns (more flexible matching)
  const storeKeywords = [
    'costco', 'walmart', 'target', 'amazon', 'starbucks', 'mcdonalds', 
    'shell', 'chevron', 'netflix', 'spotify', 'cvs', 'walgreens',
    'home depot', 'best buy', 'uber', 'lyft', 'safeway', 'kroger',
    'apple', 'google', 'microsoft', 'paypal', 'shoprite', 'acme'
  ];
  
  for (const keyword of storeKeywords) {
    if (extractedName.includes(keyword)) {
      const match = existingStores.find(store => 
        store.name.toLowerCase().includes(keyword)
      );
      if (match) {
        console.log(`Found keyword match for "${keyword}":`, match.name);
        return match;
      }
    }
  }
  
  console.log('No match found for:', extractedName);
  return null;
};

// Improved extract store name function
export const extractStoreName = (description: string): string => {
  if (!description) return '';
  
  console.log('Extracting store name from:', description);
  
  // Clean up common patterns in transaction descriptions
  let cleanName = description
    .replace(/\s+/g, ' ') // normalize whitespace
    .replace(/^(POS\s+|DEBIT\s+|PURCHASE\s+|ACH\s+|CHECK\s+)/i, '') // remove payment prefixes
    .replace(/\s+\d{2}\/\d{2}\/?\d*.*$/, '') // remove dates at end (MM/DD/YYYY or MM/DD)
    .replace(/\s+\d{4}-\d{2}-\d{2}.*$/, '') // remove ISO dates
    .replace(/\s+#\d+.*$/, '') // remove store/reference numbers
    .replace(/\s+\d{3,}$/, '') // remove trailing long numbers
    .replace(/\*+\d+$/, '') // remove masked card numbers
    .trim();
  
  // Remove state codes and location info at the end - improved pattern
  cleanName = cleanName
    .replace(/\s+(AL|AK|AZ|AR|CA|CO|CT|DE|FL|GA|HI|ID|IL|IN|IA|KS|KY|LA|ME|MD|MA|MI|MN|MS|MO|MT|NE|NV|NH|NJ|NM|NY|NC|ND|OH|OK|OR|PA|RI|SC|SD|TN|TX|UT|VT|VA|WA|WV|WI|WY)(\s|$)/i, '') // remove state codes
    .replace(/\s+(INC|LLC|CORP|CO|LTD)\.?$/i, '') // remove business suffixes
    .replace(/\s+STORE\s*\d*$/i, '') // remove store numbers
    .replace(/\s+LOCATION\s*\d*$/i, '') // remove location numbers
    .trim();
  
  // Keep original case but clean up
  const result = cleanName || description;
  console.log('Extracted store name:', result);
  return result;
};

export const useAddStore = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (store: Omit<Store, 'id' | 'created_at' | 'updated_at'>) => {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
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
