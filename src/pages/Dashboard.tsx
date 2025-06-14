import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Upload, TrendingUp, PieChart, Calendar, List, DollarSign, Banknote } from 'lucide-react';
import { ThemeToggle } from '@/components/theme-toggle';
import { BottomTabBar } from '@/components/ui/bottom-tab-bar';
import { useMobile } from '@/hooks/useMobile';
import ExpenseOverview from '@/components/dashboard/ExpenseOverview';
import TrendsAnalysis from '@/components/dashboard/TrendsAnalysis';
import CategoryManager from '@/components/dashboard/CategoryManager';
import TransactionsList from '@/components/dashboard/TransactionsList';
import CSVImporter from '@/components/dashboard/CSVImporter';
import SmartTransactionDialog from '@/components/dashboard/SmartTransactionDialog';
import BudgetManager from '@/components/dashboard/BudgetManager';
import { FEATURE_FLAG_PLAID } from '@/config';
import PlaidLink from '@/components/integrations/plaid/PlaidLink';

const Dashboard = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const isMobile = useMobile();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      {/* Header */}
      <header className="bg-white dark:bg-slate-900 shadow-sm border-b border-slate-200 dark:border-slate-700">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Dino's Spending Tracker</h1>
              <p className="text-slate-600 dark:text-slate-300 mt-1">Smart expense management made simple</p>
            </div>
            <div className="flex items-center gap-3">
              <ThemeToggle />
              {!isMobile && (
                <>
                  <SmartTransactionDialog />
                  <CSVImporter />
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className={`max-w-7xl mx-auto px-6 py-8 ${isMobile ? 'pb-32' : ''}`}>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          {/* Desktop Tab List - Hidden on Mobile */}
          <TabsList className={`grid w-full grid-cols-6 mb-8 ${isMobile ? 'hidden' : ''}`}>
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <PieChart className="w-4 h-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="transactions" className="flex items-center gap-2">
              <List className="w-4 h-4" />
              Transactions
            </TabsTrigger>
            <TabsTrigger value="trends" className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Trends
            </TabsTrigger>
            <TabsTrigger value="budget" className="flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              Budget
            </TabsTrigger>
            <TabsTrigger value="categories" className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Categories
            </TabsTrigger>
            <TabsTrigger value="import" className="flex items-center gap-2">
              <Upload className="w-4 h-4" />
              Import Data
            </TabsTrigger>
          </TabsList>

          {/* Mobile Action Buttons */}
          {isMobile && (
            <div className="flex gap-2 mb-6 overflow-x-auto">
              <SmartTransactionDialog />
              <CSVImporter />
            </div>
          )}

          <TabsContent value="overview" className="space-y-6">
            <ExpenseOverview setActiveTab={setActiveTab} />
          </TabsContent>

          <TabsContent value="transactions" className="space-y-6">
            <TransactionsList />
          </TabsContent>

          <TabsContent value="trends" className="space-y-6">
            <TrendsAnalysis />
          </TabsContent>

          <TabsContent value="budget" className="space-y-6">
            <BudgetManager />
          </TabsContent>

          <TabsContent value="categories" className="space-y-6">
            <CategoryManager />
          </TabsContent>

          <TabsContent value="import" className="space-y-6">
            <Card className="p-8 bg-white dark:bg-slate-800">
              <div className="text-center">
                <div className="flex justify-center items-center gap-4 mb-4">
                  <Upload className="w-16 h-16 text-slate-400 dark:text-slate-500" />
                  {FEATURE_FLAG_PLAID && <Banknote className="w-16 h-16 text-slate-400 dark:text-slate-500" />}
                </div>
                <h2 className="text-xl font-semibold mb-2 dark:text-white">Import Your Financial Data</h2>
                <p className="text-slate-600 dark:text-slate-300 mb-6 max-w-2xl mx-auto">
                  Manually upload CSV files from your banks, or automatically sync transactions
                  by connecting your bank account securely with Plaid.
                </p>
                <div className="flex justify-center items-center gap-4">
                  <CSVImporter />
                  {FEATURE_FLAG_PLAID && <PlaidLink />}
                </div>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {/* Mobile Bottom Tab Bar */}
      {isMobile && (
        <BottomTabBar activeTab={activeTab} onTabChange={setActiveTab} />
      )}
    </div>
  );
};

export default Dashboard;
