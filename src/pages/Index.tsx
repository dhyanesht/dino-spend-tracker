import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";

const Index = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    // Check if user is logged in
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session) {
        navigate('/dashboard');
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (session) {
        navigate('/dashboard');
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center p-6">
      <div className="text-center">
        <h1 className="text-5xl font-bold mb-4 text-slate-900 dark:text-white">
          Dino's Spending Tracker
        </h1>
        <p className="text-xl text-slate-600 dark:text-slate-300 mb-8">
          Smart expense management made simple
        </p>
        <Button 
          size="lg" 
          onClick={() => navigate(user ? '/dashboard' : '/auth')}
          className="font-semibold"
        >
          {user ? 'Go to Dashboard' : 'Get Started'}
        </Button>
      </div>
    </div>
  );
};

export default Index;
