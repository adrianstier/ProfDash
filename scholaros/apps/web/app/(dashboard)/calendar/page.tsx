"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

// Mock events
const mockEvents = [
  { id: "1", title: "NSF Deadline", date: new Date(), color: "bg-red-500" },
  { id: "2", title: "Lab Meeting", date: new Date(Date.now() + 86400000), color: "bg-purple-500" },
  { id: "3", title: "Office Hours", date: new Date(Date.now() + 172800000), color: "bg-green-500" },
];

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);
  const startingDayOfWeek = firstDayOfMonth.getDay();
  const daysInMonth = lastDayOfMonth.getDate();

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const getEventsForDate = (date: Date) => {
    return mockEvents.filter(
      (event) => event.date.toDateString() === date.toDateString()
    );
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  // Generate calendar days
  const calendarDays = [];

  // Previous month days
  for (let i = 0; i < startingDayOfWeek; i++) {
    const day = new Date(year, month, -startingDayOfWeek + i + 1);
    calendarDays.push({ date: day, isCurrentMonth: false });
  }

  // Current month days
  for (let i = 1; i <= daysInMonth; i++) {
    calendarDays.push({ date: new Date(year, month, i), isCurrentMonth: true });
  }

  // Next month days
  const remainingDays = 42 - calendarDays.length;
  for (let i = 1; i <= remainingDays; i++) {
    calendarDays.push({ date: new Date(year, month + 1, i), isCurrentMonth: false });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Calendar</h1>
          <p className="text-muted-foreground">
            View tasks and events by date
          </p>
        </div>
      </div>

      {/* Calendar Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-semibold">
            {MONTHS[month]} {year}
          </h2>
          <button
            onClick={goToToday}
            className="rounded-md border px-3 py-1 text-sm hover:bg-muted"
          >
            Today
          </button>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={prevMonth}
            className="rounded-md p-2 hover:bg-muted"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            onClick={nextMonth}
            className="rounded-md p-2 hover:bg-muted"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="rounded-lg border">
        {/* Day Headers */}
        <div className="grid grid-cols-7 border-b bg-muted/50">
          {DAYS.map((day) => (
            <div
              key={day}
              className="px-2 py-3 text-center text-sm font-medium text-muted-foreground"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Days */}
        <div className="grid grid-cols-7">
          {calendarDays.map(({ date, isCurrentMonth }, index) => {
            const events = getEventsForDate(date);
            const today = isToday(date);

            return (
              <div
                key={index}
                className={`min-h-24 border-b border-r p-1 ${
                  !isCurrentMonth ? "bg-muted/30" : ""
                } ${index % 7 === 6 ? "border-r-0" : ""}`}
              >
                <div
                  className={`mb-1 flex h-7 w-7 items-center justify-center rounded-full text-sm ${
                    today
                      ? "bg-primary text-primary-foreground"
                      : !isCurrentMonth
                      ? "text-muted-foreground"
                      : ""
                  }`}
                >
                  {date.getDate()}
                </div>
                <div className="space-y-1">
                  {events.slice(0, 2).map((event) => (
                    <div
                      key={event.id}
                      className={`truncate rounded px-1 py-0.5 text-xs text-white ${event.color}`}
                    >
                      {event.title}
                    </div>
                  ))}
                  {events.length > 2 && (
                    <div className="text-xs text-muted-foreground">
                      +{events.length - 2} more
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
