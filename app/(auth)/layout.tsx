export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-primary/10 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-2 mb-6">
          <div className="h-10 w-10 rounded-md bg-primary flex items-center justify-center text-primary-foreground font-bold text-lg">E</div>
          <div>
            <div className="font-bold text-xl">EstateFlow CRM</div>
            <div className="text-xs text-muted-foreground">Real Estate Sales OS</div>
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}
