/**
 * Página de um departamento (espelho de ministério para testes): tarefas, agenda e membros.
 * Navega para DepartmentAgenda em vez de MinistryAgenda.
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  ScrollView,
  ActivityIndicator,
  TextInput,
  Modal,
  Alert,
  RefreshControl,
  FlatList,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { ArrowLeft, Plus, CheckCircle, Circle, Trash2, Calendar, Users, ListTodo, X, Edit3, ChevronRight } from 'lucide-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Image } from 'expo-image';
import Gradient from '../../components/ui/Gradient';
import DismissKeyboardView from '../../components/DismissKeyboardView';
import { WebDateInputInline } from '../../components/WebDateTimePicker';
import { COLORS } from '../../constants/colors';
import { useAppTheme } from '../../contexts/ChurchBrandingContext';
import { SPACING, BORDER_RADIUS } from '../../constants/dimensions';
import { TYPOGRAPHY, SHADOWS } from '../../constants/theme';
import { getMinistryLabel, getMinistryPurpose, MINISTRY_PHRASES } from '../../constants/ministries';
import {
  TASK_TYPE_LABELS,
  TASK_FREQUENCY_LABELS,
  TASK_PRIORITY_LABELS,
  INVOLVEMENT_LEVELS,
  INVOLVEMENT_LEVEL_LABELS,
} from '../../constants/ministryEnums';
import {
  getMinistryTasks,
  insertMinistryTask,
  updateMinistryTask,
  deleteMinistryTask,
  getMinistryMonthlyFocus,
  upsertMinistryMonthlyFocus,
  getMinistryMembers,
  addMinistryMember,
  updateMinistryMember,
  removeMinistryMember,
} from '../../services/supabase';
import { getCurrentUser, getTenantChurchIdForDataScope } from '../../services/supabase';
import { supabase } from '../../services/supabase';

type TaskRow = {
  id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  is_done: boolean;
  task_type?: string | null;
  frequency?: string | null;
  priority?: string | null;
  status?: string;
  responsible_user_id?: string | null;
  support_user_id?: string | null;
};
type MonthlyFocus = {
  id?: string;
  theme: string;
  objective?: string | null;
  base_verse?: string | null;
  practical_direction?: string | null;
  notes?: string | null;
} | null;
type MemberRow = {
  id: string;
  userId: string;
  name: string;
  avatarUrl: string | null;
  role: string | null;
  function?: string | null;
  involvementLevel?: string | null;
  entryDate?: string | null;
  privateNote?: string | null;
};

const MONTH_NAMES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

export default function DepartmentDetailScreen() {
  const theme = useAppTheme();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const ministryKey = (route.params?.ministryKey ?? 'guest_fire') as string;
  const title = (route.params?.ministryName as string) || getMinistryLabel(ministryKey);

  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [monthlyFocus, setMonthlyFocus] = useState<MonthlyFocus>(null);
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [purpose, setPurpose] = useState<string>('');
  const [showPurposeModal, setShowPurposeModal] = useState(false);
  const [purposeEditText, setPurposeEditText] = useState('');
  const [savingPurpose, setSavingPurpose] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [agendaMonth, setAgendaMonth] = useState(new Date().getMonth() + 1);
  const [agendaYear, setAgendaYear] = useState(new Date().getFullYear());

  const [showTaskModal, setShowTaskModal] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskRow | null>(null);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDescription, setTaskDescription] = useState('');
  const [taskDueDate, setTaskDueDate] = useState('');
  const [taskType, setTaskType] = useState<string>('');
  const [taskFrequency, setTaskFrequency] = useState<string>('');
  const [taskPriority, setTaskPriority] = useState<string>('');
  const [taskResponsibleId, setTaskResponsibleId] = useState<string>('');
  const [taskSupportId, setTaskSupportId] = useState<string>('');
  const [showTaskDatePicker, setShowTaskDatePicker] = useState(false);
  const [taskDatePickerValue, setTaskDatePickerValue] = useState(new Date());
  const [savingTask, setSavingTask] = useState(false);

  const taskDueDateForPicker = taskDueDate ? new Date(taskDueDate + 'T12:00:00') : new Date();
  const formatDateBR = (iso: string) => {
    const d = new Date(iso + 'T12:00:00');
    return d.toLocaleDateString('pt-BR');
  };

  const [showFocusModal, setShowFocusModal] = useState(false);
  const [focusTheme, setFocusTheme] = useState('');
  const [focusObjective, setFocusObjective] = useState('');
  const [focusBaseVerse, setFocusBaseVerse] = useState('');
  const [focusPracticalDirection, setFocusPracticalDirection] = useState('');
  const [focusNotes, setFocusNotes] = useState('');
  const [savingFocus, setSavingFocus] = useState(false);

  const [showMemberModal, setShowMemberModal] = useState(false);
  const [showMemberEditModal, setShowMemberEditModal] = useState(false);
  const [editingMember, setEditingMember] = useState<MemberRow | null>(null);
  const [memberFunction, setMemberFunction] = useState('');
  const [memberInvolvementLevel, setMemberInvolvementLevel] = useState('');
  const [memberEntryDate, setMemberEntryDate] = useState('');
  const [memberPrivateNote, setMemberPrivateNote] = useState('');
  const [allUsers, setAllUsers] = useState<{ id: string; name: string; avatar_url: string | null }[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [memberRole, setMemberRole] = useState('');

  const loadPurpose = useCallback(async () => {
    try {
      const { data, error } = await supabase.from('ministry_purposes').select('purpose').eq('ministry_key', ministryKey).maybeSingle();
      if (error) return null;
      return data?.purpose?.trim() ? data.purpose : null;
    } catch {
      return null;
    }
  }, [ministryKey]);

  const load = useCallback(async (overrideMonth?: number, overrideYear?: number) => {
    const month = overrideMonth ?? agendaMonth;
    const year = overrideYear ?? agendaYear;
    try {
      const [taskList, focusData, memberList, purposeFromDb] = await Promise.all([
        getMinistryTasks(ministryKey),
        getMinistryMonthlyFocus(ministryKey, year, month),
        getMinistryMembers(ministryKey),
        loadPurpose(),
      ]);
      setTasks((taskList as any[]) || []);
      setMonthlyFocus(focusData ? { theme: focusData.theme, objective: focusData.objective ?? null, base_verse: focusData.base_verse ?? null, practical_direction: focusData.practical_direction ?? null, notes: focusData.notes ?? null } : null);
      setMembers((memberList as any[]) || []);
      setPurpose(purposeFromDb ?? getMinistryPurpose(ministryKey));
    } catch (e) {
      console.error('MinistryDetail load', e);
      setTasks([]);
      setMonthlyFocus(null);
      setMembers([]);
      setPurpose(getMinistryPurpose(ministryKey));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [ministryKey, agendaYear, agendaMonth, loadPurpose]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load();
    }, [load])
  );

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  const onTaskDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') setShowTaskDatePicker(false);
    if (event?.type === 'dismissed') {
      if (Platform.OS === 'ios') setTimeout(() => setShowTaskModal(true), 100);
      return;
    }
    if (selectedDate) {
      setTaskDatePickerValue(selectedDate);
      setTaskDueDate(selectedDate.toISOString().split('T')[0]);
    }
  };

  const confirmTaskDateAndReopenForm = () => {
    setTaskDueDate(taskDatePickerValue.toISOString().split('T')[0]);
    setShowTaskDatePicker(false);
    if (Platform.OS === 'ios' || Platform.OS === 'web') setTimeout(() => setShowTaskModal(true), 100);
  };

  const cancelTaskDatePickerAndReopenForm = () => {
    setShowTaskDatePicker(false);
    if (Platform.OS === 'ios' || Platform.OS === 'web') setTimeout(() => setShowTaskModal(true), 100);
  };

  const openTaskDatePicker = () => {
    setTaskDatePickerValue(taskDueDate ? new Date(taskDueDate + 'T12:00:00') : new Date());
    if (Platform.OS === 'ios' || Platform.OS === 'web') {
      setShowTaskModal(false);
      setTimeout(() => setShowTaskDatePicker(true), 300);
    } else {
      setShowTaskDatePicker(true);
    }
  };

  const resetTaskForm = () => {
    setEditingTask(null);
    setTaskTitle('');
    setTaskDescription('');
    setTaskDueDate('');
    setTaskType('');
    setTaskFrequency('');
    setTaskPriority('');
    setTaskResponsibleId('');
    setTaskSupportId('');
  };

  const openTaskEditModal = (task: TaskRow) => {
    setTaskTitle(task.title);
    setTaskDescription(task.description ?? '');
    setTaskDueDate(task.due_date ?? '');
    setTaskType(task.task_type ?? '');
    setTaskFrequency(task.frequency ?? '');
    setTaskPriority(task.priority ?? '');
    setTaskResponsibleId(task.responsible_user_id ?? '');
    setTaskSupportId(task.support_user_id ?? '');
    setEditingTask(task);
    setTaskDatePickerValue(task.due_date ? new Date(task.due_date + 'T12:00:00') : new Date());
    setShowTaskModal(true);
  };

  const handleSaveTask = async () => {
    const t = taskTitle.trim();
    if (!t) {
      Alert.alert('Campo obrigatório', 'Informe o título da tarefa.');
      return;
    }
    setSavingTask(true);
    try {
      if (editingTask) {
        await updateMinistryTask(editingTask.id, {
          title: t,
          description: taskDescription.trim() || null,
          due_date: taskDueDate.trim() || null,
          task_type: taskType || null,
          frequency: taskType === 'recorrente' ? (taskFrequency || null) : null,
          priority: taskPriority || null,
          responsible_user_id: taskResponsibleId || null,
          support_user_id: taskSupportId || null,
        });
      } else {
        const user = await getCurrentUser();
        await insertMinistryTask({
          ministry_key: ministryKey,
          title: t,
          description: taskDescription.trim() || null,
          due_date: taskDueDate.trim() || null,
          task_type: taskType || null,
          frequency: taskType === 'recorrente' ? (taskFrequency || null) : null,
          priority: taskPriority || null,
          responsible_user_id: taskResponsibleId || null,
          support_user_id: taskSupportId || null,
          status: 'pendente',
          created_by: (user as any)?.id ?? null,
        });
      }
      setShowTaskModal(false);
      resetTaskForm();
      load();
    } catch (e: any) {
      Alert.alert('Erro', e?.message ?? 'Não foi possível salvar.');
    } finally {
      setSavingTask(false);
    }
  };

  const handleToggleTask = async (id: string, isDone: boolean) => {
    try {
      await updateMinistryTask(id, { is_done: !isDone, status: !isDone ? 'concluida' : 'pendente' });
      load();
    } catch (e: any) {
      Alert.alert('Erro', e?.message ?? 'Não foi possível atualizar.');
    }
  };

  const handleDeleteTask = (id: string) => {
    Alert.alert('Excluir tarefa', 'Deseja realmente excluir esta tarefa?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Excluir', style: 'destructive', onPress: async () => {
        try {
          await deleteMinistryTask(id);
          load();
        } catch (e: any) {
          Alert.alert('Erro', e?.message ?? 'Não foi possível excluir.');
        }
      } },
    ]);
  };

  const openFocusModal = () => {
    setFocusTheme(monthlyFocus?.theme ?? '');
    setFocusObjective(monthlyFocus?.objective ?? '');
    setFocusBaseVerse(monthlyFocus?.base_verse ?? '');
    setFocusPracticalDirection(monthlyFocus?.practical_direction ?? '');
    setFocusNotes(monthlyFocus?.notes ?? '');
    setShowFocusModal(true);
  };

  const handleSaveFocus = async () => {
    const t = focusTheme.trim();
    if (!t) {
      Alert.alert('Campo obrigatório', 'Informe o tema do mês.');
      return;
    }
    setSavingFocus(true);
    try {
      const user = await getCurrentUser();
      await upsertMinistryMonthlyFocus({
        ministry_key: ministryKey,
        month: agendaMonth,
        year: agendaYear,
        theme: t,
        objective: focusObjective.trim() || null,
        base_verse: focusBaseVerse.trim() || null,
        practical_direction: focusPracticalDirection.trim() || null,
        notes: focusNotes.trim() || null,
        created_by: (user as any)?.id ?? null,
      });
      setShowFocusModal(false);
      load();
    } catch (e: any) {
      Alert.alert('Erro', e?.message ?? 'Não foi possível salvar.');
    } finally {
      setSavingFocus(false);
    }
  };

  const openMemberModal = async () => {
    setShowMemberModal(true);
    setLoadingUsers(true);
    try {
      const cid = await getTenantChurchIdForDataScope();
      let uq = supabase.from('users').select('id, name, avatar_url').order('name');
      if (cid) uq = uq.eq('church_id', cid);
      const { data, error } = await uq;
      if (error) throw error;
      const existingIds = new Set(members.map((m) => m.userId));
      setAllUsers((data ?? []).filter((u: any) => !existingIds.has(u.id)));
    } catch (e) {
      setAllUsers([]);
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleAddMember = async (userId: string) => {
    try {
      await addMinistryMember(ministryKey, userId, {
        role: memberRole.trim() || null,
        function: memberFunction.trim() || null,
        involvement_level: memberInvolvementLevel || null,
        entry_date: memberEntryDate.trim() || null,
      });
      setShowMemberModal(false);
      setMemberRole('');
      setMemberFunction('');
      setMemberInvolvementLevel('');
      setMemberEntryDate('');
      load();
    } catch (e: any) {
      Alert.alert('Erro', e?.message ?? 'Não foi possível adicionar membro.');
    }
  };

  const openMemberEditModal = (m: MemberRow) => {
    setEditingMember(m);
    setMemberFunction(m.function ?? '');
    setMemberInvolvementLevel(m.involvementLevel ?? '');
    setMemberEntryDate(m.entryDate ?? '');
    setMemberPrivateNote(m.privateNote ?? '');
    setShowMemberEditModal(true);
  };

  const handleUpdateMember = async () => {
    if (!editingMember) return;
    try {
      await updateMinistryMember(editingMember.id, {
        function: memberFunction.trim() || null,
        involvement_level: memberInvolvementLevel || null,
        entry_date: memberEntryDate.trim() || null,
        private_note: memberPrivateNote.trim() || null,
      });
      setShowMemberEditModal(false);
      setEditingMember(null);
      load();
    } catch (e: any) {
      Alert.alert('Erro', e?.message ?? 'Não foi possível atualizar.');
    }
  };

  const openPurposeModal = () => {
    setPurposeEditText(purpose);
    setShowPurposeModal(true);
  };

  const handleSavePurpose = async () => {
    const t = purposeEditText.trim();
    if (!t) {
      Alert.alert('Campo obrigatório', 'Informe o propósito do ministério.');
      return;
    }
    setSavingPurpose(true);
    try {
      const user = await getCurrentUser();
      const { error } = await supabase.from('ministry_purposes').upsert(
        { ministry_key: ministryKey, purpose: t, updated_at: new Date().toISOString(), updated_by: (user as any)?.id ?? null },
        { onConflict: 'ministry_key' }
      );
      if (error) throw error;
      setPurpose(t);
      setShowPurposeModal(false);
    } catch (e: any) {
      Alert.alert('Erro', e?.message ?? 'Não foi possível salvar.');
    } finally {
      setSavingPurpose(false);
    }
  };

  const handleRemoveMember = (id: string, name: string) => {
    Alert.alert('Remover membro', `Remover ${name} deste departamento?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Remover', style: 'destructive', onPress: async () => {
        try {
          await removeMinistryMember(id);
          load();
        } catch (e: any) {
          Alert.alert('Erro', e?.message ?? 'Não foi possível remover.');
        }
      } },
    ]);
  };

  if (loading && tasks.length === 0 && !monthlyFocus && members.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Carregando...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Gradient colors={[theme.gradientStart, theme.gradientMiddle]} style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.8}>
          <ArrowLeft size={24} color="#fff" strokeWidth={2} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{title}</Text>
        <View style={styles.headerRight} />
      </Gradient>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Frase pastoral no topo */}
        <View style={styles.pastoralBanner}>
          <Text style={styles.pastoralBannerText}>{MINISTRY_PHRASES.topBanner}</Text>
        </View>

        {/* Propósito do ministério (editável) */}
        <View style={styles.purposeSection}>
          <View style={styles.purposeHeader}>
            <Text style={styles.purposeLabel}>Propósito do ministério</Text>
            <TouchableOpacity onPress={openPurposeModal} hitSlop={8} style={styles.purposeEditBtn}>
              <Edit3 size={18} color={COLORS.primary} />
              <Text style={styles.purposeEditText}>Editar</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.purposeText}>{purpose}</Text>
        </View>

        {/* Tarefas e responsabilidades */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <ListTodo size={20} color={COLORS.primary} />
            <Text style={styles.sectionTitle}>Tarefas e responsabilidades</Text>
            <TouchableOpacity style={styles.addBtn} onPress={() => { resetTaskForm(); setShowTaskModal(true); }}>
              <Plus size={20} color={COLORS.primary} />
              <Text style={styles.addBtnText}>Adicionar</Text>
            </TouchableOpacity>
          </View>
          {tasks.length === 0 ? (
            <Text style={styles.emptyText}>Nenhuma tarefa. Toque em Adicionar para criar.</Text>
          ) : (
            tasks.map((task) => (
              <View key={task.id} style={styles.taskCard}>
                <View style={styles.taskCardHeader}>
                  <TouchableOpacity onPress={() => handleToggleTask(task.id, task.is_done)} style={styles.taskCheck}>
                    {task.is_done ? <CheckCircle size={24} color={COLORS.success} /> : <Circle size={24} color={COLORS.textLight} />}
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.taskCardBody} onPress={() => openTaskEditModal(task)} activeOpacity={0.7}>
                    <Text style={[styles.taskCardTitle, task.is_done && styles.taskDone]}>{task.title}</Text>
                    {task.description ? (
                      <Text style={styles.taskCardDescription} numberOfLines={3}>{task.description}</Text>
                    ) : null}
                  </TouchableOpacity>
                  <View style={styles.taskCardActions}>
                    <TouchableOpacity onPress={() => openTaskEditModal(task)} style={styles.taskEditBtn} hitSlop={8}>
                      <Edit3 size={20} color={COLORS.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleDeleteTask(task.id)} hitSlop={8}>
                      <Trash2 size={20} color={COLORS.textLight} />
                    </TouchableOpacity>
                  </View>
                </View>
                <View style={styles.taskCardMeta}>
                  {task.due_date ? (
                    <View style={styles.taskCardMetaItem}>
                      <Calendar size={14} color={COLORS.textSecondary} />
                      <Text style={styles.taskCardMetaText}>{formatDateBR(task.due_date)}</Text>
                    </View>
                  ) : null}
                  {task.responsible_user_id ? (
                    <View style={styles.taskCardMetaItem}>
                      <Users size={14} color={COLORS.textSecondary} />
                      <Text style={styles.taskCardMetaText}>
                        {members.find((m) => m.userId === task.responsible_user_id)?.name ?? '—'}
                      </Text>
                    </View>
                  ) : null}
                  {task.support_user_id ? (
                    <View style={styles.taskCardMetaItem}>
                      <Users size={14} color={COLORS.textSecondary} />
                      <Text style={styles.taskCardMetaText}>
                        Apoio: {members.find((m) => m.userId === task.support_user_id)?.name ?? '—'}
                      </Text>
                    </View>
                  ) : null}
                  {task.priority ? (
                    <View style={styles.taskCardMetaItem}>
                      <Text style={[styles.taskBadge, task.priority === 'alta' && styles.taskBadgeHigh]}>
                        {(TASK_PRIORITY_LABELS as any)[task.priority]}
                      </Text>
                    </View>
                  ) : null}
                  {task.task_type ? (
                    <View style={styles.taskCardMetaItem}>
                      <Text style={styles.taskBadge}>{(TASK_TYPE_LABELS as any)[task.task_type]}</Text>
                    </View>
                  ) : null}
                  {task.task_type === 'recorrente' && task.frequency ? (
                    <View style={styles.taskCardMetaItem}>
                      <Text style={styles.taskBadge}>{(TASK_FREQUENCY_LABELS as any)[task.frequency]}</Text>
                    </View>
                  ) : null}
                </View>
              </View>
            ))
          )}
        </View>

        {/* Foco do mês */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Calendar size={20} color={COLORS.secondary} />
            <Text style={styles.sectionTitle}>Foco do mês</Text>
            <View style={styles.monthYearRow}>
              <TouchableOpacity
                onPress={() => {
                  if (agendaMonth === 1) {
                    setAgendaMonth(12);
                    setAgendaYear(agendaYear - 1);
                    setLoading(true);
                    load(12, agendaYear - 1);
                  } else {
                    setAgendaMonth(agendaMonth - 1);
                    setLoading(true);
                    load(agendaMonth - 1, agendaYear);
                  }
                }}
                style={styles.monthNav}
              >
                <Text style={styles.monthNavText}>‹</Text>
              </TouchableOpacity>
              <Text style={styles.monthYearLabel}>{MONTH_NAMES[agendaMonth - 1]} {agendaYear}</Text>
              <TouchableOpacity
                onPress={() => {
                  if (agendaMonth === 12) {
                    setAgendaMonth(1);
                    setAgendaYear(agendaYear + 1);
                    setLoading(true);
                    load(1, agendaYear + 1);
                  } else {
                    setAgendaMonth(agendaMonth + 1);
                    setLoading(true);
                    load(agendaMonth + 1, agendaYear);
                  }
                }}
                style={styles.monthNav}
              >
                <Text style={styles.monthNavText}>›</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={styles.addBtn} onPress={openFocusModal}>
              <Plus size={20} color={COLORS.secondary} />
              <Text style={[styles.addBtnText, { color: COLORS.secondary }]}>{monthlyFocus ? 'Editar' : 'Definir'}</Text>
            </TouchableOpacity>
          </View>
          {!monthlyFocus ? (
            <Text style={styles.emptyText}>Nenhum foco definido para este mês. Toque em Definir.</Text>
          ) : (
            <View style={styles.focusCard}>
              <Text style={styles.focusTheme}>{monthlyFocus.theme}</Text>
              {monthlyFocus.objective ? <Text style={styles.focusObjective}>Objetivo: {monthlyFocus.objective}</Text> : null}
              {monthlyFocus.base_verse ? <Text style={styles.focusVerse}>Versículo: {monthlyFocus.base_verse}</Text> : null}
              {monthlyFocus.practical_direction ? <Text style={styles.focusDirection}>Direção prática: {monthlyFocus.practical_direction}</Text> : null}
              {monthlyFocus.notes ? <Text style={styles.focusNotes}>{monthlyFocus.notes}</Text> : null}
            </View>
          )}
        </View>

        {/* Agenda mensal (calendário com programações) */}
        <TouchableOpacity
          style={styles.agendaCard}
          onPress={() => navigation.navigate('DepartmentAgenda', { ministryKey, ministryName: title })}
          activeOpacity={0.7}
        >
          <View style={styles.agendaCardIcon}>
            <Calendar size={28} color={COLORS.primary} />
          </View>
          <View style={styles.agendaCardBody}>
            <Text style={styles.agendaCardTitle}>Agenda mensal</Text>
            <Text style={styles.agendaCardSub}>Calendário com todas as programações</Text>
          </View>
          <ChevronRight size={24} color={COLORS.textSecondary} />
        </TouchableOpacity>

        {/* Membros */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Users size={20} color={COLORS.spiritualOrange} />
            <Text style={styles.sectionTitle}>Membros</Text>
            <TouchableOpacity style={styles.addBtn} onPress={openMemberModal}>
              <Plus size={20} color={COLORS.spiritualOrange} />
              <Text style={[styles.addBtnText, { color: COLORS.spiritualOrange }]}>Adicionar</Text>
            </TouchableOpacity>
          </View>
          {members.length === 0 ? (
            <Text style={styles.emptyText}>Nenhum membro. Toque em Adicionar para vincular usuários.</Text>
          ) : (
            members.map((m) => (
              <View key={m.id} style={styles.memberRow}>
                <TouchableOpacity style={styles.memberRowTouchable} onPress={() => openMemberEditModal(m)} activeOpacity={0.7}>
                  <View style={styles.memberAvatar}>
                    {m.avatarUrl ? (
                      <Image source={{ uri: m.avatarUrl }} style={styles.memberAvatarImg} />
                    ) : (
                      <Text style={styles.memberAvatarLetter}>{m.name.charAt(0).toUpperCase()}</Text>
                    )}
                  </View>
                  <View style={styles.memberInfo}>
                    <Text style={styles.memberName}>{m.name}</Text>
                    <View style={styles.memberMeta}>
                      {m.function ? <Text style={styles.memberFunction}>{m.function}</Text> : null}
                      {m.involvementLevel ? <Text style={styles.memberBadge}>{(INVOLVEMENT_LEVEL_LABELS as any)[m.involvementLevel]}</Text> : null}
                      {m.entryDate ? <Text style={styles.memberEntryDate}>Entrada: {formatDateBR(m.entryDate)}</Text> : null}
                    </View>
                  </View>
                  <Edit3 size={18} color={COLORS.primary} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleRemoveMember(m.id, m.name)} hitSlop={12} style={styles.memberDeleteBtn}>
                  <Trash2 size={18} color={COLORS.textLight} />
                </TouchableOpacity>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {/* Modal: nova tarefa */}
      <Modal visible={showTaskModal} transparent animationType="slide">
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
          <DismissKeyboardView style={{ flex: 1 }}>
            <View style={styles.modalBackdrop}>
              <View style={styles.modalBox}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>{editingTask ? 'Editar tarefa' : 'Nova tarefa'}</Text>
                  <TouchableOpacity onPress={() => { setShowTaskModal(false); resetTaskForm(); }} hitSlop={12}><X size={24} color={COLORS.text} /></TouchableOpacity>
                </View>
                <ScrollView
                  keyboardShouldPersistTaps="handled"
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={styles.modalScrollContent}
                >
                  <TextInput style={styles.input} placeholder="Título *" placeholderTextColor={COLORS.textLight} value={taskTitle} onChangeText={setTaskTitle} />
                  <TextInput style={[styles.input, styles.inputArea]} placeholder="Descrição (opcional)" placeholderTextColor={COLORS.textLight} value={taskDescription} onChangeText={setTaskDescription} multiline numberOfLines={2} />
                  <Pressable style={styles.dateSelector} onPress={openTaskDatePicker} android_ripple={{ color: 'rgba(0,0,0,0.1)' }}>
                    <Calendar size={20} color={COLORS.primary} style={{ marginRight: 10 }} />
                    <Text style={[styles.dateSelectorText, !taskDueDate && styles.dateSelectorPlaceholder]}>
                      {taskDueDate ? formatDateBR(taskDueDate) : 'Selecionar data (opcional)'}
                    </Text>
                  </Pressable>
                  <Text style={styles.inputLabel}>Tipo</Text>
                  <View style={styles.chipRow}>
                    {(['pontual', 'recorrente'] as const).map((t) => (
                      <TouchableOpacity key={t} style={[styles.chip, taskType === t && styles.chipActive]} onPress={() => setTaskType(t)}>
                        <Text style={[styles.chipText, taskType === t && styles.chipTextActive]}>{TASK_TYPE_LABELS[t]}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  {taskType === 'recorrente' && (
                    <>
                      <Text style={styles.inputLabel}>Frequência</Text>
                      <View style={styles.chipRow}>
                        {(['diaria', 'semanal', 'mensal'] as const).map((f) => (
                          <TouchableOpacity key={f} style={[styles.chip, taskFrequency === f && styles.chipActive]} onPress={() => setTaskFrequency(f)}>
                            <Text style={[styles.chipText, taskFrequency === f && styles.chipTextActive]}>{TASK_FREQUENCY_LABELS[f]}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </>
                  )}
                  <Text style={styles.inputLabel}>Prioridade</Text>
                  <View style={styles.chipRow}>
                    {(['baixa', 'media', 'alta'] as const).map((p) => (
                      <TouchableOpacity key={p} style={[styles.chip, taskPriority === p && styles.chipActive]} onPress={() => setTaskPriority(p)}>
                        <Text style={[styles.chipText, taskPriority === p && styles.chipTextActive]}>{TASK_PRIORITY_LABELS[p]}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <Text style={styles.inputLabel}>Responsável principal</Text>
                  <View style={styles.chipRow}>
                    <TouchableOpacity style={[styles.chip, !taskResponsibleId && styles.chipActive]} onPress={() => setTaskResponsibleId('')}>
                      <Text style={[styles.chipText, !taskResponsibleId && styles.chipTextActive]}>Nenhum</Text>
                    </TouchableOpacity>
                    {members.map((m) => (
                      <TouchableOpacity key={m.id} style={[styles.chip, taskResponsibleId === m.userId && styles.chipActive]} onPress={() => setTaskResponsibleId(m.userId)}>
                        <Text style={[styles.chipText, taskResponsibleId === m.userId && styles.chipTextActive]} numberOfLines={1}>{m.name.split(' ')[0]}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <Text style={styles.inputLabel}>Apoio (opcional)</Text>
                  <View style={styles.chipRow}>
                    <TouchableOpacity style={[styles.chip, !taskSupportId && styles.chipActive]} onPress={() => setTaskSupportId('')}>
                      <Text style={[styles.chipText, !taskSupportId && styles.chipTextActive]}>Nenhum</Text>
                    </TouchableOpacity>
                    {members.filter((m) => m.userId !== taskResponsibleId).map((m) => (
                      <TouchableOpacity key={m.id} style={[styles.chip, taskSupportId === m.userId && styles.chipActive]} onPress={() => setTaskSupportId(m.userId)}>
                        <Text style={[styles.chipText, taskSupportId === m.userId && styles.chipTextActive]} numberOfLines={1}>{m.name.split(' ')[0]}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <TouchableOpacity style={styles.modalSaveBtn} onPress={handleSaveTask} disabled={savingTask}>
                    {savingTask ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.modalSaveText}>Salvar</Text>}
                  </TouchableOpacity>
                </ScrollView>
              </View>
            </View>
          </DismissKeyboardView>
        </KeyboardAvoidingView>
      </Modal>

      {/* Seletor de data: Android usa diálogo nativo (evita Modal dentro de Modal); iOS/web usa Modal com spinner */}
      {Platform.OS === 'android' && showTaskDatePicker && (
        <DateTimePicker
          value={taskDatePickerValue}
          mode="date"
          display="default"
          onChange={onTaskDateChange}
          locale="pt-BR"
        />
      )}
      {(Platform.OS === 'ios' || Platform.OS === 'web') && (
        <Modal transparent visible={showTaskDatePicker} animationType="slide">
          <View style={styles.datePickerOverlay}>
            <View style={styles.datePickerSheet}>
              <View style={styles.datePickerHeader}>
                <Text style={styles.datePickerTitle}>Selecione a data</Text>
                <TouchableOpacity onPress={cancelTaskDatePickerAndReopenForm} hitSlop={12}>
                  <X size={24} color={COLORS.text} />
                </TouchableOpacity>
              </View>
              {Platform.OS === 'ios' && (
                <DateTimePicker
                  value={taskDatePickerValue}
                  mode="date"
                  display="spinner"
                  onChange={onTaskDateChange}
                  locale="pt-BR"
                  textColor={COLORS.text}
                  style={styles.datePicker}
                />
              )}
              {Platform.OS === 'web' && (
                <WebDateInputInline
                  value={taskDatePickerValue}
                  onChange={(d) => setTaskDatePickerValue(d)}
                />
              )}
              <TouchableOpacity style={styles.modalSaveBtn} onPress={confirmTaskDateAndReopenForm}>
                <Text style={styles.modalSaveText}>Confirmar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}

      {/* Modal: Foco do mês */}
      <Modal visible={showFocusModal} transparent animationType="slide">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }} keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}>
          <DismissKeyboardView style={{ flex: 1 }}>
            <View style={styles.modalBackdrop}>
              <View style={[styles.modalBox, styles.modalBoxTall]}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Foco do mês — {MONTH_NAMES[agendaMonth - 1]} {agendaYear}</Text>
                  <TouchableOpacity onPress={() => setShowFocusModal(false)} hitSlop={12}><X size={24} color={COLORS.text} /></TouchableOpacity>
                </View>
                <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalScrollContent}>
                  <Text style={styles.inputLabel}>Tema do mês *</Text>
                  <TextInput style={styles.input} placeholder="Ex: Acolhimento" placeholderTextColor={COLORS.textLight} value={focusTheme} onChangeText={setFocusTheme} />
                  <Text style={styles.inputLabel}>Objetivo principal</Text>
                  <TextInput style={styles.input} placeholder="Ex: Melhorar a recepção de novos visitantes" placeholderTextColor={COLORS.textLight} value={focusObjective} onChangeText={setFocusObjective} />
                  <Text style={styles.inputLabel}>Versículo base (opcional)</Text>
                  <TextInput style={styles.input} placeholder="Ex: João 13:34" placeholderTextColor={COLORS.textLight} value={focusBaseVerse} onChangeText={setFocusBaseVerse} />
                  <Text style={styles.inputLabel}>Direção prática</Text>
                  <TextInput style={[styles.input, styles.inputArea]} placeholder="O que priorizar neste mês" placeholderTextColor={COLORS.textLight} value={focusPracticalDirection} onChangeText={setFocusPracticalDirection} multiline numberOfLines={2} />
                  <Text style={styles.inputLabel}>Observações</Text>
                  <TextInput style={[styles.input, styles.inputArea]} placeholder="Notas livres" placeholderTextColor={COLORS.textLight} value={focusNotes} onChangeText={setFocusNotes} multiline numberOfLines={2} />
                  <TouchableOpacity style={styles.modalSaveBtn} onPress={handleSaveFocus} disabled={savingFocus}>
                    {savingFocus ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.modalSaveText}>Salvar</Text>}
                  </TouchableOpacity>
                </ScrollView>
              </View>
            </View>
          </DismissKeyboardView>
        </KeyboardAvoidingView>
      </Modal>

      {/* Modal: adicionar membro */}
      <Modal visible={showMemberModal} transparent animationType="slide">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }} keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}>
          <DismissKeyboardView style={{ flex: 1 }}>
            <View style={styles.modalBackdrop}>
              <View style={[styles.modalBox, styles.modalBoxTall]}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Adicionar membro</Text>
                  <TouchableOpacity onPress={() => { setShowMemberModal(false); setMemberRole(''); setMemberFunction(''); setMemberInvolvementLevel(''); setMemberEntryDate(''); }} hitSlop={12}><X size={24} color={COLORS.text} /></TouchableOpacity>
                </View>
                <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalScrollContent}>
                  <Text style={styles.inputLabel}>Função no ministério</Text>
                  <TextInput style={styles.input} placeholder="Ex: Intercessor, Designer, Líder" placeholderTextColor={COLORS.textLight} value={memberFunction} onChangeText={setMemberFunction} />
                  <Text style={styles.inputLabel}>Nível de envolvimento</Text>
                  <View style={styles.chipRow}>
                    {INVOLVEMENT_LEVELS.map((l) => (
                      <TouchableOpacity key={l} style={[styles.chip, memberInvolvementLevel === l && styles.chipActive]} onPress={() => setMemberInvolvementLevel(l)}>
                        <Text style={[styles.chipText, memberInvolvementLevel === l && styles.chipTextActive]}>{INVOLVEMENT_LEVEL_LABELS[l]}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <Text style={styles.inputLabel}>Data de entrada</Text>
                  <TextInput style={styles.input} placeholder="AAAA-MM-DD (opcional)" placeholderTextColor={COLORS.textLight} value={memberEntryDate} onChangeText={setMemberEntryDate} />
            {loadingUsers ? (
              <ActivityIndicator color={COLORS.primary} style={{ marginVertical: 20 }} />
            ) : allUsers.length === 0 ? (
              <Text style={styles.emptyText}>Nenhum usuário disponível para adicionar (já são membros ou não há usuários no app).</Text>
            ) : (
              <FlatList
                data={allUsers}
                keyExtractor={(u) => u.id}
                style={styles.userList}
                renderItem={({ item }) => (
                  <TouchableOpacity style={styles.userRow} onPress={() => handleAddMember(item.id)} activeOpacity={0.7}>
                    {item.avatar_url ? <Image source={{ uri: item.avatar_url }} style={styles.memberAvatarImg} /> : <View style={styles.memberAvatar}><Text style={styles.memberAvatarLetter}>{item.name?.charAt(0)?.toUpperCase() ?? '?'}</Text></View>}
                    <Text style={styles.memberName}>{item.name}</Text>
                    <Plus size={18} color={COLORS.primary} />
                  </TouchableOpacity>
                )}
              />
            )}
                </ScrollView>
              </View>
            </View>
          </DismissKeyboardView>
        </KeyboardAvoidingView>
      </Modal>

      {/* Modal: editar propósito */}
      <Modal visible={showPurposeModal} transparent animationType="slide">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }} keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}>
          <DismissKeyboardView style={{ flex: 1 }}>
            <View style={styles.modalBackdrop}>
              <View style={[styles.modalBox, styles.modalBoxTall]}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Editar propósito</Text>
                  <TouchableOpacity onPress={() => setShowPurposeModal(false)} hitSlop={12}><X size={24} color={COLORS.text} /></TouchableOpacity>
                </View>
                <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalScrollContent}>
                  <TextInput
                    style={[styles.input, styles.inputArea, { minHeight: 120 }]}
                    placeholder="Propósito do ministério"
                    placeholderTextColor={COLORS.textLight}
                    value={purposeEditText}
                    onChangeText={setPurposeEditText}
                    multiline
                    numberOfLines={4}
                    textAlignVertical="top"
                  />
                  <TouchableOpacity style={styles.modalSaveBtn} onPress={handleSavePurpose} disabled={savingPurpose}>
                    {savingPurpose ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.modalSaveText}>Salvar</Text>}
                  </TouchableOpacity>
                </ScrollView>
              </View>
            </View>
          </DismissKeyboardView>
        </KeyboardAvoidingView>
      </Modal>

      {/* Modal: editar membro */}
      <Modal visible={showMemberEditModal} transparent animationType="slide">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }} keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}>
          <DismissKeyboardView style={{ flex: 1 }}>
            <View style={styles.modalBackdrop}>
              <View style={styles.modalBox}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Editar {editingMember?.name}</Text>
                  <TouchableOpacity onPress={() => { setShowMemberEditModal(false); setEditingMember(null); }} hitSlop={12}><X size={24} color={COLORS.text} /></TouchableOpacity>
                </View>
                <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalScrollContent}>
                  <Text style={styles.inputLabel}>Função no ministério</Text>
                  <TextInput style={styles.input} placeholder="Ex: Intercessor, Designer" placeholderTextColor={COLORS.textLight} value={memberFunction} onChangeText={setMemberFunction} />
                  <Text style={styles.inputLabel}>Nível de envolvimento</Text>
                  <View style={styles.chipRow}>
                    {INVOLVEMENT_LEVELS.map((l) => (
                      <TouchableOpacity key={l} style={[styles.chip, memberInvolvementLevel === l && styles.chipActive]} onPress={() => setMemberInvolvementLevel(l)}>
                        <Text style={[styles.chipText, memberInvolvementLevel === l && styles.chipTextActive]}>{INVOLVEMENT_LEVEL_LABELS[l]}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <Text style={styles.inputLabel}>Data de entrada</Text>
                  <TextInput style={styles.input} placeholder="AAAA-MM-DD" placeholderTextColor={COLORS.textLight} value={memberEntryDate} onChangeText={setMemberEntryDate} />
                  <Text style={styles.inputLabel}>Observação privada (somente admin/líder)</Text>
                  <TextInput style={[styles.input, styles.inputArea]} placeholder="Nota interna" placeholderTextColor={COLORS.textLight} value={memberPrivateNote} onChangeText={setMemberPrivateNote} multiline numberOfLines={2} />
                  <TouchableOpacity style={styles.modalSaveBtn} onPress={handleUpdateMember}>
                    <Text style={styles.modalSaveText}>Salvar</Text>
                  </TouchableOpacity>
                </ScrollView>
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
  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 8, fontSize: 14, color: COLORS.textSecondary },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.MD,
    paddingTop: SPACING.MD,
    paddingBottom: SPACING.LG,
  },
  backBtn: { padding: 8, marginRight: 8 },
  headerTitle: { flex: 1, ...TYPOGRAPHY.h2, color: '#fff', textAlign: 'center' },
  headerRight: { width: 40 },
  scroll: { flex: 1 },
  scrollContent: { padding: SPACING.LG, paddingBottom: SPACING.XXL },
  section: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.LG,
    padding: SPACING.MD,
    marginBottom: SPACING.LG,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.small,
  },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: SPACING.MD },
  sectionTitle: { flex: 1, ...TYPOGRAPHY.h4, color: COLORS.text },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  addBtnText: { fontSize: 13, fontWeight: '600', color: COLORS.primary },
  pastoralBanner: { backgroundColor: COLORS.primary + '15', padding: SPACING.MD, borderRadius: BORDER_RADIUS.MD, marginBottom: SPACING.MD },
  pastoralBannerText: { ...TYPOGRAPHY.body, color: COLORS.primary, fontStyle: 'italic', textAlign: 'center' },
  purposeSection: { backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.LG, padding: SPACING.MD, marginBottom: SPACING.LG, borderWidth: 1, borderColor: COLORS.border, ...SHADOWS.small },
  purposeHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  purposeLabel: { ...TYPOGRAPHY.caption, color: COLORS.textSecondary },
  purposeEditBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  purposeEditText: { fontSize: 13, fontWeight: '600', color: COLORS.primary },
  purposeText: { ...TYPOGRAPHY.body, color: COLORS.text, lineHeight: 22 },
  pastoralIntro: { fontSize: 13, color: COLORS.textSecondary, fontStyle: 'italic', marginBottom: 4 },
  pastoralSub: { fontSize: 12, color: COLORS.textLight, fontStyle: 'italic', marginBottom: SPACING.MD },
  inputLabel: { fontSize: 13, fontWeight: '600', color: COLORS.text, marginBottom: 6 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: SPACING.MD },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface },
  chipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipText: { fontSize: 13, color: COLORS.textSecondary },
  chipTextActive: { color: '#fff', fontWeight: '600' },
  emptyText: { fontSize: 14, color: COLORS.textSecondary, fontStyle: 'italic', marginTop: 4 },
  taskCard: {
    backgroundColor: COLORS.background,
    borderRadius: BORDER_RADIUS.MD,
    padding: SPACING.MD,
    marginBottom: SPACING.MD,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  taskCardHeader: { flexDirection: 'row', alignItems: 'flex-start' },
  taskCheck: { marginRight: SPACING.MD, paddingTop: 2 },
  taskCardBody: { flex: 1, paddingRight: SPACING.SM },
  taskCardTitle: { fontSize: 16, fontWeight: '600', color: COLORS.text, lineHeight: 22 },
  taskCardDescription: { fontSize: 14, color: COLORS.textSecondary, marginTop: 6, lineHeight: 20 },
  taskCardActions: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  taskEditBtn: { padding: 4 },
  taskCardMeta: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 12, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: COLORS.border },
  taskCardMetaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  taskCardMetaText: { fontSize: 13, color: COLORS.textSecondary },
  taskBadge: { fontSize: 11, color: COLORS.textSecondary, backgroundColor: COLORS.border + '80', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  taskBadgeHigh: { color: COLORS.error, backgroundColor: COLORS.error + '20' },
  taskDone: { textDecorationLine: 'line-through', color: COLORS.textSecondary },
  taskDue: { fontSize: 12, color: COLORS.textLight, marginTop: 2 },
  monthYearRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  monthNav: { padding: 4 },
  monthNavText: { fontSize: 18, color: COLORS.primary, fontWeight: '700' },
  monthYearLabel: { fontSize: 14, color: COLORS.text, minWidth: 90, textAlign: 'center' },
  focusCard: { padding: SPACING.MD, backgroundColor: COLORS.background, borderRadius: BORDER_RADIUS.MD, borderWidth: 1, borderColor: COLORS.border },
  focusTheme: { ...TYPOGRAPHY.h4, color: COLORS.text, marginBottom: 8 },
  focusObjective: { fontSize: 14, color: COLORS.text, marginBottom: 4 },
  focusVerse: { fontSize: 13, color: COLORS.textSecondary, fontStyle: 'italic', marginBottom: 4 },
  focusDirection: { fontSize: 14, color: COLORS.text, marginBottom: 4 },
  focusNotes: { fontSize: 13, color: COLORS.textSecondary, marginTop: 4 },
  agendaCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.LG,
    padding: SPACING.MD,
    marginBottom: SPACING.LG,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.small,
  },
  agendaCardIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: COLORS.primary + '20', justifyContent: 'center', alignItems: 'center', marginRight: SPACING.MD },
  agendaCardBody: { flex: 1 },
  agendaCardTitle: { ...TYPOGRAPHY.h4, color: COLORS.text },
  agendaCardSub: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
  memberRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  memberRowTouchable: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  memberDeleteBtn: { padding: 4 },
  memberAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.primary + '30', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  memberAvatarImg: { width: 40, height: 40, borderRadius: 20 },
  memberAvatarLetter: { fontSize: 16, fontWeight: '700', color: COLORS.primary },
  memberInfo: { flex: 1 },
  memberName: { fontSize: 15, color: COLORS.text, fontWeight: '600' },
  memberMeta: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6, marginTop: 4 },
  memberFunction: { fontSize: 13, color: COLORS.textSecondary },
  memberBadge: { fontSize: 11, color: COLORS.primary, backgroundColor: COLORS.primary + '20', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  memberEntryDate: { fontSize: 12, color: COLORS.textLight },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalBox: { backgroundColor: COLORS.surface, borderTopLeftRadius: BORDER_RADIUS.LG, borderTopRightRadius: BORDER_RADIUS.LG, padding: SPACING.LG, paddingBottom: SPACING.LG + (Platform.OS === 'ios' ? 24 : 0) },
  modalScrollContent: { paddingBottom: 20 },
  modalBoxTall: { maxHeight: '70%' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: SPACING.MD },
  modalTitle: { ...TYPOGRAPHY.h4, color: COLORS.text },
  input: { borderWidth: 1, borderColor: COLORS.border, borderRadius: BORDER_RADIUS.MD, padding: 12, fontSize: 16, color: COLORS.text, marginBottom: SPACING.MD },
  inputArea: { minHeight: 60 },
  dateSelector: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: COLORS.border, borderRadius: BORDER_RADIUS.MD, padding: 12, marginBottom: SPACING.MD },
  dateSelectorText: { fontSize: 16, color: COLORS.text },
  dateSelectorPlaceholder: { color: COLORS.textLight },
  datePickerOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  datePickerSheet: { backgroundColor: COLORS.surface, borderTopLeftRadius: BORDER_RADIUS.LG, borderTopRightRadius: BORDER_RADIUS.LG, padding: SPACING.LG, paddingBottom: SPACING.LG + (Platform.OS === 'ios' ? 24 : 0) },
  datePickerHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: SPACING.MD },
  datePickerTitle: { ...TYPOGRAPHY.h4, color: COLORS.text },
  datePicker: { height: 220, width: '100%' },
  modalSaveBtn: { backgroundColor: COLORS.primary, borderRadius: BORDER_RADIUS.MD, padding: 14, alignItems: 'center' },
  modalSaveText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  userList: { maxHeight: 280 },
  userRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border, gap: 12 },
});
