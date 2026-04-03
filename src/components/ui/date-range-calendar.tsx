import * as React from "react";
import { 
  format, 
  addMonths, 
  subMonths, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  isSameMonth, 
  isSameDay, 
  isToday, 
  startOfWeek, 
  endOfWeek,
  isAfter,
  isBefore
} from "date-fns";
import { tr, enUS } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "../../lib/utils";
import { Button } from "./button";

export interface DateRange {
  start?: string;
  end?: string;
}

interface DateRangeCalendarProps {
  range?: DateRange;
  onSelect: (range: DateRange) => void;
  maxDate?: string;
  availableDates?: string[];
  className?: string;
}

export function DateRangeCalendar({ 
  range, 
  onSelect, 
  maxDate, 
  availableDates,
  className 
}: DateRangeCalendarProps) {
  const { t, i18n } = useTranslation();
  const currentLocale = i18n.language === "tr" ? tr : enUS;

  // Parse incoming dates
  const startObj = range?.start ? new Date(range.start) : undefined;
  const endObj = range?.end ? new Date(range.end) : undefined;
  
  // Controls which month the calendar view is showing
  const initialMonth = startObj ? startOfMonth(startObj) : startOfMonth(new Date());
  const [currentMonth, setCurrentMonth] = React.useState(initialMonth);

  const daysOfWeek = i18n.language === "tr" 
    ? ["Pt", "Sa", "Ça", "Pe", "Cu", "Ct", "Pa"]
    : ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

  const startDate = startOfWeek(startOfMonth(currentMonth), { weekStartsOn: 1 });
  const endDate = endOfWeek(endOfMonth(currentMonth), { weekStartsOn: 1 });
  const calendarDays = eachDayOfInterval({ start: startDate, end: endDate });

  const handlePrevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const handleNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));

  const handleSelect = (day: Date) => {
    const dateStr = format(day, "yyyy-MM-dd");

    if ((startObj && endObj) || (!startObj && !endObj)) {
      onSelect({ start: dateStr, end: undefined });
    } else if (startObj && !endObj) {
      if (isBefore(day, startObj)) {
        onSelect({ start: dateStr, end: range?.start });
      } else {
        onSelect({ start: range?.start, end: dateStr });
      }
    }
  };

  const handleClear = () => {
    onSelect({ start: undefined, end: undefined });
  };

  const isDayInRange = (day: Date) => {
    if (!startObj || !endObj) return false;
    return isAfter(day, startObj) && isBefore(day, endObj);
  };

  return (
    <div className={cn("w-auto p-0", className)}>
      {/* Calendar Header */}
      <div className="flex items-center justify-between mb-4 px-1">
        <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full hover:bg-muted" onClick={handlePrevMonth}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="font-semibold text-sm capitalize">
          {format(currentMonth, "MMMM yyyy", { locale: currentLocale })}
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full hover:bg-muted" onClick={handleNextMonth}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Days Header */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {daysOfWeek.map(day => (
          <div key={day} className="text-center text-[10px] font-black uppercase tracking-wider text-muted-foreground/30">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-y-1 gap-x-0 relative">
        {calendarDays.map((day: Date, i: number) => {
          const dateStr = format(day, "yyyy-MM-dd");
          const isStart = startObj && isSameDay(day, startObj);
          const isEnd = endObj && isSameDay(day, endObj);
          const inRange = isDayInRange(day);
          const isCurrentMonth = isSameMonth(day, currentMonth);
          const isDayToday = isToday(day);
          
          const isDisabledByMax = !!(maxDate && isAfter(day, new Date(maxDate)));
          const isDisabledByAvailability = !!(availableDates && !availableDates.includes(dateStr));
          const isDisabled = isDisabledByMax || isDisabledByAvailability;

          return (
            <div 
              key={i} 
              className={cn(
                "flex items-center justify-center p-0.5 relative h-9",
                inRange && "bg-primary/20",
                isStart && endObj && "bg-gradient-to-r from-transparent to-primary/20 rounded-l-md",
                isEnd && startObj && "bg-gradient-to-l from-transparent to-primary/20 rounded-r-md"
              )}
            >
              <Button
                variant="ghost"
                size="icon"
                disabled={isDisabled}
                onClick={() => handleSelect(day)}
                className={cn(
                  "h-8 w-8 rounded-md text-[11px] transition-all z-10 border border-transparent",
                  !isCurrentMonth && "opacity-20",
                  (isStart || isEnd) && "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground shadow-lg font-black border-primary",
                  !isStart && !isEnd && isDayToday && "border-primary/30 text-primary font-bold",
                  !isStart && !isEnd && !isDisabled && isCurrentMonth && "hover:border-primary/20 hover:bg-primary/5",
                  isDisabled && !isStart && !isEnd && "opacity-10 cursor-not-allowed"
                )}
              >
                {format(day, "d")}
              </Button>
            </div>
          );
        })}
      </div>

      {/* Footer actions */}
      <div className="flex justify-between items-center mt-4 pt-3 border-t border-border/30">
         <Button variant="ghost" size="sm" className="h-6 text-[10px] font-bold uppercase tracking-widest px-2 text-muted-foreground hover:text-primary" onClick={handleClear}>
           {t("winPerformance.clear")}
         </Button>
         <span className="text-[9px] font-black uppercase tracking-[0.1em] text-muted-foreground/50">
           {startObj && !endObj ? t("winPerformance.waitingForEnd") : t("winPerformance.onlyForReport")}
         </span>
      </div>
    </div>
  );
}
