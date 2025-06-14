
# Personal Spending Tracker

A modern web application for tracking and analyzing personal expenses with intelligent categorization and comprehensive analytics.

**URL**: https://lovable.dev/projects/dbf29003-d0bb-4982-b6b2-31deddc617d5

## Current Features & Strengths

### Core Functionality
- **Smart CSV Import**: Advanced automated categorization system with intelligent store mapping
- **Comprehensive Dashboard**: Well-organized interface with dedicated sections for Overview, Transactions, Trends, Budget, Categories, and Import
- **Advanced Categorization**: Two-tier category system (parent/subcategories) with custom colors and budget allocation
- **Real-time Analytics**: Interactive charts and visualizations using Recharts for spending trends and insights
- **Store Intelligence**: Smart store name extraction and matching system that learns from transaction descriptions

### Technical Architecture
- **Modern Tech Stack**: Built with React, TypeScript, Tailwind CSS, and shadcn/ui components
- **Database Integration**: Supabase backend for reliable data persistence with Row Level Security policies
- **Efficient State Management**: TanStack Query for optimized data fetching, caching, and synchronization
- **Responsive Design**: Mobile-friendly interface with adaptive grid layouts and touch-optimized interactions

### User Experience
- **Clean Interface**: Professional design with clear visual hierarchy and intuitive navigation
- **Tab-based Navigation**: Organized dashboard with easy access to all major features
- **Visual Feedback**: Color-coded categories, progress indicators, and real-time toast notifications
- **Bulk Operations**: Efficient CSV import with batch processing and progress tracking
- **Interactive Charts**: Clickable and filterable data visualizations for better insights

### Data Management
- **Intelligent Transaction Processing**: Automatic extraction of store names from transaction descriptions
- **Flexible Category System**: Support for nested categories with customizable colors and budgets
- **Store Mapping**: Persistent store-to-category mappings that improve over time
- **Data Validation**: Robust error handling and data validation during import processes

### Analytics & Reporting
- **Spending Trends**: Monthly and categorical spending analysis
- **Budget Tracking**: Real-time budget vs. actual spending comparisons
- **Category Insights**: Detailed breakdowns of spending by category and subcategory
- **Visual Dashboards**: Multiple chart types including bar charts, pie charts, and trend lines

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/dbf29003-d0bb-4982-b6b2-31deddc617d5) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- **Frontend**: React 18 with TypeScript
- **Build Tool**: Vite for fast development and optimized builds
- **Styling**: Tailwind CSS for utility-first styling
- **UI Components**: shadcn-ui for consistent, accessible components
- **Backend**: Supabase for database, authentication, and real-time features
- **State Management**: TanStack Query for server state management
- **Charts**: Recharts for data visualization
- **Icons**: Lucide React for consistent iconography
- **Routing**: React Router for client-side navigation

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/dbf29003-d0bb-4982-b6b2-31deddc617d5) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/tips-tricks/custom-domain#step-by-step-guide)
