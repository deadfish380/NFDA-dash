import { HandCoins } from "lucide-react";
import { Placeholder } from "@/components/shell/placeholder";

/**
 * Future phase (separate scope). The tab exists so the door is open — the grants
 * scraper + ranked deadline view slot in here without restructuring the app.
 */
export default function GrantsPage() {
  return (
    <Placeholder
      icon={HandCoins}
      title="Grants — coming in a later phase"
      eta="A separate add-on. Nothing here is built yet — the tab is reserved."
      points={[
        "A daily agent finds grants relevant to your organizations",
        "Ranked by deadline, so the ones expiring soonest surface first",
        "Lives right here as another tab — same dashboard, same login",
      ]}
    />
  );
}
