import * as React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { DayPicker } from 'react-day-picker';
import { cn } from '@/lib/utils';
import { buttonVariants } from '@/components/ui/button';
import { useTheme } from '@/context/ThemeContext';

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

function Calendar({
    className,
    classNames,
    showOutsideDays = true,
    ...props
}: CalendarProps) {
    const { accentClasses, themeClasses } = useTheme();

    return (
        <DayPicker
            showOutsideDays={showOutsideDays}
            className={cn('p-3', className)}
            classNames={{
                month: 'space-y-4',
                month_caption: 'flex justify-center relative items-center h-10 mb-4',
                caption_label: cn('text-sm font-semibold', themeClasses.text),
                nav: 'absolute inset-x-0 flex items-center justify-between px-2 h-10 pointer-events-none',
                button_previous: cn(
                    buttonVariants({ variant: 'outline' }),
                    'h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 transition-all z-10 pointer-events-auto',
                    themeClasses.border,
                    themeClasses.hoverBg
                ),
                button_next: cn(
                    buttonVariants({ variant: 'outline' }),
                    'h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 transition-all z-10 pointer-events-auto',
                    themeClasses.border,
                    themeClasses.hoverBg
                ),
                month_grid: 'w-full border-collapse space-y-1',
                weekdays: 'flex',
                weekday: cn(
                    'text-muted-foreground rounded-md w-9 font-normal text-[0.8rem]',
                    themeClasses.textTertiary
                ),
                week: 'flex w-full mt-2',
                day: 'h-9 w-9 text-center text-sm p-0 relative focus-within:relative focus-within:z-20',
                day_button: cn(
                    buttonVariants({ variant: 'ghost' }),
                    'h-9 w-9 p-0 font-normal aria-selected:opacity-100 transition-all rounded-lg'
                ),
                selected: cn(
                    accentClasses.bgClass,
                    'text-black hover:opacity-90 font-bold focus:bg-primary focus:text-primary-foreground rounded-lg'
                ),
                today: cn(
                    'font-bold underline decoration-2 underline-offset-4 rounded-lg transition-all duration-300',
                    // Only show solid background on today if nothing else is selected in single/range mode
                    !(props as any).selected
                        ? `${accentClasses.bgClass} text-black`
                        : `border ${accentClasses.borderClass} ${accentClasses.textClass}`
                ),
                outside: cn(
                    'day-outside text-muted-foreground opacity-20 aria-selected:bg-accent/50 aria-selected:text-muted-foreground aria-selected:opacity-30',
                    themeClasses.textTertiary
                ),
                disabled: 'text-muted-foreground opacity-20',
                range_start: 'day-range-start',
                range_end: 'day-range-end',
                range_middle: 'aria-selected:bg-accent aria-selected:text-accent-foreground',
                hidden: 'invisible',
                ...classNames,
            }}
            components={{
                Chevron: (props) => {
                    if (props.orientation === 'left') {
                        return <ChevronLeft className="h-4 w-4" />;
                    }
                    return <ChevronRight className="h-4 w-4" />;
                },
            }}
            {...props}
        />
    );
}
Calendar.displayName = 'Calendar';

export { Calendar };
