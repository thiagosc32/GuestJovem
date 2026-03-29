/**
 * Lista de tipos de escala (cronogramas) — CRUD por admins.
 * Se o banco estiver vazio, mostra os tipos padrão das constantes para editar ou criar no banco.
 */

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { ArrowLeft, ListOrdered, Plus, Edit3, Trash2, ChevronRight } from 'lucide-react-native';
import Gradient from '../../components/ui/Gradient';
import { COLORS } from '../../constants/colors';
import { useAppTheme } from '../../contexts/ChurchBrandingContext';
import { SPACING, BORDER_RADIUS } from '../../constants/dimensions';
import { TYPOGRAPHY } from '../../constants/theme';
import { SCHEDULE_TYPES, getStepsForScheduleType } from '../../constants/eventScheduleSteps';
import type { ScheduleTypeId } from '../../constants/eventScheduleSteps';
import { getScheduleTypes, deleteScheduleType, type ScheduleType } from '../../services/scheduleTypesService';

/** Tipo exibido na lista: do banco (id UUID) ou padrão (id = key). */
type ListScheduleType = ScheduleType & { key: string };

const isFromDb = (t: ListScheduleType) => t.id.length === 36 && /^[0-9a-f-]{36}$/i.test(t.id);

const CARD_ACCENT_COLORS = [COLORS.primary, '#6366F1', '#8B5CF6', '#EC4899', '#06B6D4', '#10B981', '#F59E0B'];
const getAccentColor = (index: number) => CARD_ACCENT_COLORS[index % CARD_ACCENT_COLORS.length];

const LIST_HORIZONTAL_MARGIN = SPACING.MD;

