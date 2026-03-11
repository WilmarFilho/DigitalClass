import { SmartStepper } from '@/components/onboarding/SmartStepper';

export default function OnboardingPage() {
  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-3xl">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-extrabold tracking-tight lg:text-5xl mb-4">
            Bem-vindo à Digital <span className="text-indigo-600 dark:text-indigo-400">Class</span>
          </h1>
          <p className="text-neutral-600 dark:text-neutral-400 text-lg">
            Personalize sua experiência para começarmos.
          </p>
        </div>
        
        <SmartStepper />
      </div>
    </div>
  );
}
