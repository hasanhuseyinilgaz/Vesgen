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
import { useTranslation } from "react-i18next";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "../../lib/utils";
import { Button } from "./button";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";

export interface DateRange {
  start?: string;
  end?: string;
}

interface DateRangePickerProps {
  range?: DateRange;
  onSelect: (range: DateRange) => void;
  className?: string;
  maxDate?: string;
  availableDates?: string[];
  placeholder?: string;
}

export function DateRangePicker({ range, onSelect, className, maxDate, availableDates, placeholder = "Tarih Aralığı Seçin" }: DateRangePickerProps) {
  const { t, i18n } = useTranslation();
  const currentLocale = i18n.language === "tr" ? tr : enUS;
  const [open, setOpen] = React.useState(false);
  
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

    // Click behavior:
    // 1. If both are selected (or none), reset and pick Start
    // 2. If Start is picked and End is empty, pick End (but swap if End is before Start)
    if ((startObj && endObj) || (!startObj && !endObj)) {
      onSelect({ start: dateStr, end: undefined });
    } else if (startObj && !endObj) {
      if (isBefore(day, startObj)) {
        onSelect({ start: dateStr, end: range?.start });
      } else {
        onSelect({ start: range?.start, end: dateStr });
      }
      setOpen(false); // Auto close after full range selection
    }
  };

  const handleClear = () => {
    onSelect({ start: undefined, end: undefined });
    setOpen(false);
  };

  const generateDisplayText = () => {
    if (startObj && endObj) {
      return `${format(startObj, "dd MMM yyyy", { locale: currentLocale })} - ${format(endObj, "dd MMM yyyy", { locale: currentLocale })}`;
    }
    if (startObj) {
      return `${format(startObj, "dd MMM yyyy", { locale: currentLocale })} - (${i18n.language === 'tr' ? 'Bitiş Seçin' : 'Select End'})`;
    }
    return <span>{placeholder === "Tarih Aralığı Seçin" && i18n.language !== 'tr' ? 'Select Date Range' : placeholder}</span>;
  };

  // Utility to determine if a day falls between start and end
  const isDayInRange = (day: Date) => {
    if (!startObj || !endObj) return false;
    return isAfter(day, startObj) && isBefore(day, endObj);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant={"outline"}
          autoFocus={false}
          className={cn(
            "justify-start text-left font-normal bg-card/60 backdrop-blur-md border-border hover:bg-muted/50 transition-all",
            !range?.start && "text-muted-foreground",
            className
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4 text-primary" />
          {generateDisplayText()}
        </Button>
      </PopoverTrigger>
      
      <PopoverContent className="w-auto p-3 shadow-2xl rounded-2xl border-border bg-card/95 backdrop-blur-xl" align="end">
        {/* Calendar Header */}
        <div className="flex items-center justify-between mb-4">
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
            <div key={day} className="text-center text-[11px] font-bold text-muted-foreground">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-y-1 gap-x-0 relative">
          {calendarDays.map((day, i) => {
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
                  isStart && endObj && "bg-gradient-to-r from-transparent to-primary/20 rounded-l-full",
                  isEnd && startObj && "bg-gradient-to-l from-transparent to-primary/20 rounded-r-full"
                )}
              >
                <Button
                  variant="ghost"
                  size="icon"
                  disabled={isDisabled}
                  onClick={() => handleSelect(day)}
                  className={cn(
                    "h-8 w-8 rounded-full text-xs transition-colors z-10 hover:border hover:border-border",
                    !isCurrentMonth && "text-muted-foreground/30",
                    (isStart || isEnd) && "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground shadow-md font-bold",
                    !isStart && !isEnd && isDayToday && "border border-border text-foreground font-bold",
                    isDisabled && !isStart && !isEnd && "line-through opacity-30"
                  )}
                >
                  {format(day, "d")}
                </Button>
              </div>
            );
          })}
        </div>

        {/* Footer actions */}
        <div className="flex justify-between items-center mt-4 pt-3 border-t border-border/50">
           <Button variant="ghost" size="sm" className="h-7 text-xs px-2 text-muted-foreground bg-transparent" onClick={handleClear}>
             {t("components.datePicker.clear")}
           </Button>
           <span className="text-[10px] font-medium text-muted-foreground">
             {startObj && !endObj ? t("components.datePicker.waitingForEnd") : t("winPerformance.onlyForReport")}
           </span>
        </div>
      </PopoverContent>
    </Popover>
  );
}
