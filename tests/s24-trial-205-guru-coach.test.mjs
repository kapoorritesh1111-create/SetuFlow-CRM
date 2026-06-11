// S24-TRIAL-205 Pass C regression: Setu Guru trial coach wiring, registry-only
// step validation, telemetry, and non-trial isolation. Also re-asserts the
// Pass B forbidden-pattern rules on the tour provider after its Pass C edits.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

const coach = read('src/lib/setu-guru/trial-coach.ts');
const orgSearch = read('src/app/api/setu-guru/org-search/route.ts');
const stepRoute = read('src/app/api/setu-guru/trial-step/route.ts');
const provider = read('src/features/trial/tour-provider.tsx');
const widget = read('src/features/setu-guru/setu-guru-widget.tsx');
const layout = read('src/app/(app)/layout.tsx');

test('trial coach refuses non-guided-trial orgs (isolation rule)', () => {
  assert.ok(coach.includes('if (!capability?.is_trial || !capability.guided_mode_enabled) return null'));
});

test('coach answers carry the three context blocks: capability limits, journey, route-aware step', () => {
  assert.ok(coach.includes('Remaining on this guided trial'), 'capability snapshot block');
  assert.ok(coach.includes('deriveTrialJourney'), 'journey derivation block');
  assert.ok(coach.includes('buildShowStepAction'), 'registry-validated step suggestion');
  assert.ok(coach.includes('getTrialTemplateConfig'), 'answers reference the active template');
});

test('show_step is registry-validated everywhere (never arbitrary selectors)', () => {
  assert.ok(coach.includes('isTourStepId'), 'coach validates step ids');
  assert.ok(stepRoute.includes('isTourStepId'), 'telemetry route validates step ids');
  assert.ok(!coach.includes('querySelector'), 'coach must not touch the DOM');
  assert.ok(!widget.includes("querySelector('[data-tour"), 'widget delegates anchors to the provider');
});

test('org-search routes journey questions to the coach with telemetry', () => {
  assert.ok(orgSearch.includes('resolveTrialCoachContext'));
  assert.ok(orgSearch.includes('isTrialJourneyQuestion'));
  assert.ok(orgSearch.includes("mode: 'trial_journey'"));
  assert.ok(orgSearch.includes('writeTelemetry'));
});

test('show_step clicks are logged to setu_guru_telemetry', () => {
  assert.ok(stepRoute.includes("mode: 'trial_show_step_clicked'"));
  assert.ok(widget.includes('/api/setu-guru/trial-step'));
});

test('widget renders Show me only when a tour provider exists', () => {
  assert.ok(widget.includes('useTrialTour'));
  assert.ok(widget.includes('message.trialAction && trialTour'));
  assert.ok(widget.includes('guruStep='), 'cross-route steps navigate with guruStep param');
});

test('provider exposes showStep + consumes guruStep param', () => {
  assert.ok(provider.includes('showStep: (stepId: string) => boolean'));
  assert.ok(provider.includes("searchParams?.get('guruStep')"));
  assert.ok(provider.includes('export function useTrialTour'));
});

test('provider still honors forbidden-pattern rules after Pass C', () => {
  assert.ok(!provider.includes('MutationObserver'));
  assert.ok(!provider.includes('setTimeout'));
  assert.ok(!provider.includes('addEventListener'));
  assert.ok(!provider.includes('.remove()'));
  assert.ok(!provider.includes('innerHTML'));
});

test('layout wraps AppShell with the provider, still gated', () => {
  assert.ok(layout.includes('guidedTourEnabled ? ('));
  const providerIdx = layout.indexOf('<TrialTourProvider');
  const shellIdx = layout.indexOf('const shell = (');
  assert.ok(providerIdx > -1 && shellIdx > -1 && providerIdx > shellIdx, 'provider must wrap the shell');
});
