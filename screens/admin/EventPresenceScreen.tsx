import React, { useEffect, useState } from 'react';
import { 
  View, Text, FlatList, StyleSheet, ActivityIndicator, 
  TouchableOpacity, Modal, ScrollView 
} from 'react-native';
import { supabase } from '../../services/supabase';
import { Users, Calendar, X, UserCheck } from 'lucide-react-native';
import { COLORS } from '../../constants/colors';

export default function EventPresenceScreen() {
  const [loading, setLoading] = useState(true);
  const [eventStats, setEventStats] = useState<any[]>([]);
  
  // Estados para controlar o Modal
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [modalVisible, setModalVisible] = useState(false);

  useEffect(() => {
    fetchPresenceData();
  }, []);

  const fetchPresenceData = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('events')
        .select(`
          id,
          title,
          date,
          event_rsvps (
            id,
            user_id,
            users!fk_event_rsvps_users (
              name
            )
          )
        `)
        .order('date', { ascending: false });

      if (error) throw error;
      setEventStats(data || []);
    } catch (error) {
      console.error("Erro ao buscar presenças:", error);
    } finally {
      setLoading(false);
    }
  };

  const openDetails = (event: any) => {
    setSelectedEvent(event);
    setModalVisible(true);
  };

  const renderEventItem = ({ item }: any) => (
    <TouchableOpacity 
      style={styles.eventCard} 
      onPress={() => openDetails(item)}
      activeOpacity={0.7}
    >
      <View style={styles.eventInfo}>
        <Text style={styles.eventTitle}>{item.title}</Text>
        <View style={styles.dateRow}>
          <Calendar size={14} color="#64748B" />
          <Text style={styles.eventDate}>
            {item.date ? new Date(item.date + 'T12:00:00').toLocaleDateString('pt-BR') : 'Sem data'}
          </Text>
        </View>
      </View>

      <View style={styles.statsBadge}>
        <Users size={16} color={COLORS.primary} />
        <Text style={styles.statsCount}>{item.event_rsvps?.length || 0}</Text>
      </View>
      
      <Text style={styles.tapHint}>Toque para ver a lista completa</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Relatório de Presença</Text>
        <Text style={styles.headerSub}>Clique no evento para ver os nomes</Text>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <FlatList
          data={eventStats}
          keyExtractor={(item) => item.id}
          renderItem={renderEventItem}
          contentContainerStyle={{ padding: 20 }}
          ListEmptyComponent={<Text style={styles.empty}>Nenhum evento encontrado.</Text>}
        />
      )}

      {/* MODAL DE LISTA DE NOMES */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>{selectedEvent?.title}</Text>
                <Text style={styles.modalSub}>{selectedEvent?.event_rsvps?.length || 0} confirmados</Text>
              </View>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeButton}>
                <X size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.namesScrollView} showsVerticalScrollIndicator={false}>
              {selectedEvent?.event_rsvps && selectedEvent.event_rsvps.length > 0 ? (
                selectedEvent.event_rsvps.map((rsvp: any, index: number) => (
                  <View key={index} style={styles.nameRow}>
                    <View style={styles.avatarCircle}>
                      <UserCheck size={18} color={COLORS.primary} />
                    </View>
                    <Text style={styles.nameText}>
                      {rsvp.users?.name || 'Usuário sem nome'}
                    </Text>
                  </View>
                ))
              ) : (
                <Text style={styles.noDataText}>Ninguém confirmou presença ainda.</Text>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { padding: 24, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E2E8F0', paddingTop: 60 },
  headerTitle: { fontSize: 24, fontWeight: '800', color: '#0F172A' },
  headerSub: { fontSize: 14, color: '#64748B', marginTop: 4 },
  eventCard: { backgroundColor: '#fff', borderRadius: 16, padding: 20, marginBottom: 12, borderWidth: 1, borderColor: '#E2E8F0', elevation: 2 },
  eventInfo: { marginBottom: 8 },
  eventTitle: { fontSize: 18, fontWeight: '700', color: '#1E293B' },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  eventDate: { fontSize: 13, color: '#64748B' },
  statsBadge: { position: 'absolute', top: 20, right: 20, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#EEF2FF', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statsCount: { fontWeight: '800', color: COLORS.primary },
  tapHint: { fontSize: 11, color: COLORS.primary, fontWeight: '600', marginTop: 10, textTransform: 'uppercase' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  empty: { textAlign: 'center', marginTop: 40, color: '#94A3B8' },
  
  // ESTILOS DO MODAL
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 30, borderTopRightRadius: 30, height: '70%', padding: 24 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: '800', color: '#0F172A', maxWidth: '80%' },
  modalSub: { fontSize: 14, color: COLORS.primary, fontWeight: '600' },
  closeButton: { padding: 4 },
  namesScrollView: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  avatarCircle: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#EEF2FF', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  nameText: { fontSize: 16, color: '#1E293B', fontWeight: '500' },
  noDataText: { textAlign: 'center', marginTop: 40, color: '#94A3B8', fontSize: 15 }
});