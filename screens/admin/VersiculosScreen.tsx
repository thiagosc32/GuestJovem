import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Modal,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Save, BookMarked, Calendar, ChevronRight } from 'lucide-react-native';
import { setAppSetting } from '../../services/supabase';
import { supabase } from '../../services/supabase';
import { getChapter } from '../../services/bibleApi';
import type { BibleChapter, BibleVerse } from '../../services/bibleApi';
import { BOOK_NAMES, BIBLE_BOOK_IDS, BOOK_CHAPTERS } from '../../constants/bibleReadingPlans';
import { COLORS } from '../../constants/colors';
import { SPACING, BORDER_RADIUS } from '../../constants/dimensions';
import { TYPOGRAPHY, SHADOWS } from '../../constants/theme';
import { useNavigation } from '@react-navigation/native';

const VERSE_OF_THE_DAY_KEY = 'verse_of_the_day';
const VERSE_OF_THE_WEEK_KEY = 'verse_of_the_week';

type PickerTarget = 'day' | 'week';
type PickerStep = 'book' | 'chapter' | 'verse';

export default function VersiculosScreen() {
  const navigation = useNavigation();
  const [verseRef, setVerseRef] = useState('');
  const [verseText, setVerseText] = useState('');
  const [savingVerse, setSavingVerse] = useState(false);
  const [verseWeekRef, setVerseWeekRef] = useState('');
  const [verseWeekText, setVerseWeekText] = useState('');
  const [savingVerseWeek, setSavingVerseWeek] = useState(false);

  const [showPicker, setShowPicker] = useState(false);
  const [pickerTarget, setPickerTarget] = useState<PickerTarget>('day');
  const [pickerStep, setPickerStep] = useState<PickerStep>('book');
  const [selectedBookId, setSelectedBookId] = useState<string | null>(null);
  const [selectedChapter, setSelectedChapter] = useState<number | null>(null);
  const [chapterData, setChapterData] = useState<BibleChapter | null>(null);
  const [loadingChapter, setLoadingChapter] = useState(false);

  useEffect(() => {
    fetchVerses();
  }, []);

  const fetchVerses = async () => {
    const { data } = await supabase.from('app_settings').select('key, value').in('key', [VERSE_OF_THE_DAY_KEY, VERSE_OF_THE_WEEK_KEY]);
    if (data) {
      const map = data.reduce((acc, curr) => ({ ...acc, [curr.key]: curr.value }), {} as Record<string, string>);
      const rawDay = map[VERSE_OF_THE_DAY_KEY];
      if (rawDay) {
        try {
          const parsed = JSON.parse(rawDay) as { ref?: string; text?: string };
          if (parsed.ref != null) setVerseRef(parsed.ref);
          if (parsed.text != null) setVerseText(parsed.text);
        } catch (_) {}
      }
      const rawWeek = map[VERSE_OF_THE_WEEK_KEY];
      if (rawWeek) {
        try {
          const parsed = JSON.parse(rawWeek) as { ref?: string; text?: string };
          if (parsed.ref != null) setVerseWeekRef(parsed.ref);
          if (parsed.text != null) setVerseWeekText(parsed.text);
        } catch (_) {}
      }
    }
  };

  const openPicker = (target: PickerTarget) => {
    setPickerTarget(target);
    setPickerStep('book');
    setSelectedBookId(null);
    setSelectedChapter(null);
    setChapterData(null);
    setShowPicker(true);
  };

  const handleSelectBook = (bookId: string) => {
    setSelectedBookId(bookId);
    setSelectedChapter(null);
    setChapterData(null);
    setPickerStep('chapter');
  };

  const handleSelectChapter = async (chapter: number) => {
    if (!selectedBookId) return;
    setSelectedChapter(chapter);
    setLoadingChapter(true);
    setChapterData(null);
    try {
      const data = await getChapter('almeida', selectedBookId, chapter);
      setChapterData(data ?? null);
      setPickerStep('verse');
    } catch (e) {
      Alert.alert('Erro', 'Não foi possível carregar o capítulo.');
    } finally {
      setLoadingChapter(false);
    }
  };

  const handleSelectVerse = (verse: BibleVerse) => {
    if (!selectedBookId || !selectedChapter) return;
    const bookName = BOOK_NAMES[selectedBookId] ?? selectedBookId;
    const ref = `${bookName} ${selectedChapter}:${verse.number}`;
    const text = verse.text?.trim() ?? '';
    if (pickerTarget === 'day') {
      setVerseRef(ref);
      setVerseText(text);
    } else {
      setVerseWeekRef(ref);
      setVerseWeekText(text);
    }
    setShowPicker(false);
  };

  const handleSaveVerse = async () => {
    const ref = verseRef.trim();
    const text = verseText.trim();
    if (!ref || !text) {
      Alert.alert('Campos obrigatórios', 'Selecione um versículo para o dia.');
      return;
    }
    setSavingVerse(true);
    try {
      await setAppSetting(VERSE_OF_THE_DAY_KEY, JSON.stringify({ ref, text }));
      Alert.alert('Sucesso', 'Versículo do dia atualizado!');
    } catch (e: any) {
      Alert.alert('Erro', e?.message ?? 'Não foi possível salvar.');
    } finally {
      setSavingVerse(false);
    }
  };

  const handleSaveVerseWeek = async () => {
    const ref = verseWeekRef.trim();
    const text = verseWeekText.trim();
    if (!ref || !text) {
      Alert.alert('Campos obrigatórios', 'Selecione um versículo para a semana.');
      return;
    }
    setSavingVerseWeek(true);
    try {
      await setAppSetting(VERSE_OF_THE_WEEK_KEY, JSON.stringify({ ref, text }));
      Alert.alert('Sucesso', 'Versículo da semana atualizado!');
    } catch (e: any) {
      Alert.alert('Erro', e?.message ?? 'Não foi possível salvar.');
    } finally {
      setSavingVerseWeek(false);
    }
  };

  const chapters = selectedBookId ? Array.from({ length: BOOK_CHAPTERS[selectedBookId] ?? 1 }, (_, i) => i + 1) : [];

  const renderPickerContent = () => {
    if (pickerStep === 'book') {
      return (
        <FlatList
          key="picker-books"
          data={BIBLE_BOOK_IDS}
          keyExtractor={(id) => id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.pickerItem}
              onPress={() => handleSelectBook(item)}
              activeOpacity={0.7}
            >
              <Text style={styles.pickerItemText}>{BOOK_NAMES[item] ?? item}</Text>
              <ChevronRight size={20} color={COLORS.textSecondary} />
            </TouchableOpacity>
          )}
          style={styles.pickerList}
        />
      );
    }
    if (pickerStep === 'chapter') {
      return (
        <FlatList
          key={`picker-chapters-${selectedBookId ?? ''}`}
          data={chapters}
          keyExtractor={(n) => String(n)}
          numColumns={4}
          columnWrapperStyle={styles.chapterRow}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.chapterChip}
              onPress={() => handleSelectChapter(item)}
              activeOpacity={0.7}
            >
              <Text style={styles.chapterChipText}>{item}</Text>
            </TouchableOpacity>
          )}
          style={styles.pickerList}
        />
      );
    }
    if (pickerStep === 'verse') {
      if (loadingChapter) {
        return (
          <View style={styles.pickerLoading}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.pickerLoadingText}>Carregando versículos...</Text>
          </View>
        );
      }
      if (!chapterData?.verses?.length) {
        return (
          <View style={styles.pickerEmpty}>
            <Text style={styles.pickerEmptyText}>Nenhum versículo encontrado.</Text>
          </View>
        );
      }
      return (
        <FlatList
          key={`picker-verses-${selectedBookId ?? ''}-${selectedChapter ?? ''}`}
          data={chapterData.verses}
          keyExtractor={(v) => `${v.number}`}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.verseItem}
              onPress={() => handleSelectVerse(item)}
              activeOpacity={0.7}
            >
              <Text style={styles.verseNumber}>{item.number}</Text>
              <Text style={styles.versePreview} numberOfLines={2}>{item.text}</Text>
              <ChevronRight size={18} color={COLORS.primary} />
            </TouchableOpacity>
          )}
          style={styles.pickerList}
        />
      );
    }
    return null;
  };

  const pickerTitle =
    pickerStep === 'book'
      ? 'Selecionar livro'
      : pickerStep === 'chapter'
        ? selectedBookId
          ? `Capítulo — ${BOOK_NAMES[selectedBookId]}`
          : 'Selecionar capítulo'
        : selectedBookId && selectedChapter
          ? `Versículo — ${BOOK_NAMES[selectedBookId]} ${selectedChapter}`
          : 'Selecionar versículo';

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <ArrowLeft size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Versículos</Text>
        <View style={{ width: 24 }} />
      </View>
      <ScrollView contentContainerStyle={{ padding: SPACING.LG }}>
        <View style={styles.sectionTitleWrap}>
          <BookMarked size={20} color={COLORS.primary} />
          <Text style={styles.sectionTitle}>Versículo do dia</Text>
        </View>
        <View style={styles.verseCard}>
          {verseRef ? (
            <>
              <Text style={styles.verseRefDisplay}>{verseRef}</Text>
              <Text style={styles.verseTextDisplay}>{verseText}</Text>
              <TouchableOpacity
                style={[styles.verseSaveBtn, savingVerse && styles.verseSaveBtnDisabled]}
                onPress={handleSaveVerse}
                disabled={savingVerse}
              >
                {savingVerse ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Save size={18} color="#fff" />
                    <Text style={styles.verseSaveBtnText}>Salvar versículo do dia</Text>
                  </>
                )}
              </TouchableOpacity>
            </>
          ) : (
            <Text style={styles.verseHint}>Nenhum versículo selecionado.</Text>
          )}
          <TouchableOpacity style={styles.selectVerseBtn} onPress={() => openPicker('day')} activeOpacity={0.8}>
            <Text style={styles.selectVerseBtnText}>{verseRef ? 'Trocar versículo' : 'Selecionar livro, capítulo e versículo'}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.sectionTitleWrap}>
          <Calendar size={20} color={COLORS.primary} />
          <Text style={styles.sectionTitle}>Versículo da semana</Text>
        </View>
        <View style={styles.verseCard}>
          {verseWeekRef ? (
            <>
              <Text style={styles.verseRefDisplay}>{verseWeekRef}</Text>
              <Text style={styles.verseTextDisplay}>{verseWeekText}</Text>
              <TouchableOpacity
                style={[styles.verseSaveBtn, savingVerseWeek && styles.verseSaveBtnDisabled]}
                onPress={handleSaveVerseWeek}
                disabled={savingVerseWeek}
              >
                {savingVerseWeek ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Save size={18} color="#fff" />
                    <Text style={styles.verseSaveBtnText}>Salvar versículo da semana</Text>
                  </>
                )}
              </TouchableOpacity>
            </>
          ) : (
            <Text style={styles.verseHint}>Nenhum versículo selecionado.</Text>
          )}
          <TouchableOpacity style={styles.selectVerseBtn} onPress={() => openPicker('week')} activeOpacity={0.8}>
            <Text style={styles.selectVerseBtnText}>{verseWeekRef ? 'Trocar versículo' : 'Selecionar livro, capítulo e versículo'}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <Modal visible={showPicker} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{pickerTitle}</Text>
              <TouchableOpacity
                onPress={() => setShowPicker(false)}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <Text style={styles.modalClose}>Fechar</Text>
              </TouchableOpacity>
            </View>
            {(pickerStep === 'chapter' || pickerStep === 'verse') && (
              <TouchableOpacity
                style={styles.modalBack}
                onPress={() => {
                  if (pickerStep === 'verse') {
                    setPickerStep('chapter');
                    setChapterData(null);
                  } else {
                    setPickerStep('book');
                    setSelectedBookId(null);
                    setSelectedChapter(null);
                  }
                }}
              >
                <ArrowLeft size={20} color={COLORS.primary} />
                <Text style={styles.modalBackText}>Voltar</Text>
              </TouchableOpacity>
            )}
            {renderPickerContent()}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: SPACING.LG, backgroundColor: '#fff' },
  headerTitle: { ...TYPOGRAPHY.h3, color: COLORS.text },
  sectionTitleWrap: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12, marginTop: 8 },
  sectionTitle: { ...TYPOGRAPHY.h3, color: COLORS.text },
  verseCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    ...SHADOWS.small,
  },
  verseRefDisplay: { fontSize: 15, fontWeight: '700', color: COLORS.primary, marginBottom: 8 },
  verseTextDisplay: { fontSize: 15, color: COLORS.text, lineHeight: 22, marginBottom: 16 },
  verseHint: { fontSize: 14, color: COLORS.textSecondary, marginBottom: 12 },
  verseSaveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.primary,
    padding: 14,
    borderRadius: 12,
    marginBottom: 12,
  },
  verseSaveBtnDisabled: { opacity: 0.7 },
  verseSaveBtnText: { fontSize: 15, fontWeight: '600', color: '#fff' },
  selectVerseBtn: {
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.MD,
  },
  selectVerseBtnText: { fontSize: 14, fontWeight: '600', color: COLORS.primary },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalBox: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    paddingBottom: SPACING.LG,
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: SPACING.LG, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  modalTitle: { ...TYPOGRAPHY.h3 },
  modalClose: { fontSize: 16, color: COLORS.primary, fontWeight: '600' },
  modalBack: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: SPACING.LG, paddingVertical: 10 },
  modalBackText: { fontSize: 15, color: COLORS.primary, fontWeight: '600' },
  pickerList: { maxHeight: 400, paddingHorizontal: SPACING.LG, paddingBottom: SPACING.LG },
  pickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  pickerItemText: { fontSize: 16, color: COLORS.text },
  chapterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 10, paddingVertical: 4 },
  chapterChip: {
    width: '22%',
    aspectRatio: 1,
    maxWidth: 72,
    minHeight: 48,
    backgroundColor: `${COLORS.primary}18`,
    borderRadius: BORDER_RADIUS.MD,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chapterChipText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.primary,
    textAlign: 'center',
    width: '100%',
  },
  verseItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: 12,
  },
  verseNumber: { fontSize: 14, fontWeight: '700', color: COLORS.primary, minWidth: 28 },
  versePreview: { flex: 1, fontSize: 14, color: COLORS.text },
  pickerLoading: { padding: SPACING.XXL, alignItems: 'center' },
  pickerLoadingText: { marginTop: 12, fontSize: 14, color: COLORS.textSecondary },
  pickerEmpty: { padding: SPACING.XXL, alignItems: 'center' },
  pickerEmptyText: { fontSize: 15, color: COLORS.textSecondary },
});
