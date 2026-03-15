import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  FlatList, 
  StyleSheet, 
  ActivityIndicator, 
  TouchableOpacity, 
  Alert, 
  Modal, 
  StatusBar,
  ScrollView,
} from 'react-native';
import { supabase } from '../../services/supabase';
import { Users, Trash2, ShieldCheck, X, User, ChevronLeft } from 'lucide-react-native';
import { COLORS } from '../../constants/colors';
import { SPACING, BORDER_RADIUS } from '../../constants/dimensions';
import Gradient from '../../components/ui/Gradient';
import { useNavigation } from '@react-navigation/native';
import { MINISTRY_FUNCTIONS, getMinistryFunctionLabel, getMinistryFunctionColor } from '../../constants/ministryFunctions';

export default function UserManagementScreen() {
  const navigation = useNavigation();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [roleModalVisible, setRoleModalVisible] = useState(false);


  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
      setUsers(data || []);
    } catch (error: any) {
      Alert.alert('Erro', error.message);
    } finally {
      setLoading(false);
    }
  };

  const updateUserRole = async (ministryFunction: string) => {
    try {
      const updates: { ministry_function: string; role?: string } = { ministry_function: ministryFunction };
      if (ministryFunction === 'admin') {
        updates.role = 'admin';
      } else {
        updates.role = 'user';
      }
      const { error } = await supabase.from('users').update(updates).eq('id', selectedUser.id).select();
      if (error) throw error;
      Alert.alert('Sucesso', 'Função atualizada!');
      setRoleModalVisible(false);
      fetchUsers();
    } catch (error: any) {
      Alert.alert('Erro', error.message);
    }
  };

  const renderUserItem = ({ item }: any) => (
    <View style={styles.userCard}>
      <View style={styles.userMainInfo}>
        <View style={styles.avatar}>
          <User color={COLORS.primary} size={24} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.userName}>{item.name || 'Sem Nome'}</Text>
          <Text style={styles.userEmail}>{item.email}</Text>
          <View style={[styles.roleBadge, { backgroundColor: getMinistryFunctionColor(item.ministry_function ?? item.role) + '25' }]}>
            <Text style={[styles.roleText, { color: getMinistryFunctionColor(item.ministry_function ?? item.role) }]}>
              {getMinistryFunctionLabel(item.ministry_function ?? item.role ?? 'jovem')}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity style={styles.actionBtn} onPress={() => { setSelectedUser(item); setRoleModalVisible(true); }}>
          <ShieldCheck size={20} color={COLORS.primary} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={() => Alert.alert("Aviso", "Funcionalidade de exclusão restrita.")}>
          <Trash2 size={20} color="#EF4444" />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* HEADER ESTILIZADO */}
      <Gradient colors={[COLORS.gradientStart, COLORS.gradientMiddle]} style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <ChevronLeft color="#fff" size={28} />
          </TouchableOpacity>
          <View>
            <Text style={styles.headerTitle}>Gestão de Usuários</Text>
            <Text style={styles.headerSub}>{users.length} membros cadastrados</Text>
          </View>
        </View>
      </Gradient>

      {loading ? (
        <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 50 }} />
      ) : (
        <FlatList
          data={users}
          keyExtractor={(item) => item.id}
          renderItem={renderUserItem}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={<Text style={styles.empty}>Nenhum usuário encontrado.</Text>}
        />
      )}

      {/* MODAL DE FUNÇÕES */}
      <Modal visible={roleModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Alterar Função</Text>
              <TouchableOpacity onPress={() => setRoleModalVisible(false)}><X size={24} color="#000" /></TouchableOpacity>
            </View>
            <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
              {MINISTRY_FUNCTIONS.map((fn) => (
                <TouchableOpacity key={fn.id} style={styles.roleOption} onPress={() => updateUserRole(fn.id)}>
                  <Text style={[styles.roleOptionText, { color: fn.color }]}>{fn.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { paddingTop: 60, paddingBottom: 30, paddingHorizontal: 20, borderBottomLeftRadius: 30, borderBottomRightRadius: 30 },
  headerContent: { flexDirection: 'row', alignItems: 'center' },
  backButton: { marginRight: 15, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 12, padding: 4 },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#fff' },
  headerSub: { fontSize: 14, color: 'rgba(255,255,255,0.8)' },
  listContent: { padding: 20, paddingBottom: 100 },
  userCard: { backgroundColor: '#fff', padding: 16, borderRadius: 16, marginBottom: 12, flexDirection: 'row', alignItems: 'center', elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
  userMainInfo: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  avatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  userName: { fontSize: 16, fontWeight: '700', color: '#1E293B' },
  userEmail: { fontSize: 13, color: '#64748B', marginBottom: 4 },
  roleBadge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  roleText: { fontSize: 10, fontWeight: '800' },
  actions: { flexDirection: 'row', gap: 8 },
  actionBtn: { padding: 10, backgroundColor: '#F8FAFC', borderRadius: 12, borderWidth: 1, borderColor: '#F1F5F9' },
  empty: { textAlign: 'center', marginTop: 50, color: '#94A3B8' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { backgroundColor: '#fff', width: '100%', maxHeight: '80%', borderRadius: 24, padding: 24 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: '800' },
  modalScroll: { maxHeight: 400 },
  roleOption: { paddingVertical: 18, borderBottomWidth: 1, borderBottomColor: '#F1F5F9', alignItems: 'center' },
  roleOptionText: { fontSize: 16, fontWeight: '700' }
});