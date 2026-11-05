import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  errorMessage: string;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    errorMessage: '',
  };

  public static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      errorMessage: error.message || 'حدث خطأ غير متوقع.',
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Application ErrorBoundary caught an error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      let friendlyMessage = 'حدث خطأ أثناء معالجة الطلب. يرجى المحاولة مرة أخرى.';
      try {
        const parsed = JSON.parse(this.state.errorMessage);
        if (parsed && parsed.operationType) {
          friendlyMessage = `تعذر إتمام العملية (${parsed.operationType}) بسبب قيود الصلاحيات أو التحقق من البيانات.`;
        }
      } catch {
        friendlyMessage = this.state.errorMessage;
      }

      return (
        <div
          dir="rtl"
          className="min-h-screen bg-stone-50 flex items-center justify-center p-4 text-stone-900"
        >
          <div className="max-w-md w-full bg-white border border-stone-200 rounded-xl p-6 shadow-sm space-y-4">
            <h2 className="text-lg font-bold text-red-700">تنبيه من النظام</h2>
            <p className="text-sm text-stone-700 leading-relaxed">{friendlyMessage}</p>
            <button
              type="button"
              onClick={() => this.setState({ hasError: false, errorMessage: '' })}
              className="w-full py-2.5 px-4 bg-stone-900 text-white text-sm font-medium rounded-lg hover:bg-stone-800 transition-colors"
            >
              العودة والمحاولة مجدداً
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
