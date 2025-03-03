export async function requestNotificationPermission() {
  if (!("Notification" in window)) {
    console.log("This browser does not support notifications");
    return false;
  }

  const permission = await Notification.requestPermission();
  return permission === "granted";
}

export function showNotification(title: string, options?: NotificationOptions) {
  if (!("Notification" in window)) {
    return;
  }

  if (Notification.permission === "granted") {
    new Notification(title, {
      icon: "/logo.png",
      ...options
    });
  }
}

export function notifyPointsAdded(points: number, newTotal: number) {
  showNotification("Points Added!", {
    body: `You've earned ${points} points! Your new total is ${newTotal}.`,
    tag: "points-added"
  });
}

export function notifySpecialOffer(title: string, validUntil: Date) {
  showNotification("New Special Offer!", {
    body: `${title}\nValid until ${validUntil.toLocaleDateString()}`,
    tag: "special-offer"
  });
}