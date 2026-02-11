import { Button } from '@suggar-daddy/ui';

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-8">
      <h1 className="text-4xl font-bold">Suggar Daddy</h1>
      <p className="text-lg text-gray-600">Welcome to the platform</p>
      <Button>Get Started</Button>
    </main>
  );
}
