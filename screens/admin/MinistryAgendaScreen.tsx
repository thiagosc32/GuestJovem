/**
 * Agenda mensal do ministério: calendário com programações por data.
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  TextInput,
  Modal,
  Alert,
  RefreshControl,
  Platform,
  KeyboardAvoidingView,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { ArrowLeft, Plus, Calendar, Clock, Trash2, X, Edit3, ListOrdered } from 'lucide-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import MonthCalendar from '../../components/ui/MonthCalendar';
import Gradient from '../../components/ui/Gradient';
import DismissKeyboardView from '../../components/DismissKeyboardView';
import { WebDatePickerModal } from '../../components/WebDateTimePicker';
import { COLORS } from '../../constants/colors';
import { useAppTheme } from '../../contexts/ChurchBrandingContext';
import { SPACING, BORDER_RADIUS } from '../../constants/dimensions';
import { TYPOGRAPHY, SHADOWS } from '../../constants/theme';
import { getMinistryLabel } from '../../constants/ministries';
import {
  getMinistryCalendarEvents,
  insertMinistryCalendarEvent,
  updateMinistryCalendarEvent,
  deleteMinistryCalendarEvent,
  getCurrentUser,
} from '../../services/supabase';
import { getMinistryEventSchedule, upsertMinistryEventScheduleItem, deleteMinistryEventScheduleItem } from '../../services/ministryEventSchedule';
import {
  SCHEDULE_TYPES,
  getStepsForScheduleType,
  getStepTypesForScheduleType,
  getStepLabel,
  inferScheduleTypeFromStepTypes,
  type ScheduleTypeId,
} from '../../constants/eventScheduleSteps';

type AgendaEvent = {
  id: string;
  event_date: string;
  title: string;
  description: string | null;
  start_time: string | null;
  end_time: string | null;
  schedule_type?: string | null;
};

const MONTH_NAMES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

export default function MinistryAgendaScreen() {
  const theme = useAppTheme();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const ministryKey = (route.params?.ministryKey ?? 'guest_fire') as string;
  const title = getMinistryLabel(ministryKey);

  const [events, setEvents] = useState<AgendaEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth() + 1);
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());

  const [showAddModal, setShowAddModal] = useState(false);
  const [eventTitle, setEventTitle] = useState('');
  const [eventDescription, setEventDescription] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [eventStartTime, setEventStartTime] = useState('');
  const [eventEndTime, setEventEndTime] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [datePickerValue, setDatePickerValue] = useState(new Date());
  const [saving, setSaving] = useState(false);

  const [editingEvent, setEditingEvent] = useState<AgendaEvent | null>(null);

  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [scheduleEvent, setScheduleEvent] = useState<AgendaEvent | null>(null);
  const [scheduleType, setScheduleType] = useState<ScheduleTypeId | null>(null);
  const [scheduleItems, setScheduleItems] = useState<Record<string, { enabled: boolean; responsible: string }>>({});
  const [savingSchedule, setSavingSchedule] = useState(false);
  const [eventSchedules, setEventSchedules] = useState<Record<string, Array<{ step_type: string; responsible_name: string | null }>>>({});

  const formatDateBR = (iso: string) => {
    const d = new Date(iso + 'T12:00:00');
    return d.toLocaleDateString('pt-BR');
  };

  const load = useCallback(async () => {
    try {
      const list = await getMinistryCalendarEvents(ministryKey, currentYear, currentMonth);
      setEvents((list as any[]) || []);
    } catch (e) {
      console.error('MinistryAgenda load', e);
      setEvents([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [ministryKey, currentYear, currentMonth]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load();
    }, [load])
  );

  const onDatePress = (date: Date) => {
    setSelectedDate(date);
  };

  const calendarEvents = events.map((e) => ({
    id: e.id,
    date: e.event_date,
    title: e.title,
    category: 'programacao',
  }));

  const eventsForSelectedDate = selectedDate
    ? events.filter((e) => e.event_date === `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`)
    : [];

  const eventIdsStr = eventsForSelectedDate.map((e) => e.id).sort().join(',');
  useEffect(() => {
    const ids = eventIdsStr ? eventIdsStr.split(',') : [];
    if (ids.length === 0) {
      setEventSchedules({});
      return;
    }
    Promise.all(ids.map((id) => getMinistryEventSchedule(id)))
      .then((results) => {
        const map: Record<string, Array<{ step_type: string; responsible_name: string | null }>> = {};
        ids.forEach((id, i) => {
          map[id] = (results[i] as any[]) || [];
        });
        setEventSchedules(map);
      })
      .catch(() => setEventSchedules({}));
  }, [eventIdsStr]);

  const openAddModal = (date?: Date) => {
    const d = date ?? selectedDate ?? new Date();
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    setEventTitle('');
    setEventDescription('');
    setEventDate(iso);
    setEventStartTime('');
    setEventEndTime('');
    setDatePickerValue(new Date(iso + 'T12:00:00'));
    setEditingEvent(null);
    setShowAddModal(true);
  };

  const openEditModal = (ev: AgendaEvent) => {
    setEventTitle(ev.title);
    setEventDescription(ev.description ?? '');
    setEventDate(ev.event_date);
    setEventStartTime(ev.start_time ?? '');
    setEventEndTime(ev.end_time ?? '');
    setDatePickerValue(new Date(ev.event_date + 'T12:00:00'));
    setEditingEvent(ev);
    setShowAddModal(true);
  };

  const onDatePickerChange = (event: any, d?: Date) => {
    if (Platform.OS === 'android') setShowDatePicker(false);
    if (event?.type === 'dismissed') return;
    if (d) {
      setDatePickerValue(d);
      setEventDate(d.toISOString().split('T')[0]);
    }
  };

  const handleSave = async () => {
    const t = eventTitle.trim();
    if (!t) {
      Alert.alert('Campo obrigatório', 'Informe o título da programação.');
      return;
    }
    setSaving(true);
    try {
      const user = await getCurrentUser();
      if (editingEvent) {
        await updateMinistryCalendarEvent(editingEvent.id, {
          event_date: eventDate,
          title: t,
          description: eventDescription.trim() || null,
          start_time: eventStartTime.trim() || null,
          end_time: eventEndTime.trim() || null,
        });
      } else {
        await insertMinistryCalendarEvent({
          ministry_key: ministryKey,
          event_date: eventDate,
          title: t,
          description: eventDescription.trim() || null,
          start_time: eventStartTime.trim() || null,
          end_time: eventEndTime.trim() || null,
          created_by: (user as any)?.id ?? null,
        });
      }
      setShowAddModal(false);
      load();
    } catch (e: any) {
      Alert.alert('Erro', e?.message ?? 'Não foi possível salvar.');
    } finally {
      setSaving(false);
    }
  };

  const openScheduleModal = async (ev: AgendaEvent) => {
    setScheduleEvent(ev);
    setShowScheduleModal(true);
    try {
      const existing = await getMinistryEventSchedule(ev.id);
      let type: ScheduleTypeId | null = (ev.schedule_type as ScheduleTypeId) ?? null;
      if (!type && existing.length > 0) {
        type = inferScheduleTypeFromStepTypes(existing.map((r: any) => r.step_type));
      }
      setScheduleType(type);
      const steps = type ? getStepsForScheduleType(type) : [];
      const byStep: Record<string, { enabled: boolean; responsible: string }> = {};
      steps.forEach((s) => { byStep[s.step_type] = { enabled: false, responsible: '' }; });
      existing.forEach((row: any) => {
        if (byStep[row.step_type] !== undefined) {
          byStep[row.step_type] = { enabled: true, responsible: row.responsible_name ?? '' };
        }
      });
      setScheduleItems(byStep);
    } catch (e) {
      setScheduleType(ev.schedule_type as ScheduleTypeId ?? null);
      setScheduleItems({});
    }
  };

  const handleSaveSchedule = async () => {
    if (!scheduleEvent) return;
    if (!scheduleType) {
      Alert.alert('Escolha o tipo', 'Selecione um tipo de escala (culto, mídia, oração, organização, finanças, consolidação ou liderança).');
      return;
    }
    setSavingSchedule(true);
    try {
      await updateMinistryCalendarEvent(scheduleEvent.id, { schedule_type: scheduleType });
      const stepTypes = getStepTypesForScheduleType(scheduleType);
      const existing = await getMinistryEventSchedule(scheduleEvent.id);
      const existingSteps = new Set(existing.map((r: any) => r.step_type));
      for (const step of stepTypes) {
        const item = scheduleItems[step];
        if (item?.enabled) {
          await upsertMinistryEventScheduleItem({
            event_id: scheduleEvent.id,
            step_type: step,
            responsible_name: item.responsible.trim() || null,
            sort_order: stepTypes.indexOf(step),
          });
        } else if (existingSteps.has(step)) {
          await deleteMinistryEventScheduleItem(scheduleEvent.id, step);
        }
      }
      const newSchedule = stepTypes.filter((s) => scheduleItems[s]?.enabled).map((s) => ({
        step_type: s,
        responsible_name: scheduleItems[s].responsible.trim() || null,
      }));
      setEventSchedules((prev) => ({ ...prev, [scheduleEvent.id]: newSchedule }));
      setEvents((prev) => prev.map((e) => (e.id === scheduleEvent.id ? { ...e, schedule_type: scheduleType } : e)));
      setShowScheduleModal(false);
      setScheduleEvent(null);
      setScheduleType(null);
    } catch (e: any) {
      Alert.alert('Erro', e?.message ?? 'Não foi possível salvar a escala.');
    } finally {
      setSavingSchedule(false);
    }
  };

  const handleDelete = (ev: AgendaEvent) => {
    Alert.alert('Excluir programação', `Excluir "${ev.title}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Excluir', style: 'destructive', onPress: async () => {
        try {
          await deleteMinistryCalendarEvent(ev.id);
          load();
        } catch (e: any) {
          Alert.alert('Erro', e?.message ?? 'Não foi possível excluir.');
        }
      } },
    ]);
  };

  const handleMonthChange = useCallback((date: Date) => {
    setCurrentMonth(date.getMonth() + 1);
    setCurrentYear(date.getFullYear());
    setLoading(true);
    getMinistryCalendarEvents(ministryKey, date.getFullYear(), date.getMonth() + 1)
      .then((list) => setEvents((list as any[]) || []))
      .catch(() => setEvents([]))
      .finally(() => setLoading(false));
  }, [ministryKey]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Gradient colors={[theme.gradientStart, theme.gradientMiddle]} style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.8}>
          <ArrowLeft size={24} color="#fff" strokeWidth={2} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Agenda mensal — {title}</Text>
        <View style={styles.headerRight} />
      </Gradient>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} colors={[COLORS.primary]} />}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Calendar size={20} color={COLORS.primary} />
            <Text style={styles.sectionTitle}>Calendário</Text>
            <TouchableOpacity style={styles.addBtn} onPress={() => openAddModal()}>
              <Plus size={20} color={COLORS.primary} />
              <Text style={styles.addBtnText}>Adicionar</Text>
            </TouchableOpacity>
          </View>

          {loading && events.length === 0 ? (
            <ActivityIndicator color={COLORS.primary} style={{ padding: 24 }} />
          ) : (
            <MonthCalendar
              events={calendarEvents}
              onDatePress={(date) => {
                onDatePress(date);
                setSelectedDate(date);
              }}
              onMonthChange={handleMonthChange}
            />
          )}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              {selectedDate ? formatDateBR(`${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`) : 'Selecione uma data'}
            </Text>
            {selectedDate && (
              <TouchableOpacity style={styles.addBtn} onPress={() => openAddModal(selectedDate)}>
                <Plus size={18} color={COLORS.primary} />
                <Text style={[styles.addBtnText, { fontSize: 13 }]}>Nova</Text>
              </TouchableOpacity>
            )}
          </View>

          {!selectedDate ? (
            <Text style={styles.emptyText}>Toque em uma data no calendário para ver as programações.</Text>
          ) : eventsForSelectedDate.length === 0 ? (
            <Text style={styles.emptyText}>Nenhuma programação neste dia. Toque em Nova para adicionar.</Text>
          ) : (
            eventsForSelectedDate.map((ev) => {
              const schedule = eventSchedules[ev.id] ?? [];
              return (
                <View key={ev.id} style={styles.eventCardWrapper}>
                  <View style={styles.eventCard}>
                    <View style={styles.eventCardAccent} />
                    <TouchableOpacity style={styles.eventCardBody} onPress={() => openEditModal(ev)} activeOpacity={0.8}>
                      <View style={styles.eventCardHeader}>
                        <Text style={styles.eventCardTitle}>{ev.title}</Text>
                        <View style={styles.eventCardActions}>
                          <TouchableOpacity onPress={() => openEditModal(ev)} style={styles.eventActionBtn} hitSlop={8}>
                            <Edit3 size={18} color={COLORS.primary} strokeWidth={2} />
                          </TouchableOpacity>
                          <TouchableOpacity onPress={() => handleDelete(ev)} style={styles.eventActionBtn} hitSlop={8}>
                            <Trash2 size={18} color={COLORS.textLight} strokeWidth={2} />
                          </TouchableOpacity>
                        </View>
                      </View>
                      {ev.description ? <Text style={styles.eventCardDesc} numberOfLines={2}>{ev.description}</Text> : null}
                      {(ev.start_time || ev.end_time) ? (
                        <View style={styles.eventTimeBadge}>
                          <Clock size={14} color={COLORS.primary} strokeWidth={2} />
                          <Text style={styles.eventTimeBadgeText}>
                            {ev.start_time ?? '—'} {ev.end_time ? `– ${ev.end_time}` : ''}
                          </Text>
                        </View>
                      ) : null}
                      {schedule.length > 0 && (
                        <View style={styles.schedulePreview}>
                          <View style={styles.schedulePreviewHeader}>
                            <ListOrdered size={14} color={COLORS.primary} strokeWidth={2} />
                            <Text style={styles.schedulePreviewTitle}>
                              {SCHEDULE_TYPES.find((t) => t.id === (ev as AgendaEvent).schedule_type)?.label ?? 'Escala'}
                            </Text>
                          </View>
                          {schedule.map((item, idx) => (
                            <View key={item.step_type} style={[styles.schedulePreviewRow, idx === schedule.length - 1 && styles.schedulePreviewRowLast]}>
                              <View style={styles.schedulePreviewDot} />
                              <View style={styles.schedulePreviewContent}>
                                <Text style={styles.schedulePreviewLabel}>
                                  {getStepLabel(((ev as AgendaEvent).schedule_type ?? 'culto') as ScheduleTypeId, item.step_type)}
                                </Text>
                                <Text style={styles.schedulePreviewResp}>{item.responsible_name || 'Sem responsável'}</Text>
                              </View>
                            </View>
                          ))}
                        </View>
                      )}
                    </TouchableOpacity>
                  </View>
                  <TouchableOpacity style={[styles.scheduleBtn, schedule.length > 0 && styles.scheduleBtnFilled]} onPress={() => openScheduleModal(ev)} activeOpacity={0.8}>
                    <ListOrdered size={18} color={schedule.length > 0 ? '#fff' : COLORS.primary} strokeWidth={2} />
                    <Text style={[styles.scheduleBtnText, schedule.length > 0 && styles.scheduleBtnTextFilled]}>{schedule.length > 0 ? 'Editar escala' : 'Adicionar escala'}</Text>
                  </TouchableOpacity>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>

      {/* Modal: adicionar/editar programação */}
      <Modal visible={showAddModal} transparent animationType="slide">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }} keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}>
          <DismissKeyboardView style={{ flex: 1 }}>
            <View style={styles.modalBackdrop}>
              <View style={styles.modalBox}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>{editingEvent ? 'Editar programação' : 'Nova programação'}</Text>
                  <TouchableOpacity onPress={() => setShowAddModal(false)} hitSlop={12}><X size={24} color={COLORS.text} /></TouchableOpacity>
                </View>
                <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalScroll}>
                  <Text style={styles.inputLabel}>Data *</Text>
                  <TouchableOpacity style={styles.dateBtn} onPress={() => setShowDatePicker(true)}>
                    <Calendar size={20} color={COLORS.primary} style={{ marginRight: 10 }} />
                    <Text style={styles.dateBtnText}>{eventDate ? formatDateBR(eventDate) : 'Selecionar'}</Text>
                  </TouchableOpacity>

                  {Platform.OS === 'web' && (
                    <WebDatePickerModal
                      visible={showDatePicker}
                      value={datePickerValue}
                      onSelect={(d) => {
                        setDatePickerValue(d);
                        setEventDate(d.toISOString().split('T')[0]);
                        setShowDatePicker(false);
                      }}
                      onClose={() => setShowDatePicker(false)}
                      title="Selecione a data"
                    />
                  )}
                  {Platform.OS === 'android' && showDatePicker && (
                    <DateTimePicker value={datePickerValue} mode="date" display="default" onChange={onDatePickerChange} locale="pt-BR" />
                  )}
                  {Platform.OS === 'ios' && showDatePicker && (
                    <Modal transparent visible>
                      <View style={styles.datePickerOverlay}>
                        <View style={styles.datePickerSheet}>
                          <DateTimePicker value={datePickerValue} mode="date" display="spinner" onChange={onDatePickerChange} locale="pt-BR" textColor={COLORS.text} style={{ height: 200 }} />
                          <TouchableOpacity style={styles.datePickerConfirm} onPress={() => setShowDatePicker(false)}>
                            <Text style={styles.datePickerConfirmText}>OK</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    </Modal>
                  )}

                  <Text style={styles.inputLabel}>Título *</Text>
                  <TextInput style={styles.input} placeholder="Ex: Reunião de oração" placeholderTextColor={COLORS.textLight} value={eventTitle} onChangeText={setEventTitle} />
                  <Text style={styles.inputLabel}>Descrição (opcional)</Text>
                  <TextInput style={[styles.input, styles.inputArea]} placeholder="Detalhes da programação" placeholderTextColor={COLORS.textLight} value={eventDescription} onChangeText={setEventDescription} multiline numberOfLines={2} />
                  <Text style={styles.inputLabel}>Horário início (opcional)</Text>
                  <TextInput style={styles.input} placeholder="Ex: 19:00" placeholderTextColor={COLORS.textLight} value={eventStartTime} onChangeText={setEventStartTime} />
                  <Text style={styles.inputLabel}>Horário fim (opcional)</Text>
                  <TextInput style={styles.input} placeholder="Ex: 21:00" placeholderTextColor={COLORS.textLight} value={eventEndTime} onChangeText={setEventEndTime} />

                  <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
                    {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.saveBtnText}>Salvar</Text>}
                  </TouchableOpacity>
                </ScrollView>
              </View>
            </View>
          </DismissKeyboardView>
        </KeyboardAvoidingView>
      </Modal>

      {/* Modal: escala do evento */}
      <Modal visible={showScheduleModal} transparent animationType="slide">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }} keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}>
          <DismissKeyboardView style={{ flex: 1 }}>
            <View style={styles.modalBackdrop}>
              <View style={styles.modalBox}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Escala — {scheduleEvent?.title ?? ''}</Text>
                  <TouchableOpacity onPress={() => { setShowScheduleModal(false); setScheduleEvent(null); setScheduleType(null); }} hitSlop={12}><X size={24} color={COLORS.text} /></TouchableOpacity>
                </View>
                <View style={styles.scheduleTypePicker}>
                  <Text style={styles.scheduleHint}>{scheduleType === null ? 'Escolha o tipo de escala:' : 'Tipo de escala (pode alterar):'}</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scheduleTypeRow} contentContainerStyle={styles.scheduleTypeRowContent}>
                    {SCHEDULE_TYPES.map((t) => (
                      <TouchableOpacity
                        key={t.id}
                        style={[styles.scheduleTypeOption, scheduleType === t.id && styles.scheduleTypeOptionSelected]}
                        onPress={() => {
                          setScheduleType(t.id);
                          const steps = getStepsForScheduleType(t.id);
                          const empty: Record<string, { enabled: boolean; responsible: string }> = {};
                          steps.forEach((s) => { empty[s.step_type] = { enabled: false, responsible: '' }; });
                          setScheduleItems(empty);
                        }}
                        activeOpacity={0.8}
                      >
                        <Text style={[styles.scheduleTypeOptionText, scheduleType === t.id && styles.scheduleTypeOptionTextSelected]}>{t.label}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
                {scheduleType !== null && (
                  <>
                    <Text style={styles.scheduleHint}>
                      {scheduleType === 'midia' ? 'Marque as etapas e informe o responsável.' : 'Marque as etapas desejadas e informe o responsável (nome ou conta).'}
                    </Text>
                    <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalScroll}>
                      {getStepsForScheduleType(scheduleType).map((step) => (
                        <View key={step.step_type} style={scheduleType === 'midia' ? styles.scheduleRowMidia : styles.scheduleRow}>
                          <View style={styles.scheduleRowLeft}>
                            <Switch
                              value={scheduleItems[step.step_type]?.enabled ?? false}
                              onValueChange={(v) => setScheduleItems((prev) => ({ ...prev, [step.step_type]: { ...prev[step.step_type], enabled: v, responsible: prev[step.step_type]?.responsible ?? '' } }))}
                              trackColor={{ false: COLORS.border, true: COLORS.primary + '60' }}
                              thumbColor={scheduleItems[step.step_type]?.enabled ? COLORS.primary : COLORS.textLight}
                            />
                            <View style={styles.scheduleRowLabelWrap}>
                              <Text style={styles.scheduleStepLabel}>{step.label}</Text>
                              {step.description ? <Text style={styles.scheduleStepDesc}>{step.description}</Text> : null}
                            </View>
                          </View>
                          {scheduleItems[step.step_type]?.enabled && (
                            <TextInput
                              style={scheduleType === 'midia' ? styles.scheduleInputMidia : styles.scheduleInput}
                              placeholder="Nome ou conta do responsável"
                              placeholderTextColor={COLORS.textLight}
                              value={scheduleItems[step.step_type]?.responsible ?? ''}
                              onChangeText={(t) => setScheduleItems((prev) => ({ ...prev, [step.step_type]: { ...prev[step.step_type], enabled: true, responsible: t } }))}
                            />
                          )}
                        </View>
                      ))}
                      <TouchableOpacity style={styles.saveBtn} onPress={handleSaveSchedule} disabled={savingSchedule}>
                        {savingSchedule ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.saveBtnText}>Salvar escala</Text>}
                      </TouchableOpacity>
                    </ScrollView>
                  </>
                )}
              </View>
            </View>
          </DismissKeyboardView>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.MD, paddingTop: SPACING.MD, paddingBottom: SPACING.LG },
  backBtn: { padding: 8, marginRight: 8 },
  headerTitle: { flex: 1, ...TYPOGRAPHY.h2, color: '#fff', textAlign: 'center' },
  headerRight: { width: 40 },
  scroll: { flex: 1 },
  scrollContent: { padding: SPACING.LG, paddingBottom: SPACING.XXL },
  section: { backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.LG, padding: SPACING.MD, marginBottom: SPACING.LG, borderWidth: 1, borderColor: COLORS.border },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: SPACING.MD },
  sectionTitle: { flex: 1, ...TYPOGRAPHY.h4, color: COLORS.text },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  addBtnText: { fontSize: 13, fontWeight: '600', color: COLORS.primary },
  emptyText: { fontSize: 14, color: COLORS.textSecondary, fontStyle: 'italic' },
  eventCardWrapper: { marginBottom: SPACING.LG },
  eventCard: { backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.LG, overflow: 'hidden', ...SHADOWS.small, borderWidth: 1, borderColor: COLORS.border, borderBottomLeftRadius: 0, borderBottomRightRadius: 0 },
  eventCardAccent: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, backgroundColor: COLORS.primary, borderTopLeftRadius: BORDER_RADIUS.LG },
  eventCardBody: { padding: SPACING.MD, paddingLeft: SPACING.MD + 4 },
  eventCardHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: SPACING.SM },
  eventCardTitle: { flex: 1, fontSize: 17, fontWeight: '700', color: COLORS.text, lineHeight: 22 },
  eventCardActions: { flexDirection: 'row', gap: 4 },
  eventActionBtn: { padding: 6 },
  eventCardDesc: { fontSize: 14, color: COLORS.textSecondary, marginTop: 6, lineHeight: 20 },
  eventTimeBadge: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 6, marginTop: 10, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: COLORS.surfaceVariant, borderRadius: BORDER_RADIUS.MD },
  eventTimeBadgeText: { fontSize: 13, fontWeight: '600', color: COLORS.primary },
  schedulePreview: { marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: COLORS.border },
  schedulePreviewHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  schedulePreviewTitle: { fontSize: 12, fontWeight: '700', color: COLORS.primary, letterSpacing: 0.5 },
  schedulePreviewRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  schedulePreviewRowLast: { marginBottom: 0 },
  schedulePreviewDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.primary, marginRight: 10, opacity: 0.7 },
  schedulePreviewContent: { flex: 1, flexDirection: 'row', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' },
  schedulePreviewLabel: { fontSize: 13, fontWeight: '600', color: COLORS.text },
  schedulePreviewResp: { fontSize: 13, color: COLORS.textSecondary },
  scheduleBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, paddingHorizontal: SPACING.MD, backgroundColor: COLORS.surfaceVariant, borderRadius: BORDER_RADIUS.LG, borderWidth: 1, borderColor: COLORS.border, borderTopWidth: 0, borderTopLeftRadius: 0, borderTopRightRadius: 0 },
  scheduleBtnFilled: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  scheduleBtnText: { fontSize: 15, fontWeight: '700', color: COLORS.primary },
  scheduleBtnTextFilled: { color: '#fff' },
  scheduleHint: { fontSize: 13, color: COLORS.textSecondary, marginBottom: SPACING.MD },
  scheduleTypePicker: { paddingVertical: SPACING.SM },
  scheduleTypeRow: { maxHeight: 52, marginVertical: SPACING.XS },
  scheduleTypeRowContent: { flexDirection: 'row', gap: SPACING.SM, paddingRight: SPACING.MD },
  scheduleTypeOption: { backgroundColor: COLORS.primary + '18', borderWidth: 1, borderColor: COLORS.primary + '50', borderRadius: BORDER_RADIUS.MD, paddingVertical: SPACING.MD, paddingHorizontal: SPACING.LG },
  scheduleTypeOptionSelected: { backgroundColor: COLORS.primary + '30', borderColor: COLORS.primary },
  scheduleTypeOptionText: { fontSize: 14, fontWeight: '600', color: COLORS.primary, textAlign: 'center' },
  scheduleTypeOptionTextSelected: { color: COLORS.primary },
  scheduleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.SM, gap: SPACING.SM },
  scheduleRowMidia: { flexDirection: 'column', alignItems: 'stretch', marginBottom: SPACING.MD, gap: SPACING.SM },
  scheduleRowLabelWrap: { flex: 1 },
  scheduleStepDesc: { fontSize: 11, color: COLORS.textSecondary, marginTop: 2 },
  scheduleRowLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, minWidth: 140 },
  scheduleStepLabel: { fontSize: 14, color: COLORS.text },
  scheduleInput: { flex: 1, borderWidth: 1, borderColor: COLORS.border, borderRadius: BORDER_RADIUS.MD, padding: 10, fontSize: 14, color: COLORS.text },
  scheduleInputMidia: { width: '100%', minHeight: 48, borderWidth: 1, borderColor: COLORS.border, borderRadius: BORDER_RADIUS.MD, padding: 14, fontSize: 16, color: COLORS.text },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalBox: { backgroundColor: COLORS.surface, borderTopLeftRadius: BORDER_RADIUS.LG, borderTopRightRadius: BORDER_RADIUS.LG, padding: SPACING.LG, paddingBottom: SPACING.LG + (Platform.OS === 'ios' ? 24 : 0) },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: SPACING.MD },
  modalTitle: { ...TYPOGRAPHY.h4, color: COLORS.text },
  modalScroll: { paddingBottom: 20 },
  inputLabel: { fontSize: 13, fontWeight: '600', color: COLORS.text, marginBottom: 6 },
  input: { borderWidth: 1, borderColor: COLORS.border, borderRadius: BORDER_RADIUS.MD, padding: 12, fontSize: 16, color: COLORS.text, marginBottom: SPACING.MD },
  inputArea: { minHeight: 60 },
  dateBtn: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: COLORS.border, borderRadius: BORDER_RADIUS.MD, padding: 12, marginBottom: SPACING.MD },
  dateBtnText: { fontSize: 16, color: COLORS.text },
  datePickerOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  datePickerSheet: { backgroundColor: COLORS.surface, borderTopLeftRadius: BORDER_RADIUS.LG, borderTopRightRadius: BORDER_RADIUS.LG, padding: SPACING.LG },
  datePickerConfirm: { backgroundColor: COLORS.primary, padding: 14, borderRadius: BORDER_RADIUS.MD, alignItems: 'center', marginTop: SPACING.MD },
  datePickerConfirmText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  saveBtn: { backgroundColor: COLORS.primary, borderRadius: BORDER_RADIUS.MD, padding: 14, alignItems: 'center', marginTop: 8 },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
