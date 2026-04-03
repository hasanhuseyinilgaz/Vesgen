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
  isAfter
} from "date-fns";
import { tr, enUS } from "date-fns/locale";
import { useTranslation } from "react-i18next";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "../../lib/utils";
import { Button } from "./button";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";

interface DatePickerProps {
  date?: string;
  onSelect: (date: string) => void;
  className?: string;
  maxDate?: string;
  availableDates?: string[];
}

export function DatePicker({ date, onSelect, className, maxDate, availableDates }: DatePickerProps) {
  const { t, i18n } = useTranslation();
  const currentLocale = i18n.language === "tr" ? tr : enUS;
  const [open, setOpen] = React.useState(false);
  
  // Parse incoming date or default to now
  const selectedDateObj = date ? new Date(date) : new Date();
  
  // Controls which month the calendar view is showing
  const [currentMonth, setCurrentMonth] = React.useState(startOfMonth(selectedDateObj));

  const daysOfWeek = i18n.language === "tr" 
    ? ["Pt", "Sa", "Ça", "Pe", "Cu", "Ct", "Pa"]
    : ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

  // Generate calendar grid dates
  const startDate = startOfWeek(startOfMonth(currentMonth), { weekStartsOn: 1 });
  const endDate = endOfWeek(endOfMonth(currentMonth), { weekStartsOn: 1 });
  
  const calendarDays = eachDayOfInterval({ start: startDate, end: endDate });

  const handlePrevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const handleNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));

  const handleSelect = (day: Date) => {
    // Prevent selection if date is after maxDate
    if (maxDate && isAfter(day, new Date(maxDate))) return;
    
    // Format to YYYY-MM-DD to pass to backend
    const dateStr = format(day, "yyyy-MM-dd");
    onSelect(dateStr);
    setOpen(false);
  };

  const handleToday = () => {
    const today = new Date();
    setCurrentMonth(startOfMonth(today));
    handleSelect(today);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant={"outline"}
          autoFocus={false}
          className={cn(
            "w-[200px] justify-start text-left font-normal bg-card/60 backdrop-blur-md border-border hover:bg-muted/50 transition-all",
            !date && "text-muted-foreground",
            className
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4 text-primary" />
          {date ? format(selectedDateObj, "dd MMM yyyy", { locale: currentLocale }) : <span>{t("components.datePicker.selectDate")}</span>}
        </Button>
      </PopoverTrigger>
      
      <PopoverContent className="w-auto p-3 shadow-2xl rounded-2xl border-border bg-card/95 backdrop-blur-xl" align="start">
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
        <div className="grid grid-cols-7 gap-1">
          {calendarDays.map((day, i) => {
            const isSelected = date && isSameDay(day, selectedDateObj);
            const isCurrentMonth = isSameMonth(day, currentMonth);
            const isDayToday = isToday(day);
            const dateStr = format(day, "yyyy-MM-dd");
            const isDisabledByMax = !!(maxDate && isAfter(day, new Date(maxDate)));
            const isDisabledByAvailability = !!(availableDates && !availableDates.includes(dateStr));
            const isDisabled = isDisabledByMax || isDisabledByAvailability;

            return (
              <Button
                key={i}
                variant="ghost"
                size="icon"
                disabled={isDisabled}
                onClick={() => handleSelect(day)}
                className={cn(
                  "h-8 w-8 rounded-full text-xs transition-colors",
                  !isCurrentMonth && "text-muted-foreground/30",
                  isSelected && "bg-primary text-primary-foreground hover:bg-primary/90 shadow-md",
                  !isSelected && isDayToday && "bg-muted text-foreground border border-border",
                  !isSelected && !isDayToday && isCurrentMonth && "hover:bg-muted"
                )}
              >
                {format(day, "d")}
              </Button>
            );
          })}
        </div>

        {/* Footer actions */}
        <div className="flex justify-between items-center mt-4 pt-3 border-t border-border/50">
           <Button variant="ghost" size="sm" className="h-7 text-xs px-2 text-muted-foreground bg-transparent" onClick={() => { onSelect(""); setOpen(false); }}>
             {t("components.datePicker.clear")}
           </Button>
           <Button variant="secondary" size="sm" className="h-7 text-xs px-3 bg-primary/10 text-primary hover:bg-primary/20 rounded-lg font-semibold" onClick={handleToday}>
             {t("components.datePicker.today")}
           </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
