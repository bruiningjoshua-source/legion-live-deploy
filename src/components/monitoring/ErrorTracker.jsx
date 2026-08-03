import React, { createContext, useContext, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';

const ErrorTrackerContext = createContext(null);

// Error severity levels
export const ErrorSeverity = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical'
};

// Error categories
export const ErrorCategory = {
  NETWORK: 'network',
  AUTH: 'auth',
  PAYMENT: 'payment',
  STREAM: 'stream',
  UI: 'ui',
  VALIDATION: 'validation',
  UNKNOWN: 'unknown'
};

class ErrorTrackerService {
  constructor() {
    this.errors = [];
    this.maxErrors = 100;
    this.user = null;
    this.sessionId = this.generateSessionId();
  }

  generateSessionId() {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  setUser(user) {
    this.user = user;
  }

  categorizeError(error) {
    const message = error.message?.toLowerCase() || '';
    
    if (message.includes('network') || message.includes('fetch') || message.includes('timeout')) {
      return ErrorCategory.NETWORK;
    }
    if (message.includes('auth') || message.includes('unauthorized') || message.includes('login')) {
      return ErrorCategory.AUTH;
    }
    if (message.includes('payment') || message.includes('stripe') || message.includes('checkout')) {
      return ErrorCategory.PAYMENT;
    }
    if (message.includes('stream') || message.includes('agora') || message.includes('video')) {
      return ErrorCategory.STREAM;
    }
    if (message.includes('render') || message.includes('component')) {
      return ErrorCategory.UI;
    }
    if (message.includes('validation') || message.includes('invalid')) {
      return ErrorCategory.VALIDATION;
    }
    
    return ErrorCategory.UNKNOWN;
  }

  determineSeverity(error, category) {
    if (category === ErrorCategory.PAYMENT || category === ErrorCategory.AUTH) {
      return ErrorSeverity.HIGH;
    }
    if (category === ErrorCategory.STREAM) {
      return ErrorSeverity.MEDIUM;
    }
    if (error.message?.includes('critical') || error.message?.includes('fatal')) {
      return ErrorSeverity.CRITICAL;
    }
    return ErrorSeverity.LOW;
  }

  async captureError(error, context = {}) {
    const category = this.categorizeError(error);
    const severity = this.determineSeverity(error, category);
    
    const errorData = {
      id: `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      sessionId: this.sessionId,
      user: this.user ? { email: this.user.email, id: this.user.id } : null,
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack
      },
      category,
      severity,
      context: {
        ...context,
        url: window.location.href,
        userAgent: navigator.userAgent,
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight
        }
      }
    };

    // Store locally
    this.errors.push(errorData);
    if (this.errors.length > this.maxErrors) {
      this.errors.shift();
    }

    // Forward to Sentry (production error monitoring) — non-blocking.
    import('@/lib/sentry.js').then(({ reportError }) => {
      reportError(error, { category, severity, ...context });
    }).catch(() => {});

    // Log to console in development
    console.error('[ErrorTracker]', errorData);

    // Send critical errors immediately
    if (severity === ErrorSeverity.CRITICAL || severity === ErrorSeverity.HIGH) {
      await this.sendToServer(errorData);
    }

    return errorData;
  }

  async sendToServer(errorData) {
    try {
      // Store in database for admin review
      await base44.entities.PlatformAnalytics.create({
        metric_type: 'error',
        metric_name: errorData.category,
        metric_value: 1,
        metadata: errorData
      });
    } catch (e) {
      console.error('Failed to send error to server:', e);
    }
  }

  captureMessage(message, level = 'info', context = {}) {
    const messageData = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      sessionId: this.sessionId,
      user: this.user ? { email: this.user.email } : null,
      message,
      level,
      context
    };

    console.log('[ErrorTracker]', level.toUpperCase(), message, context);
    return messageData;
  }

  getErrors() {
    return [...this.errors];
  }

  clearErrors() {
    this.errors = [];
  }
}

const errorTracker = new ErrorTrackerService();

export function ErrorTrackerProvider({ children, user }) {
  useEffect(() => {
    if (user) {
      errorTracker.setUser(user);
      import('@/lib/sentry.js').then(({ setSentryUser }) => setSentryUser(user)).catch(() => {});
    }
  }, [user]);

  // Global error handler
  useEffect(() => {
    const handleError = (event) => {
      errorTracker.captureError(event.error || new Error(event.message), {
        source: 'window.onerror',
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno
      });
    };

    const handleUnhandledRejection = (event) => {
      errorTracker.captureError(
        event.reason instanceof Error ? event.reason : new Error(String(event.reason)),
        { source: 'unhandledrejection' }
      );
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  const captureError = useCallback((error, context) => {
    return errorTracker.captureError(error, context);
  }, []);

  const captureMessage = useCallback((message, level, context) => {
    return errorTracker.captureMessage(message, level, context);
  }, []);

  return (
    <ErrorTrackerContext.Provider value={{ captureError, captureMessage, getErrors: () => errorTracker.getErrors() }}>
      {children}
    </ErrorTrackerContext.Provider>
  );
}

export function useErrorTracker() {
  const context = useContext(ErrorTrackerContext);
  if (!context) {
    return {
      captureError: (error, ctx) => errorTracker.captureError(error, ctx),
      captureMessage: (msg, level, ctx) => errorTracker.captureMessage(msg, level, ctx),
      getErrors: () => []
    };
  }
  return context;
}

export default errorTracker;