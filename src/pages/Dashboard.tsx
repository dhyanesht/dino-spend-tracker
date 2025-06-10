
import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Upload, TrendingUp, PieChart, Calendar, List } from 'lucide-react';
import ExpenseOverview from '@/components/dashboard/ExpenseOverview';
import TrendsAnalysis from '@/components/dashboard/TrendsAnalysis';
import CategoryManager from '@/components/dashboard/CategoryManager';
import TransactionsList from '@/components/dashboard/TransactionsList';
import CSVImporter from '@/components/dashboard/CSVImporter';

const Dashboard = () => {
  const [activeTab, setActiveTab] = useState('overview');

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Dino's Spending Tracker</h1>
              <p className="text-slate-600 mt-1">Smart expense management made simple</p>
            </div>
            <CSVImporter />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-5 mb-8">
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
            <TabsTrigger value="categories" className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Categories
            </TabsTrigger>
            <TabsTrigger value="import" className="flex items-center gap-2">
              <Upload className="w-4 h-4" />
              Import Data
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <ExpenseOverview />
          </TabsContent>

          <TabsContent value="transactions" className="space-y-6">
            <TransactionsList />
          </TabsContent>

          <TabsContent value="trends" className="space-y-6">
            <TrendsAnalysis />
          </TabsContent>

          <TabsContent value="categories" className="space-y-6">
            <CategoryManager />
          </TabsContent>

          <TabsContent value="import" className="space-y-6">
            <Card className="p-8">
              <div className="text-center">
                <Upload className="w-16 h-16 mx-auto text-slate-400 mb-4" />
                <h2 className="text-xl font-semibold mb-2">Import Your Financial Data</h2>
                <p className="text-slate-600 mb-6">
                  Upload CSV files from your banks and credit cards. Our system will automatically
                  detect the format and categorize your transactions.
                </p>
                <CSVImporter />
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Dashboard;
