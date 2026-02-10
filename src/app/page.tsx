import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Mail, Zap, BarChart3 } from "lucide-react";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary" />
            <span className="text-lg font-semibold">ColdClaude</span>
          </div>
          <nav className="flex items-center gap-4">
            <Link href="/auth/signin">
              <Button variant="ghost" size="sm">
                Log in
              </Button>
            </Link>
            <Link href="/auth/signup">
              <Button size="sm">Get Started</Button>
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center px-4">
        <div className="mx-auto max-w-2xl text-center">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            Cold email,
            <br />
            <span className="text-primary">simplified.</span>
          </h1>
          <p className="mt-6 text-lg text-muted-foreground">
            Automate your outreach with multi-step email sequences.
            Track opens, clicks, and replies in one clean dashboard.
          </p>
          <div className="mt-10 flex items-center justify-center gap-4">
            <Link href="/auth/signup">
              <Button size="lg">Start for free</Button>
            </Link>
          </div>
        </div>

        <div className="mt-24 grid max-w-4xl grid-cols-1 gap-8 sm:grid-cols-3">
          <div className="text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
              <Zap className="h-6 w-6 text-primary" />
            </div>
            <h3 className="mt-4 font-semibold">Automated Sequences</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Multi-step follow-ups that send on autopilot.
            </p>
          </div>
          <div className="text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
              <Mail className="h-6 w-6 text-primary" />
            </div>
            <h3 className="mt-4 font-semibold">Personalization</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Merge tags that make every email feel personal.
            </p>
          </div>
          <div className="text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
              <BarChart3 className="h-6 w-6 text-primary" />
            </div>
            <h3 className="mt-4 font-semibold">Analytics</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Real-time tracking for opens, clicks, and replies.
            </p>
          </div>
        </div>
      </main>

      <footer className="border-t py-8">
        <div className="container text-center text-sm text-muted-foreground">
          ColdClaude
        </div>
      </footer>
    </div>
  );
}
