import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { type SpecialOffer } from "@shared/schema";
import { Star, Gift } from "lucide-react";
import { format } from "date-fns";
import { notifySpecialOffer, requestNotificationPermission } from "@/lib/notifications";

interface AnnouncementsProps {
  customerLevel: string;
}

export function Announcements({ customerLevel }: AnnouncementsProps) {
  const { data: specialOffers = [] } = useQuery<SpecialOffer[]>({
    queryKey: [`/api/offers/${customerLevel}`],
  });

  useEffect(() => {
    requestNotificationPermission();
  }, []);

  useEffect(() => {
    // Notify of available offers
    specialOffers.forEach(offer => {
      notifySpecialOffer(offer.title, new Date(offer.validUntil));
    });
  }, [specialOffers]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Star className="h-5 w-5 text-primary" />
          Special Announcements
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {specialOffers.map((offer) => (
            <div key={offer.id} className="p-4 bg-primary/5 rounded-lg">
              {offer.imagePath && (
                <div className="mb-3">
                  <img
                    src={offer.imagePath}
                    alt={offer.title}
                    className="w-full h-40 object-cover rounded-lg"
                  />
                </div>
              )}
              <div className="flex items-start gap-3">
                <Gift className="h-5 w-5 text-primary mt-1" />
                <div>
                  <h3 className="font-medium">{offer.title}</h3>
                  <p className="text-sm text-muted-foreground">{offer.description}</p>
                  <p className="text-sm mt-1">
                    Valid until {format(new Date(offer.validUntil), "MMMM d, yyyy")}
                  </p>
                </div>
              </div>
            </div>
          ))}

          {specialOffers.length === 0 && (
            <p className="text-center text-muted-foreground py-4">
              No active special offers at the moment
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}