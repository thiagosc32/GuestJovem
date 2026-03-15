import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { COLORS } from '../../constants/colors';
import { SPACING, BORDER_RADIUS } from '../../constants/dimensions';
import { TYPOGRAPHY, SHADOWS } from '../../constants/theme';

interface MonthCalendarProps {
  events: Array<{ id: string; date: string; title: string; category: string }>;
  onDatePress?: (date: Date) => void;
  onMonthChange?: (date: Date) => void;
}

export default function MonthCalendar({ events, onDatePress, onMonthChange }: MonthCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    return { daysInMonth, startingDayOfWeek };
  };

  const getEventCountForDate = (day: number) => {
    const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return events.filter((e) => e.date === dateStr).length;
  };

  const handlePreviousMonth = () => {
    const next = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
    setCurrentDate(next);
    onMonthChange?.(next);
  };

  const handleNextMonth = () => {
    const next = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);
    setCurrentDate(next);
    onMonthChange?.(next);
  };

  const handleDatePress = (day: number) => {
    const selectedDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    onDatePress?.(selectedDate);
  };

  const { daysInMonth, startingDayOfWeek } = getDaysInMonth(currentDate);
  const monthName = currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  const calendarDays = [];
  for (let i = 0; i < startingDayOfWeek; i++) {
    calendarDays.push(null);
  }
  for (let day = 1; day <= daysInMonth; day++) {
    calendarDays.push(day);
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handlePreviousMonth} style={styles.navButton}>
          <ChevronLeft size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.monthTitle}>{monthName}</Text>
        <TouchableOpacity onPress={handleNextMonth} style={styles.navButton}>
          <ChevronRight size={24} color={COLORS.text} />
        </TouchableOpacity>
      </View>

      <View style={styles.weekDaysRow}>
        {weekDays.map((day) => (
          <View key={day} style={styles.weekDayCell}>
            <Text style={styles.weekDayText}>{day}</Text>
          </View>
        ))}
      </View>

      <View style={styles.daysGrid}>
        {calendarDays.map((day, index) => {
          if (day === null) {
            return <View key={`empty-${index}`} style={styles.dayCell} />;
          }

          const eventCount = getEventCountForDate(day);
          const hasEvents = eventCount > 0;
          const isToday =
            day === new Date().getDate() &&
            currentDate.getMonth() === new Date().getMonth() &&
            currentDate.getFullYear() === new Date().getFullYear();

          return (
            <TouchableOpacity
              key={day}
              style={[
                styles.dayCell,
                isToday && styles.todayCell,
                hasEvents && styles.hasEventsCell,
              ]}
              onPress={() => handleDatePress(day)}
            >
              <Text style={[
                styles.dayText,
                isToday && styles.todayText,
                hasEvents && styles.hasEventsText,
              ]}>{day}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.MD,
    padding: SPACING.MD,
    ...SHADOWS.small,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.MD,
  },
  navButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
    backgroundColor: COLORS.background,
  },
  monthTitle: {
    ...TYPOGRAPHY.h3,
    textTransform: 'capitalize',
  },
  weekDaysRow: {
    flexDirection: 'row',
    marginBottom: SPACING.SM,
  },
  weekDayCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: SPACING.SM,
  },
  weekDayText: {
    ...TYPOGRAPHY.caption,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: '14.28%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.XS,
    position: 'relative',
  },
  todayCell: {
    backgroundColor: `${COLORS.primary}20`,
    borderRadius: BORDER_RADIUS.SM,
  },
  dayText: {
    ...TYPOGRAPHY.body,
    color: COLORS.text,
  },
  todayText: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  hasEventsCell: {
    backgroundColor: COLORS.spiritualGold ?? '#F9A825',
    borderRadius: BORDER_RADIUS.SM,
  },
  hasEventsText: {
    color: '#1a1a1a',
    fontWeight: '700',
  },
});