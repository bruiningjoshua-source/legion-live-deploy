import React from 'react';
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw } from 'lucide-react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught:', error?.message, error?.stack);
    this.setState({ errorInfo });
  }

  render() {
    if (this.state.hasError) {
      const errorMessage = this.state.error?.message || 'Unknown error';
      
      return (
        <div className="min-h-screen bg-stone-950 flex items-center justify-center p-4">
          <div className="text-center max-w-md">
            <div className="w-16 h-16 bg-red-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-8 h-8 text-red-400" />
            </div>
            <h2 className="text-2xl font-bold text-amber-100 mb-2">Something went wrong</h2>
            <p className="text-amber-400/70 mb-4">
              We encountered an unexpected error. Please try refreshing the page.
            </p>
            <p className="text-red-400/60 text-xs mb-6 bg-red-900/20 p-2 rounded break-all">
              {errorMessage}
            </p>
            <Button
              onClick={() => window.location.reload()}
              className="bg-amber-600 hover:bg-amber-700 text-white"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh Page
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;