export default function ScheduleTypesListScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const sideMargin = Math.max(LIST_HORIZONTAL_MARGIN, insets.left, insets.right);
  const [types, setTypes] = useState<ListScheduleType[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      setLoading(true);
      const list = await getScheduleTypes();
      if (list.length > 0) {
        setTypes(list.map((t) => ({ ...t, key: t.key })));
      } else {
        setTypes(
          SCHEDULE_TYPES.map((t, i) => ({
            id: t.id,
            key: t.id,
            label: t.label,
            sort_order: i,
          })) as ListScheduleType[]
        );
      }
    } catch (e) {
      setTypes(
        SCHEDULE_TYPES.map((t, i) => ({
          id: t.id,
          key: t.id,
          label: t.label,
          sort_order: i,
        })) as ListScheduleType[]
      );
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      load();
    }, [])
  );

  const handleEdit = (t: ListScheduleType) => {
    if (isFromDb(t)) {
      navigation.navigate('ScheduleTypeForm', { scheduleTypeId: t.id });
    } else {
      navigation.navigate('ScheduleTypeForm', { defaultKey: t.key, defaultLabel: t.label });
    }
  };

  const handleDelete = (t: ListScheduleType) => {
    if (!isFromDb(t)) {
      Alert.alert(
        'Tipo padrão',
        'Este tipo ainda não está no banco. Use Editar e salve para registrá-lo; depois poderá excluí-lo se não houver eventos usando.'
      );
      return;
    }
    Alert.alert(
      'Excluir escala',
      `Excluir "${t.label}"? Eventos que usam esta escala precisam ser alterados antes.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteScheduleType(t.id);
              setTypes((prev) => prev.filter((x) => x.id !== t.id));
            } catch (err: any) {
              Alert.alert('Erro', err?.message ?? 'Não foi possível excluir.');
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Gradient colors={[theme.gradientStart, theme.gradientMiddle]} style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.8}>
          <ArrowLeft size={24} color="#fff" strokeWidth={2} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Tipos de escala</Text>
          <Text style={styles.headerSubtitle}>Criar, editar e excluir cronogramas</Text>
        </View>
        <TouchableOpacity
          style={styles.headerRightBtn}
          onPress={() => navigation.navigate('ScheduleTypeForm', {})}
          activeOpacity={0.8}
        >
          <Plus size={22} color="#fff" />
        </TouchableOpacity>
      </Gradient>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={[styles.listInner, { paddingLeft: sideMargin, paddingRight: sideMargin }]}>
        {loading ? (
          <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 32 }} />
        ) : types.length === 0 ? (
          <Text style={styles.emptyText}>Nenhum tipo de escala. Toque em + para criar.</Text>
        ) : (
          types.map((t, index) => {
            const accentColor = getAccentColor(index);
            return (
              <View key={t.id} style={styles.cardWrapper}>
                <View style={[styles.cardAccent, { backgroundColor: accentColor }]} />
                <TouchableOpacity
                  style={styles.cardMain}
                  onPress={() => handleEdit(t)}
                  activeOpacity={0.92}
                >
                  <View style={styles.cardTop}>
                    <View style={[styles.iconWrap, { backgroundColor: `${accentColor}18`, borderColor: `${accentColor}40` }]}>
                      <ListOrdered size={24} color={accentColor} strokeWidth={2} />
                    </View>
                    <View style={styles.cardBody}>
                      <Text style={styles.cardTitle}>{t.label}</Text>
                      {(() => {
                        const steps = getStepsForScheduleType((t.key || t.id) as ScheduleTypeId);
                        if (steps.length === 0) return null;
                        return (
                          <View style={styles.cardStepsWrap}>
                            <Text style={styles.cardStepsLabel}>Opções:</Text>
                            {steps.map((s) => (
                              <Text key={s.step_type} style={styles.cardStepsItem}>• {s.label}</Text>
                            ))}
                          </View>
                        );
                      })()}
                    </View>
                  </View>
                  <View style={styles.cardBottom}>
                    <View style={styles.cardRight}>
                      <TouchableOpacity
                        style={[styles.cardIconBtn, styles.cardIconBtnEdit]}
                        onPress={(e) => { e.stopPropagation(); handleEdit(t); }}
                        activeOpacity={0.7}
                        hitSlop={6}
                      >
                        <Edit3 size={14} color={COLORS.primary} strokeWidth={2} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.cardIconBtn, styles.cardIconBtnDelete]}
                        onPress={(e) => { e.stopPropagation(); handleDelete(t); }}
                        activeOpacity={0.7}
                        hitSlop={6}
                      >
                        <Trash2 size={14} color={COLORS.error} strokeWidth={2} />
                      </TouchableOpacity>
                    </View>
                    <ChevronRight size={20} color="rgba(0,0,0,0.25)" style={styles.cardChevron} />
                  </View>
                </TouchableOpacity>
              </View>
            );
          })
        )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.MD,
    paddingTop: SPACING.MD,
    paddingBottom: SPACING.LG,
  },
  backBtn: { padding: 8, marginRight: 8 },
  headerCenter: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { ...TYPOGRAPHY.h2, color: '#fff', textAlign: 'center' },
  headerSubtitle: { fontSize: 13, color: 'rgba(255,255,255,0.85)', marginTop: 2 },
  headerRightBtn: { width: 40, alignItems: 'flex-end' },
  scroll: { flex: 1 },
  scrollContent: { paddingVertical: SPACING.LG, paddingBottom: SPACING.XXL, flexGrow: 1 },
  listInner: { width: '100%' },
  emptyText: { fontSize: 14, color: COLORS.textSecondary, fontStyle: 'italic', marginTop: SPACING.MD },
  cardWrapper: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: SPACING.MD,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    aspectRatio: 1.35,
  },
  cardAccent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    borderTopRightRadius: 2,
    borderBottomRightRadius: 2,
  },
  cardMain: {
    flex: 1,
    flexDirection: 'column',
    paddingLeft: 4 + SPACING.LG + 8,
    paddingRight: 4 + SPACING.LG + 8,
    paddingTop: SPACING.MD + 4,
    paddingBottom: SPACING.MD,
  },
  cardTop: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    minHeight: 0,
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.MD,
  },
  cardBody: { flex: 1, minWidth: 0, justifyContent: 'center', paddingVertical: 4 },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1a1a1a',
    letterSpacing: 0.15,
    lineHeight: 22,
  },
  cardStepsWrap: { marginTop: 8 },
  cardStepsLabel: { fontSize: 11, fontWeight: '600', color: 'rgba(0,0,0,0.45)', marginBottom: 4 },
  cardStepsItem: { fontSize: 11, color: 'rgba(0,0,0,0.6)', lineHeight: 18, marginBottom: 2 },
  cardBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: SPACING.SM,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.06)',
  },
  cardRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  cardIconBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardIconBtnEdit: {
    backgroundColor: COLORS.primary + '12',
    borderWidth: 1,
    borderColor: COLORS.primary + '28',
  },
  cardIconBtnDelete: {
    backgroundColor: COLORS.error + '0C',
    borderWidth: 1,
    borderColor: COLORS.error + '22',
  },
  cardChevron: { marginLeft: 2 },
});
