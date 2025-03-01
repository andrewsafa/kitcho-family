import { useQuery } from "@tanstack/react-query";
import { type PointTransaction } from "@shared/schema";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";

interface PointsHistoryProps {
  customerId: number;
}

export function PointsHistory({ customerId }: PointsHistoryProps) {
  const { data: transactions = [] } = useQuery<PointTransaction[]>({
    queryKey: [`/api/customers/${customerId}/transactions`],
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Points History</CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-4">
            {transactions.map((transaction) => (
              <div
                key={transaction.id}
                className="flex justify-between items-start border-b pb-4"
              >
                <div>
                  <p className="font-medium">{transaction.description}</p>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(transaction.timestamp), "PPp")}
                  </p>
                </div>
                <span className={transaction.points >= 0 ? "text-green-600" : "text-red-600"}>
                  {transaction.points >= 0 ? "+" : ""}{transaction.points}
                </span>
              </div>
            ))}
            {transactions.length === 0 && (
              <p className="text-center text-muted-foreground py-8">
                No transactions yet
              </p>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}