import { Button } from '@suggar-daddy/ui';

export default function AdminHomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-8">
      <h1 className="text-4xl font-bold">Admin Dashboard</h1>
      <p className="text-lg text-muted-foreground">
        Suggar Daddy management panel
      </p>
      <div className="flex gap-4">
        <Button variant="default">Users</Button>
        <Button variant="outline">Reports</Button>
        <Button variant="secondary">Settings</Button>
      </div>
    </main>
  );
}
