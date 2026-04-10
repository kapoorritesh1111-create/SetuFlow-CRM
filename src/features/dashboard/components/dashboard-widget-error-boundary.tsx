'use client';

import React, { type ReactNode } from 'react';
import { WidgetEmptyState, WidgetShell } from '@/components/ui/widget-shell';

type DashboardWidgetErrorBoundaryProps = {
  title: string;
  description?: string;
  eyebrow?: string;
  fallbackTitle?: string;
  fallbackDescription?: string;
  children: ReactNode;
};

type DashboardWidgetErrorBoundaryState = {
  hasError: boolean;
};

export class DashboardWidgetErrorBoundary extends React.Component<
  DashboardWidgetErrorBoundaryProps,
  DashboardWidgetErrorBoundaryState
> {
  state: DashboardWidgetErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): DashboardWidgetErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.error(`Dashboard widget failed: ${this.props.title}`, error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <WidgetShell
          title={this.props.title}
          description={this.props.description}
          eyebrow={this.props.eyebrow}
        >
          <WidgetEmptyState
            title={this.props.fallbackTitle ?? 'Widget unavailable'}
            description={
              this.props.fallbackDescription ??
              'This dashboard widget hit a runtime issue. Refresh the page or continue using the other dashboard sections.'
            }
          />
        </WidgetShell>
      );
    }

    return this.props.children;
  }
}
