'use client';
import { StateMessage } from '@/components/ui/state-message';
export default function ClientOnboardingError({ error }: { error: Error }) { return <StateMessage title="Client onboarding failed to load" description={error.message} tone="danger" />; }
