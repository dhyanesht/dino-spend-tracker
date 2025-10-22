import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useStores } from "@/hooks/useStores";
import { useUpdateStore } from "@/hooks/useStores";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Merge } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

interface DuplicateGroup {
  primary: { id: string; name: string; category_name: string };
  duplicates: Array<{ id: string; name: string; category_name: string }>;
  similarity: number;
}

// Calculate Levenshtein distance
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
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }

  return matrix[len1][len2];
};

const calculateSimilarity = (str1: string, str2: string): number => {
  const maxLen = Math.max(str1.length, str2.length);
  if (maxLen === 0) return 1.0;
  return 1 - levenshteinDistance(str1, str2) / maxLen;
};

export default function StoreDuplicateFinder() {
  const { data: stores, isLoading } = useStores();
  const queryClient = useQueryClient();
  const [mergingGroup, setMergingGroup] = useState<DuplicateGroup | null>(null);
  const [isMerging, setIsMerging] = useState(false);

  // Find potential duplicate groups
  const duplicateGroups = useMemo(() => {
    if (!stores) return [];

    const groups: DuplicateGroup[] = [];
    const processed = new Set<string>();

    for (let i = 0; i < stores.length; i++) {
      if (processed.has(stores[i].id)) continue;

      const duplicates: Array<{ id: string; name: string; category_name: string; similarity: number }> = [];
      
      for (let j = i + 1; j < stores.length; j++) {
        if (processed.has(stores[j].id)) continue;

        const similarity = calculateSimilarity(
          stores[i].name.toUpperCase(),
          stores[j].name.toUpperCase()
        );

        // If similarity > 75%, consider it a potential duplicate
        if (similarity > 0.75) {
          duplicates.push({
            id: stores[j].id,
            name: stores[j].name,
            category_name: stores[j].category_name,
            similarity
          });
          processed.add(stores[j].id);
        }
      }

      if (duplicates.length > 0) {
        // Sort duplicates by similarity
        duplicates.sort((a, b) => b.similarity - a.similarity);
        
        groups.push({
          primary: {
            id: stores[i].id,
            name: stores[i].name,
            category_name: stores[i].category_name
          },
          duplicates: duplicates.map(d => ({
            id: d.id,
            name: d.name,
            category_name: d.category_name
          })),
          similarity: duplicates[0].similarity
        });
        processed.add(stores[i].id);
      }
    }

    // Sort groups by number of duplicates
    return groups.sort((a, b) => b.duplicates.length - a.duplicates.length);
  }, [stores]);

  const handleMerge = async () => {
    if (!mergingGroup) return;

    setIsMerging(true);
    try {
      const duplicateIds = mergingGroup.duplicates.map(d => d.id);

      // Update all transactions using duplicate stores to use the primary store
      const { error: updateError } = await supabase
        .from('transactions')
        .update({ category: mergingGroup.primary.category_name })
        .in('category', mergingGroup.duplicates.map(d => d.name));

      if (updateError) throw updateError;

      // Delete duplicate stores
      const { error: deleteError } = await supabase
        .from('stores')
        .delete()
        .in('id', duplicateIds);

      if (deleteError) throw deleteError;

      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['stores'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });

      toast.success(`Merged ${mergingGroup.duplicates.length} duplicate store(s) into "${mergingGroup.primary.name}"`);
      setMergingGroup(null);
    } catch (error: any) {
      console.error('Error merging stores:', error);
      toast.error('Failed to merge stores: ' + error.message);
    } finally {
      setIsMerging(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-6">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  if (duplicateGroups.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Store Duplicate Finder</CardTitle>
          <CardDescription>
            No potential duplicates found. Your store mappings look clean!
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Store Duplicate Finder</CardTitle>
          <CardDescription>
            Found {duplicateGroups.length} group(s) of potential duplicate stores. Review and merge them to clean up your data.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {duplicateGroups.map((group, idx) => (
              <Card key={idx} className="bg-muted/50">
                <CardContent className="p-4">
                  <div className="space-y-2">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="font-semibold text-sm">Primary Store:</p>
                        <p className="text-base font-medium">{group.primary.name}</p>
                        <p className="text-xs text-muted-foreground">Category: {group.primary.category_name}</p>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => setMergingGroup(group)}
                        className="ml-2"
                      >
                        <Merge className="h-4 w-4 mr-1" />
                        Merge
                      </Button>
                    </div>
                    
                    <div className="pt-2 border-t">
                      <p className="font-semibold text-sm mb-1">
                        Duplicates ({group.duplicates.length}):
                      </p>
                      <ul className="space-y-1">
                        {group.duplicates.map((dup) => (
                          <li key={dup.id} className="text-sm pl-4 border-l-2 border-muted-foreground/30">
                            <span className="font-medium">{dup.name}</span>
                            <span className="text-xs text-muted-foreground ml-2">
                              ({dup.category_name})
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={!!mergingGroup} onOpenChange={(open) => !open && setMergingGroup(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Merge Duplicate Stores?</AlertDialogTitle>
            <AlertDialogDescription>
              This will merge {mergingGroup?.duplicates.length} duplicate store(s) into "{mergingGroup?.primary.name}".
              All transactions associated with the duplicate stores will be updated to use the primary store.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isMerging}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleMerge} disabled={isMerging}>
              {isMerging ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Merging...
                </>
              ) : (
                'Merge Stores'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
