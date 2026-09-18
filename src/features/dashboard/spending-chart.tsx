import {
  formatMoney,
  getCategoryTotals,
} from "@/features/subscriptions/calculations";
import type { Subscription } from "@/features/subscriptions/schema";

const barColors = ["#27745a", "#397a9a", "#bd613f", "#7657a8", "#df9a2f"];

export function SpendingChart({
  subscriptions,
}: {
  subscriptions: Subscription[];
}) {
  const totals = getCategoryTotals(subscriptions);
  const largestAmount = Math.max(...totals.map((item) => item.amountMinor));

  return (
    <figure aria-labelledby="spending-chart-title">
      <figcaption id="spending-chart-title" className="sr-only">
        Estimated monthly spending by category
      </figcaption>
      <div className="space-y-5">
        {totals.map((item, index) => {
          const width = `${Math.max(8, (item.amountMinor / largestAmount) * 100)}%`;

          return (
            <div key={item.category}>
              <div className="mb-2 flex items-center justify-between gap-3 text-sm">
                <span className="truncate font-semibold text-ink">
                  {item.category}
                </span>
                <span className="shrink-0 font-bold text-ink">
                  {formatMoney(item.amountMinor)}
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-surface-raised">
                <div
                  className="h-full rounded-full"
                  style={{
                    width,
                    backgroundColor: barColors[index % barColors.length],
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </figure>
  );
}
