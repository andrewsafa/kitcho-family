import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { type SpecialEvent, type SpecialOffer } from "@shared/schema";
import { CalendarClock, Star, Gift } from "lucide-react";
import { format } from "date-fns";
import { notifySpecialEvent, notifySpecialOffer, requestNotificationPermission } from "@/lib/notifications";

interface AnnouncementsProps {
  customerLevel: string;
}

export function Announcements({ customerLevel }: AnnouncementsProps) {
  const { data: specialEvents = [] } = useQuery<SpecialEvent[]>({
    queryKey: ["/api/events"],
  });

  const { data: specialOffers = [] } = useQuery<SpecialOffer[]>({
    queryKey: [`/api/offers/${customerLevel}`],
  });

  useEffect(() => {
    requestNotificationPermission();
  }, []);

  useEffect(() => {
    const now = new Date();
    const activeEvents = specialEvents.filter(
      event => event.active && new Date(event.endDate) >= now
    );

    // Notify of active events
    activeEvents.forEach(event => {
      notifySpecialEvent(event.name, event.multiplier, new Date(event.endDate));
    });
  }, [specialEvents]);

  useEffect(() => {
    // Notify of available offers
    specialOffers.forEach(offer => {
      notifySpecialOffer(offer.title, new Date(offer.validUntil));
    });
  }, [specialOffers]);

  const activeEvents = specialEvents.filter(
    event => event.active && new Date(event.endDate) >= new Date()
  );

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
          {activeEvents.map((event) => (
            <div key={event.id} className="p-4 bg-primary/5 rounded-lg">
              <div className="flex items-start gap-3">
                <CalendarClock className="h-5 w-5 text-primary mt-1" />
                <div>
                  <h3 className="font-medium">{event.name}</h3>
                  <p className="text-sm text-muted-foreground">{event.description}</p>
                  <p className="text-sm mt-1">
                    <span className="font-medium text-primary">{event.multiplier}x Points</span> until{" "}
                    {format(new Date(event.endDate), "MMMM d, yyyy")}
                  </p>
                </div>
              </div>
            </div>
          ))}

          {specialOffers.map((offer) => (
            <div key={offer.id} className="p-4 bg-primary/5 rounded-lg">
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

          {activeEvents.length === 0 && specialOffers.length === 0 && (
            <p className="text-center text-muted-foreground py-4">
              No active special events or offers at the moment
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}