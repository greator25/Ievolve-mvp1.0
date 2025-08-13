import { Card, CardContent } from "@/components/ui/card";
import { Users, CheckCircle, Bed, Clock } from "lucide-react";
import type { DashboardStats } from "@/lib/types";

interface StatsCardsProps {
  stats: DashboardStats;
}

export default function StatsCards({ stats }: StatsCardsProps) {
  const cards = [
    {
      title: "Total Participants",
      value: stats.totalParticipants.toLocaleString(),
      icon: Users,
      iconBg: "bg-primary-100",
      iconColor: "text-primary-600",
      change: "+12%",
      changeText: "from last event",
      changeColor: "text-success-600",
    },
    {
      title: "Checked In",
      value: stats.checkedInCount.toLocaleString(),
      icon: CheckCircle,
      iconBg: "bg-success-100",
      iconColor: "text-success-600",
      change: Math.round((stats.checkedInCount / stats.totalParticipants) * 100) + "%",
      changeText: "of total",
      changeColor: "text-gray-500",
    },
    {
      title: "Available Rooms",
      value: stats.availableRooms.toLocaleString(),
      icon: Bed,
      iconBg: "bg-warning-100",
      iconColor: "text-warning-600",
      change: `Across ${stats.totalHotels} hotels`,
      changeText: "",
      changeColor: "text-gray-500",
    },
    {
      title: "Pending Actions",
      value: stats.pendingActions.toLocaleString(),
      icon: Clock,
      iconBg: "bg-error-100",
      iconColor: "text-error-600",
      change: "Requires attention",
      changeText: "",
      changeColor: "text-error-600",
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card, index) => (
        <Card key={index} className="overflow-hidden shadow" data-testid={`stats-card-${index}`}>
          <CardContent className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className={`h-8 w-8 ${card.iconBg} rounded-md flex items-center justify-center`}>
                  <card.icon className={`h-5 w-5 ${card.iconColor}`} />
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    {card.title}
                  </dt>
                  <dd className="text-lg font-medium text-gray-900" data-testid={`stats-value-${index}`}>
                    {card.value}
                  </dd>
                </dl>
              </div>
            </div>
          </CardContent>
          <div className="bg-gray-50 px-5 py-3">
            <div className="text-sm">
              <span className={`${card.changeColor} font-medium`}>
                {card.change}
              </span>
              {card.changeText && (
                <span className="text-gray-500 ml-1">{card.changeText}</span>
              )}
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
