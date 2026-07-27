import type { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";

export function Placeholder({
  icon: Icon,
  title,
  eta,
  points,
}: {
  icon: LucideIcon;
  title: string;
  eta: string;
  points: string[];
}) {
  return (
    <main className="flex-1 p-5">
      <Card className="mx-auto max-w-xl p-8 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-accent text-accent-foreground">
          <Icon className="h-6 w-6" />
        </div>
        <h2 className="mt-4 text-lg font-semibold">{title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{eta}</p>
        <ul className="mx-auto mt-5 max-w-sm space-y-2 text-left text-sm text-muted-foreground">
          {points.map((p) => (
            <li key={p} className="flex gap-2">
              <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
              {p}
            </li>
          ))}
        </ul>
      </Card>
    </main>
  );
}
