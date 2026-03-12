import { SmartStepper } from '@/components/onboarding/SmartStepper';

export const dynamic = 'force-dynamic';

export default function OnboardingPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-3xl">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-extrabold tracking-tight lg:text-5xl mb-4 text-slate-900">
            Bem-vindo à Digital <span className="text-slate-600">Class</span>
          </h1>
          <p className="text-slate-600 text-lg">
            Personalize sua experiência para começarmos.
          </p>
        </div>

        <SmartStepper />
      </div>
    </div>
  );
}
