
import React, { useCallback, useState } from 'react';
import { usePlaidLink } from 'react-plaid-link';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { Banknote } from 'lucide-react';

const PlaidLink = () => {
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const queryClient = useQueryClient();

  const generateLinkToken = useCallback(async () => {
    try {
      const { data, error } = await supabase.functions.invoke('create-link-token');
      if (error) throw error;
      setLinkToken(data.link_token);
    } catch (error) {
      console.error('Error generating link token:', error);
      toast.error('Could not connect to Plaid. Please try again.');
      setIsConnecting(false);
    }
  }, []);
  
  const onSuccess = useCallback(async (public_token: string) => {
    const toastId = toast.loading('Securely connecting your bank account...');
    try {
        const { data, error } = await supabase.functions.invoke('exchange-public-token', {
            body: { public_token },
        });

        if (error || !data.success) throw new Error('Failed to exchange public token.');
        
        toast.loading('Syncing transactions for the first time...', { id: toastId });

        const { data: syncData, error: syncError } = await supabase.functions.invoke('sync-transactions', {
            body: { item_id: data.item_id },
        });

        if (syncError) throw syncError;
        
        toast.success(`Successfully connected and synced ${syncData.new_transactions} new transactions.`, { id: toastId });
        queryClient.invalidateQueries({ queryKey: ['transactions'] });

    } catch (error) {
        console.error('Plaid integration error:', error);
        toast.error('An error occurred during Plaid integration.', { id: toastId });
    } finally {
        setIsConnecting(false);
        setLinkToken(null);
    }
  }, [queryClient]);

  const onExit = useCallback(() => {
    setIsConnecting(false);
    setLinkToken(null);
  }, []);

  const { open, ready } = usePlaidLink({
    token: linkToken,
    onSuccess,
    onExit,
  });
  
  const handleClick = async () => {
    setIsConnecting(true);
    await generateLinkToken();
  };
  
  React.useEffect(() => {
    if (ready && linkToken) {
      open();
    }
  }, [ready, linkToken, open]);

  return (
    <Button onClick={handleClick} disabled={isConnecting}>
      <Banknote className="mr-2" />
      {isConnecting ? 'Connecting...' : 'Connect Bank Account'}
    </Button>
  );
};

export default PlaidLink;
