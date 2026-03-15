/**
 * Bíblia — funcionalidade obrigatória (ALL).
 * Bíblia completa com navegação por livro e capítulo.
 * API: bible-api.com (Almeida) / A Bíblia Digital (fallback).
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Modal,
  Pressable,
  TextInput,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ChevronRight, ChevronLeft, Book, Settings2, Calendar, Check, Plus, Trash2 } from 'lucide-react-native';
import { COLORS } from '../../constants/colors';
import { SPACING, BORDER_RADIUS } from '../../constants/dimensions';
import { TYPOGRAPHY, SHADOWS } from '../../constants/theme';
import Gradient from '../../components/ui/Gradient';
import { getBibleBooks, getChapter, type BibleBook, type BibleChapter, type BibleVersion, BIBLE_VERSIONS, DEFAULT_VERSION } from '../../services/bibleApi';
import { BIBLE_READING_PLANS, BIBLE_BOOK_IDS, BOOK_NAMES, BOOK_CHAPTERS, getBookChapterCount, buildFullBiblePlan, type BibleReadingPlan, type CustomReadingPlan, type DailyReading } from '../../constants/bibleReadingPlans';
import { markReadingComplete, getPlanProgress, isReadingCompleteSync, getNextReading } from '../../services/bibleReadingProgress';
import { getCustomPlans, saveCustomPlan, createCustomPlan } from '../../services/bibleCustomPlans';
import { getCurrentUser } from '../../services/supabase';
import { notifyAchievementUnlockIfNew } from '../../services/achievementsService';

const BIBLE_VERSION_KEY = 'bible_version';

type ViewMode = 'home' | 'books' | 'chapters' | 'reader' | 'plans' | 'planDetail' | 'createPlan';

export default function BibleScreen() {
  const [viewMode, setViewMode] = useState<ViewMode>('home');
  const [books, setBooks] = useState<BibleBook[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedBook, setSelectedBook] = useState<BibleBook | null>(null);
  const [chapterData, setChapterData] = useState<BibleChapter | null>(null);
  const [selectedVersion, setSelectedVersion] = useState<BibleVersion>(DEFAULT_VERSION);
  const [showVersionModal, setShowVersionModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<BibleReadingPlan | null>(null);
  const [planDay, setPlanDay] = useState(1);
  const [planContext, setPlanContext] = useState<{ planId: string; dayIndex: number; readingIndex: number } | null>(null);
  const [planProgress, setPlanProgress] = useState<Record<string, string>>({});
  const [customPlans, setCustomPlans] = useState<CustomReadingPlan[]>([]);
  const [newPlanName, setNewPlanName] = useState('');
  const [newPlanDesc, setNewPlanDesc] = useState('');
  const [newPlanReadings, setNewPlanReadings] = useState<DailyReading[][]>([]);
  const [addReadingModal, setAddReadingModal] = useState<{ dayIdx: number } | null>(null);
  const [addReadingBookId, setAddReadingBookId] = useState<string>(BIBLE_BOOK_IDS[0] ?? 'GEN');
  const [addReadingChapter, setAddReadingChapter] = useState(1);
  const [showBookPicker, setShowBookPicker] = useState(false);
  const [showChapterPicker, setShowChapterPicker] = useState(false);
  const [showBiblePlanMonthsModal, setShowBiblePlanMonthsModal] = useState(false);
  const [pendingBiblePlan, setPendingBiblePlan] = useState<BibleReadingPlan | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(BIBLE_VERSION_KEY).then((v) => {
      if (v && BIBLE_VERSIONS.some((x) => x.id === v)) setSelectedVersion(v as BibleVersion);
    });
  }, []);

  useEffect(() => {
    if (viewMode === 'books' && books.length === 0) {
      loadBooks();
    }
  }, [viewMode, books.length]);

  useEffect(() => {
    if (viewMode === 'plans' || viewMode === 'planDetail') {
      getCustomPlans().then(setCustomPlans);
    }
  }, [viewMode]);

  useEffect(() => {
    if (selectedPlan) {
      getPlanProgress(selectedPlan.id).then(setPlanProgress);
    }
  }, [selectedPlan, viewMode]);

  const handleVersionSelect = (v: BibleVersion) => {
    setSelectedVersion(v);
    AsyncStorage.setItem(BIBLE_VERSION_KEY, v);
    setShowVersionModal(false);
    if (viewMode === 'reader' && selectedBook && chapterData) {
      setLoading(true);
      setError(null);
      getChapter(v, selectedBook.id || selectedBook.abbrev?.en || '', chapterData.chapter.number).then((data) => {
        if (data) setChapterData(data);
        setLoading(false);
      }).catch(() => setLoading(false));
    }
  };

  const loadBooks = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getBibleBooks();
      setBooks(data);
    } catch {
      setError('Não foi possível carregar os livros.');
    } finally {
      setLoading(false);
    }
  };

  const loadChapter = async (book: BibleBook, chapterNum: number) => {
    setLoading(true);
    setError(null);
    try {
      const bookId = book.id || (typeof book.abbrev === 'string' ? book.abbrev : (book.abbrev?.en || book.abbrev?.pt || ''));
      const data = await getChapter(selectedVersion, bookId, chapterNum);
      if (data) {
        setChapterData(data);
        setSelectedBook(book);
        setViewMode('reader');
      } else {
        setError('Capítulo não encontrado.');
      }
    } catch {
      setError('Não foi possível carregar o capítulo.');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    if (viewMode === 'reader') {
      setPlanContext(null);
      setViewMode(selectedPlan ? 'planDetail' : 'chapters');
    } else if (viewMode === 'chapters') setViewMode('books');
    else if (viewMode === 'planDetail') setViewMode('plans');
    else if (viewMode === 'createPlan') setViewMode('plans');
    else if (viewMode === 'plans') setViewMode('home');
    else setViewMode('home');
  };

  const loadChapterFromPlan = async (
    reading: DailyReading,
    planId: string,
    dayIndex: number,
    readingIndex: number
  ) => {
    setPlanContext({ planId, dayIndex, readingIndex });
    const bookId = reading.bookId;
    const ntIds = ['MAT','MRK','LUK','JHN','ACT','ROM','1CO','2CO','GAL','EPH','PHP','COL','1TH','2TH','1TI','2TI','TIT','PHM','HEB','JAS','1PE','2PE','1JN','2JN','3JN','JUD','REV'];
    const fakeBook: BibleBook = {
      id: bookId,
      abbrev: { pt: bookId.toLowerCase(), en: bookId },
      name: reading.bookName || bookId,
      testament: ntIds.includes(bookId) ? 'NT' : 'VT',
      chapters: 1,
    };
    await loadChapter(fakeBook, reading.chapter);
  };

  const handleMarkComplete = async () => {
    if (!planContext || !selectedPlan) return;
    await markReadingComplete(selectedPlan.id, planContext.dayIndex, planContext.readingIndex);
    const p = await getPlanProgress(selectedPlan.id);
    setPlanProgress(p);
    setPlanContext(null);
    setViewMode('planDetail');
    const getCnt = (d: number) => selectedPlan.getReadingForDay(d).length;
    const next = getNextReading(p, selectedPlan.id, selectedPlan.totalDays, getCnt);
    if (next === null) {
      const user = await getCurrentUser();
      if ((user as any)?.id) notifyAchievementUnlockIfNew((user as any).id, 'bible_plans_completed').catch(() => {});
    }
  };

  const allPlans = [...BIBLE_READING_PLANS, ...customPlans];

  const getReadingsCount = (plan: BibleReadingPlan, day: number) =>
    plan.getReadingForDay(day).length;

  const nextReading = selectedPlan
    ? getNextReading(
        planProgress,
        selectedPlan.id,
        selectedPlan.totalDays,
        (d) => getReadingsCount(selectedPlan, d)
      )
    : null;

  const vtBooks = books.filter((b) => b.testament === 'VT');
  const ntBooks = books.filter((b) => b.testament === 'NT');

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Gradient
        colors={[COLORS.gradientStart, COLORS.gradientMiddle]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <View style={styles.headerRow}>
          {(viewMode === 'books' || viewMode === 'chapters' || viewMode === 'reader' || viewMode === 'plans' || viewMode === 'planDetail' || viewMode === 'createPlan') && (
            <TouchableOpacity style={styles.backBtn} onPress={handleBack} activeOpacity={0.8}>
              <ChevronLeft size={24} color="#fff" strokeWidth={2} />
            </TouchableOpacity>
          )}
          <View style={styles.headerTextWrap}>
            <Text style={styles.title} numberOfLines={2}>
              {viewMode === 'reader' && chapterData
                ? `${chapterData.book.name} ${chapterData.chapter.number}`
                : viewMode === 'chapters' && selectedBook
                ? selectedBook.name
                : viewMode === 'planDetail' && selectedPlan
                ? selectedPlan.name
                : viewMode === 'plans'
                ? 'Planos de leitura'
                : viewMode === 'createPlan'
                ? 'Criar plano'
                : 'Bíblia'}
            </Text>
            <Text style={styles.subtitle} numberOfLines={2}>
              {viewMode === 'home' && `Leia a Bíblia completa. Versão: ${BIBLE_VERSIONS.find((v) => v.id === selectedVersion)?.fullName || selectedVersion}.`}
              {viewMode === 'books' && 'Selecione um livro'}
              {viewMode === 'chapters' && selectedBook && `Escolha o capítulo (1 a ${selectedBook.chapters})`}
              {viewMode === 'reader' && chapterData && `${chapterData.chapter.verses} versículos · ${BIBLE_VERSIONS.find((v) => v.id === selectedVersion)?.label || selectedVersion}`}
              {viewMode === 'plans' && 'Escolha um plano e acompanhe sua leitura'}
              {viewMode === 'planDetail' && selectedPlan && `Dia ${planDay} de ${selectedPlan.totalDays}`}
              {viewMode === 'createPlan' && 'Configure as leituras diárias'}
            </Text>
          </View>
          {(viewMode === 'reader' || viewMode === 'plans' || viewMode === 'planDetail') && viewMode === 'reader' && (
            <TouchableOpacity style={styles.versionBtn} onPress={() => setShowVersionModal(true)} activeOpacity={0.8}>
              <Settings2 size={20} color="rgba(255,255,255,0.95)" strokeWidth={2} />
            </TouchableOpacity>
          )}
        </View>
      </Gradient>

      {loading && (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      )}

      {error && (
        <View style={styles.errorWrap}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {!loading && viewMode === 'home' && (
        <ScrollView style={styles.content} contentContainerStyle={styles.contentInner} showsVerticalScrollIndicator={false}>
          <View style={styles.versionSection}>
            <Text style={styles.versionLabel}>Versão</Text>
            <View style={styles.versionChips}>
              {BIBLE_VERSIONS.map((v) => (
                <TouchableOpacity
                  key={v.id}
                  style={[styles.versionChip, selectedVersion === v.id && styles.versionChipActive]}
                  onPress={() => handleVersionSelect(v.id)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.versionChipText, selectedVersion === v.id && styles.versionChipTextActive]}>{v.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          <TouchableOpacity
            style={styles.mainCard}
            onPress={() => {
              setViewMode('books');
              if (books.length === 0) loadBooks();
            }}
            activeOpacity={0.85}
          >
            <Book size={44} color={COLORS.primary} strokeWidth={1.5} />
            <Text style={styles.cardTitle}>Ler a Bíblia</Text>
            <Text style={styles.cardText}>
              Navegue por todos os 66 livros, escolha o capítulo e leia os versículos. Versão selecionada: {BIBLE_VERSIONS.find((v) => v.id === selectedVersion)?.fullName || selectedVersion}.
            </Text>
            <View style={styles.cardFooter}>
              <Text style={styles.cardLink}>Abrir</Text>
              <ChevronRight size={20} color={COLORS.primary} />
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.mainCard}
            onPress={() => setViewMode('plans')}
            activeOpacity={0.85}
          >
            <Calendar size={44} color={COLORS.secondary} strokeWidth={1.5} />
            <Text style={styles.cardTitle}>Plano de leitura</Text>
            <Text style={styles.cardText}>
              Acompanhe leituras guiadas: Provérbios em 31 dias, João em 21 dias, Salmos em 30 dias ou o Novo Testamento em 90 dias.
            </Text>
            <View style={styles.cardFooter}>
              <Text style={styles.cardLink}>Ver planos</Text>
              <ChevronRight size={20} color={COLORS.primary} />
            </View>
          </TouchableOpacity>
        </ScrollView>
      )}

      {!loading && viewMode === 'plans' && (
        <ScrollView style={styles.content} contentContainerStyle={styles.contentInner} showsVerticalScrollIndicator={false}>
          <TouchableOpacity
            style={styles.createPlanButton}
            onPress={() => {
              setNewPlanName('');
              setNewPlanDesc('');
              setNewPlanReadings([[]]);
              setViewMode('createPlan');
            }}
            activeOpacity={0.8}
          >
            <Plus size={24} color="#fff" strokeWidth={2} />
            <Text style={styles.createPlanButtonText}>Criar meu plano</Text>
          </TouchableOpacity>
          <View style={styles.plansSectionHeader}>
            <Text style={styles.plansSectionTitle}>Escolha um plano</Text>
            <Text style={styles.plansSectionSubtitle}>Planos prontos para acompanhar sua leitura bíblica</Text>
          </View>
          {allPlans.map((plan) => (
            <TouchableOpacity
              key={plan.id}
              style={styles.bookItem}
              onPress={() => {
                if (plan.configurableMonths) {
                  setPendingBiblePlan(plan);
                  setShowBiblePlanMonthsModal(true);
                } else {
                  setSelectedPlan(plan);
                  setPlanDay(1);
                  setViewMode('planDetail');
                }
              }}
              activeOpacity={0.7}
            >
              <Text style={styles.bookName} numberOfLines={2}>{plan.name}</Text>
              <Text style={styles.bookMeta}>{plan.configurableMonths ? `1 a ${plan.configurableMonths.max} meses` : `${plan.totalDays} dias`}</Text>
              <ChevronRight size={20} color={COLORS.textSecondary} />
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {!loading && viewMode === 'planDetail' && selectedPlan && (
        <ScrollView style={styles.content} contentContainerStyle={styles.contentInner} showsVerticalScrollIndicator={false}>
          <Text style={styles.planDescription}>{selectedPlan.description}</Text>
          {selectedPlan.id.startsWith('biblia_completa_') && (
            <TouchableOpacity style={styles.changeDurationBtn} onPress={() => setShowBiblePlanMonthsModal(true)}>
              <Text style={styles.changeDurationBtnText}>Alterar duração (meses)</Text>
            </TouchableOpacity>
          )}
          {nextReading && (
            <TouchableOpacity
              style={styles.continueButton}
              onPress={() => setPlanDay(nextReading.day)}
              activeOpacity={0.8}
            >
              <Text style={styles.continueButtonText}>Continuar do dia {nextReading.day}</Text>
            </TouchableOpacity>
          )}
          <View style={styles.planDayRow}>
            <Text style={styles.planDayLabel}>Dia</Text>
            <View style={styles.planDayInputRow}>
              <TouchableOpacity
                style={styles.planDayBtn}
                onPress={() => setPlanDay((d) => Math.max(1, d - 1))}
                disabled={planDay <= 1}
              >
                <Text style={styles.planDayBtnText}>−</Text>
              </TouchableOpacity>
              <Text style={styles.planDayValue}>{planDay}</Text>
              <TouchableOpacity
                style={styles.planDayBtn}
                onPress={() => setPlanDay((d) => Math.min(selectedPlan.totalDays, d + 1))}
                disabled={planDay >= selectedPlan.totalDays}
              >
                <Text style={styles.planDayBtnText}>+</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.planDayTotal}>de {selectedPlan.totalDays}</Text>
          </View>
          <Text style={styles.planReadingsTitle}>Leitura do dia:</Text>
          {selectedPlan.getReadingForDay(planDay).map((r, i) => {
            const done = isReadingCompleteSync(planProgress, selectedPlan.id, planDay - 1, i);
            return (
              <TouchableOpacity
                key={`${r.bookId}-${r.chapter}-${i}`}
                style={[styles.bookItem, done && styles.bookItemDone]}
                onPress={() => loadChapterFromPlan(r, selectedPlan.id, planDay - 1, i)}
                activeOpacity={0.7}
              >
                {done && <Check size={20} color={COLORS.success} strokeWidth={2.5} style={{ marginRight: 8 }} />}
                <Text style={[styles.bookName, done && styles.bookNameDone]}>{r.bookName || r.bookId} {r.chapter}</Text>
                <ChevronRight size={20} color={done ? COLORS.success : COLORS.primary} />
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      {!loading && viewMode === 'createPlan' && (
        <ScrollView style={styles.content} contentContainerStyle={styles.contentInner} showsVerticalScrollIndicator={false}>
          <TextInput
            style={styles.input}
            placeholder="Nome do plano"
            placeholderTextColor={COLORS.textSecondary}
            value={newPlanName}
            onChangeText={setNewPlanName}
          />
          <TextInput
            style={[styles.input, styles.inputMultiline]}
            placeholder="Descrição (opcional)"
            placeholderTextColor={COLORS.textSecondary}
            value={newPlanDesc}
            onChangeText={setNewPlanDesc}
            multiline
          />
          <Text style={styles.planReadingsTitle}>Dias de leitura</Text>
          {newPlanReadings.map((dayReadings, dayIdx) => (
            <View key={dayIdx} style={styles.dayBlock}>
              <Text style={styles.dayBlockTitle}>Dia {dayIdx + 1}</Text>
              {dayReadings.map((r, rIdx) => (
                <View key={rIdx} style={styles.readingRow}>
                  <Text style={styles.readingRowText}>{r.bookName || r.bookId} {r.chapter}</Text>
                  <TouchableOpacity onPress={() => {
                    const next = [...newPlanReadings];
                    next[dayIdx] = dayReadings.filter((_, i) => i !== rIdx);
                    if (next[dayIdx].length === 0) {
                      next.splice(dayIdx, 1);
                      if (next.length === 0) next.push([]);
                    }
                    setNewPlanReadings(next);
                  }}>
                    <Trash2 size={18} color={COLORS.error} />
                  </TouchableOpacity>
                </View>
              ))}
              <TouchableOpacity
                style={styles.addReadingBtn}
onPress={() => {
                  setAddReadingBookId(BIBLE_BOOK_IDS[0] ?? 'GEN');
                  setAddReadingChapter(1);
                  setAddReadingModal({ dayIdx });
                }}
              >
                <Plus size={18} color={COLORS.primary} />
                <Text style={styles.addReadingBtnText}>Adicionar leitura</Text>
              </TouchableOpacity>
            </View>
          ))}
          <TouchableOpacity
            style={styles.addDayBtn}
            onPress={() => setNewPlanReadings([...newPlanReadings, []])}
          >
            <Plus size={20} color={COLORS.primary} />
            <Text style={styles.addDayBtnText}>Adicionar dia</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.savePlanBtn, (!newPlanName.trim() || newPlanReadings.every((d) => d.length === 0)) && styles.savePlanBtnDisabled]}
            onPress={async () => {
              if (!newPlanName.trim()) return;
              const valid = newPlanReadings.filter((d) => d.length > 0);
              if (valid.length === 0) return;
              const plan = createCustomPlan(newPlanName.trim(), newPlanDesc.trim(), valid);
              await saveCustomPlan(plan);
              setCustomPlans(await getCustomPlans());
              setSelectedPlan(plan);
              setPlanDay(1);
              setViewMode('planDetail');
            }}
            disabled={!newPlanName.trim() || newPlanReadings.every((d) => d.length === 0)}
          >
            <Text style={styles.savePlanBtnText}>Salvar plano</Text>
          </TouchableOpacity>
        </ScrollView>
      )}

      {!loading && viewMode === 'books' && (
        <ScrollView style={styles.content} contentContainerStyle={styles.contentInner} showsVerticalScrollIndicator={false}>
          {vtBooks.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Antigo Testamento</Text>
              {vtBooks.map((book) => (
                <TouchableOpacity
                  key={book.abbrev.pt}
                  style={styles.bookItem}
                  onPress={() => {
                    setSelectedBook(book);
                    setViewMode('chapters');
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={styles.bookName}>{book.name}</Text>
                  <Text style={styles.bookMeta}>{book.chapters} capítulos</Text>
                  <ChevronRight size={20} color={COLORS.textSecondary} />
                </TouchableOpacity>
              ))}
            </View>
          )}
          {ntBooks.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Novo Testamento</Text>
              {ntBooks.map((book) => (
                <TouchableOpacity
                  key={book.abbrev.pt}
                  style={styles.bookItem}
                  onPress={() => {
                    setSelectedBook(book);
                    setViewMode('chapters');
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={styles.bookName}>{book.name}</Text>
                  <Text style={styles.bookMeta}>{book.chapters} capítulos</Text>
                  <ChevronRight size={20} color={COLORS.textSecondary} />
                </TouchableOpacity>
              ))}
            </View>
          )}
        </ScrollView>
      )}

      {!loading && viewMode === 'chapters' && selectedBook && (
        <ScrollView style={styles.content} contentContainerStyle={styles.chaptersContent} showsVerticalScrollIndicator={false}>
          <View style={styles.chaptersGrid}>
            {Array.from({ length: selectedBook.chapters }, (_, i) => i + 1).map((num) => (
              <TouchableOpacity
                key={num}
                style={styles.chapterChip}
                onPress={() => loadChapter(selectedBook, num)}
                activeOpacity={0.8}
              >
                <Text style={styles.chapterChipText}>{num}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      )}

      {!loading && viewMode === 'reader' && chapterData && (
        <ScrollView style={styles.readerScroll} contentContainerStyle={styles.readerContent} showsVerticalScrollIndicator={false}>
          {chapterData.verses.map((v) => (
            <View key={v.number} style={styles.verseRow}>
              <Text style={styles.verseNum}>{v.number}</Text>
              <Text style={styles.verseText}>{v.text}</Text>
            </View>
          ))}
          {planContext && selectedPlan && (
            <TouchableOpacity
              style={styles.markCompleteButton}
              onPress={handleMarkComplete}
              activeOpacity={0.85}
            >
              <Check size={22} color="#fff" strokeWidth={2.5} />
              <Text style={styles.markCompleteText}>Marquei como lido</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      )}

      <Modal visible={!!addReadingModal && !showBookPicker && !showChapterPicker} transparent animationType="fade">
        <Pressable style={styles.modalOverlay} onPress={() => { setAddReadingModal(null); setShowBookPicker(false); setShowChapterPicker(false); }}>
          <Pressable style={styles.modalBox} onPress={() => {}}>
            <Text style={styles.modalTitle}>Adicionar leitura</Text>
            <Text style={styles.modalSubtitle}>Selecione o livro e o capítulo</Text>
            <TouchableOpacity style={styles.pickerTouch} onPress={() => setShowBookPicker(true)} activeOpacity={0.7}>
              <Text style={styles.pickerLabel}>Livro</Text>
              <Text style={styles.pickerValue}>{BOOK_NAMES[addReadingBookId] ?? addReadingBookId}</Text>
              <ChevronRight size={20} color={COLORS.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.pickerTouch} onPress={() => setShowChapterPicker(true)} activeOpacity={0.7}>
              <Text style={styles.pickerLabel}>Capítulo</Text>
              <Text style={styles.pickerValue}>{addReadingChapter}</Text>
              <ChevronRight size={20} color={COLORS.textSecondary} />
            </TouchableOpacity>
            <View style={styles.modalRow}>
              <TouchableOpacity style={styles.modalButton} onPress={() => { setAddReadingModal(null); setShowBookPicker(false); setShowChapterPicker(false); }}>
                <Text style={styles.modalButtonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonPrimary]}
                onPress={() => {
                  if (!addReadingModal) return;
                  const maxCh = getBookChapterCount(addReadingBookId);
                  const ch = Math.min(Math.max(1, addReadingChapter), maxCh);
                  const next = [...newPlanReadings];
                  const dayIdx = addReadingModal.dayIdx;
                  next[dayIdx] = [...(next[dayIdx] || []), { bookId: addReadingBookId, chapter: ch, bookName: BOOK_NAMES[addReadingBookId] }];
                  setNewPlanReadings(next);
                  setAddReadingModal(null);
                  setShowBookPicker(false);
                  setShowChapterPicker(false);
                }}
              >
                <Text style={[styles.modalButtonText, { color: '#fff' }]}>Adicionar</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={showBookPicker} transparent animationType="slide">
        <Pressable style={styles.modalOverlay} onPress={() => setShowBookPicker(false)}>
          <Pressable style={styles.pickerModalBox} onPress={() => {}}>
            <Text style={styles.pickerModalTitle}>Selecionar livro</Text>
            <FlatList
              data={BIBLE_BOOK_IDS}
              keyExtractor={(id) => id}
              style={styles.pickerList}
              renderItem={({ item: bookId }) => (
                <TouchableOpacity
                  style={[styles.pickerOption, addReadingBookId === bookId && styles.pickerOptionActive]}
                  onPress={() => {
                    setAddReadingBookId(bookId);
                    const maxCh = getBookChapterCount(bookId);
                    setAddReadingChapter((c) => Math.min(c, maxCh));
                    setShowBookPicker(false);
                  }}
                >
                  <Text style={[styles.pickerOptionText, addReadingBookId === bookId && styles.pickerOptionTextActive]}>
                    {BOOK_NAMES[bookId] ?? bookId}
                  </Text>
                  {addReadingBookId === bookId && <Check size={20} color={COLORS.primary} />}
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity style={styles.pickerCancelBtn} onPress={() => setShowBookPicker(false)}>
              <Text style={styles.modalButtonText}>Fechar</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={showChapterPicker} transparent animationType="slide">
        <Pressable style={styles.modalOverlay} onPress={() => setShowChapterPicker(false)}>
          <Pressable style={styles.pickerModalBox} onPress={() => {}}>
            <Text style={styles.pickerModalTitle}>Selecionar capítulo</Text>
            <FlatList
              data={Array.from({ length: getBookChapterCount(addReadingBookId) }, (_, i) => i + 1)}
              keyExtractor={(n) => String(n)}
              style={styles.pickerList}
              renderItem={({ item: ch }) => (
                <TouchableOpacity
                  style={[styles.pickerOption, addReadingChapter === ch && styles.pickerOptionActive]}
                  onPress={() => {
                    setAddReadingChapter(ch);
                    setShowChapterPicker(false);
                  }}
                >
                  <Text style={[styles.pickerOptionText, addReadingChapter === ch && styles.pickerOptionTextActive]}>
                    Capítulo {ch}
                  </Text>
                  {addReadingChapter === ch && <Check size={20} color={COLORS.primary} />}
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity style={styles.pickerCancelBtn} onPress={() => setShowChapterPicker(false)}>
              <Text style={styles.modalButtonText}>Fechar</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={showBiblePlanMonthsModal} transparent animationType="slide">
        <Pressable style={styles.modalOverlay} onPress={() => { setShowBiblePlanMonthsModal(false); setPendingBiblePlan(null); }}>
          <Pressable style={styles.pickerModalBox} onPress={() => {}}>
            <Text style={styles.pickerModalTitle}>Em quantos meses deseja concluir?</Text>
            <Text style={styles.modalSubtitle}>Selecione a duração do plano (1 a 36 meses)</Text>
            <ScrollView style={styles.monthsGridScroll} contentContainerStyle={styles.monthsGrid}>
              {Array.from({ length: 36 }, (_, i) => i + 1).map((months) => (
                <TouchableOpacity
                  key={months}
                  style={styles.monthChip}
                  onPress={() => {
                    const plan = buildFullBiblePlan(months);
                    setSelectedPlan(plan);
                    setPlanDay(1);
                    setViewMode('planDetail');
                    setShowBiblePlanMonthsModal(false);
                    setPendingBiblePlan(null);
                  }}
                >
                  <Text style={styles.monthChipText}>{months}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity style={styles.pickerCancelBtn} onPress={() => { setShowBiblePlanMonthsModal(false); setPendingBiblePlan(null); }}>
              <Text style={styles.modalButtonText}>Cancelar</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={showVersionModal} transparent animationType="fade">
        <Pressable style={styles.modalOverlay} onPress={() => setShowVersionModal(false)}>
          <Pressable style={styles.modalBox} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.modalTitle}>Escolher versão</Text>
            {BIBLE_VERSIONS.map((v) => (
              <TouchableOpacity
                key={v.id}
                style={[styles.modalOption, selectedVersion === v.id && styles.modalOptionActive]}
                onPress={() => handleVersionSelect(v.id)}
                activeOpacity={0.8}
              >
                <Text style={[styles.modalOptionLabel, selectedVersion === v.id && styles.modalOptionLabelActive]}>{v.label}</Text>
                <Text style={styles.modalOptionFull}>{v.fullName}</Text>
              </TouchableOpacity>
            ))}
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    paddingTop: SPACING.LG,
    paddingBottom: SPACING.XL,
    paddingHorizontal: SPACING.LG,
  },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.MD },
  backBtn: { paddingVertical: 4, paddingRight: 4 },
  versionBtn: { paddingVertical: 4, paddingHorizontal: 4 },
  headerTextWrap: { flex: 1, minWidth: 0 },
  title: { ...TYPOGRAPHY.h1, color: '#fff', marginBottom: 8 },
  subtitle: { fontSize: 15, color: 'rgba(255,255,255,0.9)', lineHeight: 22 },
  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorWrap: { padding: SPACING.LG, alignItems: 'center' },
  errorText: { color: COLORS.error, fontSize: 15 },
  content: { flex: 1 },
  contentInner: { padding: SPACING.LG, paddingBottom: SPACING.XXL },
  versionSection: { marginBottom: SPACING.LG },
  versionLabel: { ...TYPOGRAPHY.caption, color: COLORS.textSecondary, marginBottom: SPACING.SM },
  versionChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  versionChip: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: BORDER_RADIUS.MD, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border },
  versionChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  versionChipText: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  versionChipTextActive: { color: '#fff' },
  mainCard: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.LG,
    padding: SPACING.LG,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.MD,
    ...SHADOWS.small,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.LG,
    padding: SPACING.LG,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.small,
  },
  cardTitle: { ...TYPOGRAPHY.h3, color: COLORS.text, marginTop: SPACING.MD, marginBottom: 8 },
  cardText: { ...TYPOGRAPHY.body, color: COLORS.textSecondary, marginBottom: SPACING.MD, lineHeight: 22 },
  cardFooter: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  cardLink: { fontSize: 16, fontWeight: '600', color: COLORS.primary },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    paddingHorizontal: SPACING.LG,
    borderRadius: BORDER_RADIUS.MD,
    marginTop: SPACING.SM,
  },
  buttonText: { fontSize: 16, fontWeight: '600', color: '#fff' },
  section: { marginBottom: SPACING.XL },
  sectionTitle: { ...TYPOGRAPHY.h4, color: COLORS.primary, marginBottom: SPACING.MD },
  bookItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    padding: SPACING.MD,
    borderRadius: BORDER_RADIUS.MD,
    marginBottom: SPACING.SM,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  bookName: { flex: 1, fontSize: 16, fontWeight: '600', color: COLORS.text },
  bookMeta: { fontSize: 14, color: COLORS.textSecondary, marginRight: 8 },
  planDescription: { ...TYPOGRAPHY.body, color: COLORS.textSecondary, marginBottom: SPACING.MD, lineHeight: 22 },
  changeDurationBtn: { alignSelf: 'flex-start', paddingVertical: 8, paddingHorizontal: 12, backgroundColor: `${COLORS.primary}15`, borderRadius: BORDER_RADIUS.MD, marginBottom: SPACING.LG },
  changeDurationBtnText: { fontSize: 14, color: COLORS.primary, fontWeight: '600' },
  planDayRow: { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.LG, gap: SPACING.MD },
  planDayLabel: { fontSize: 16, fontWeight: '600', color: COLORS.text },
  planDayInputRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  planDayBtn: { width: 40, height: 40, borderRadius: BORDER_RADIUS.MD, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, justifyContent: 'center', alignItems: 'center' },
  planDayBtnText: { fontSize: 20, fontWeight: '700', color: COLORS.primary },
  planDayValue: { fontSize: 20, fontWeight: '700', color: COLORS.text, minWidth: 32, textAlign: 'center' },
  planDayTotal: { fontSize: 14, color: COLORS.textSecondary },
  planReadingsTitle: { ...TYPOGRAPHY.h4, color: COLORS.primary, marginBottom: SPACING.MD },
  chaptersContent: { padding: SPACING.LG, paddingBottom: SPACING.XXL },
  chaptersGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  chapterChip: {
    width: 56,
    height: 56,
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.MD,
    borderWidth: 1,
    borderColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chapterChipText: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  readerScroll: { flex: 1 },
  readerContent: { padding: SPACING.LG, paddingBottom: SPACING.XXL * 2 },
  verseRow: { flexDirection: 'row', marginBottom: SPACING.SM, gap: 12 },
  verseNum: { fontSize: 14, fontWeight: '700', color: COLORS.primary, minWidth: 24, textAlign: 'right' },
  verseText: { flex: 1, ...TYPOGRAPHY.body, lineHeight: 26, color: COLORS.text },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: SPACING.LG },
  modalBox: { backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.LG, padding: SPACING.LG },
  modalTitle: { ...TYPOGRAPHY.h3, color: COLORS.text, marginBottom: SPACING.MD },
  modalOption: { paddingVertical: SPACING.MD, paddingHorizontal: SPACING.SM, borderRadius: BORDER_RADIUS.MD, marginBottom: SPACING.SM, borderWidth: 1, borderColor: COLORS.border },
  modalOptionActive: { backgroundColor: COLORS.surfaceVariant, borderColor: COLORS.primary },
  modalOptionLabel: { fontSize: 16, fontWeight: '600', color: COLORS.text },
  modalOptionLabelActive: { color: COLORS.primary },
  modalOptionFull: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
  createPlanButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: COLORS.secondary, padding: 16, borderRadius: BORDER_RADIUS.MD, marginBottom: SPACING.LG },
  createPlanButtonText: { fontSize: 16, fontWeight: '700', color: '#fff' },
  plansSectionHeader: { marginBottom: SPACING.MD },
  plansSectionTitle: { fontSize: 18, fontWeight: '600', color: COLORS.text, marginBottom: 4 },
  plansSectionSubtitle: { fontSize: 14, color: COLORS.textSecondary, lineHeight: 20 },
  continueButton: { backgroundColor: COLORS.success + '20', padding: 12, borderRadius: BORDER_RADIUS.MD, marginBottom: SPACING.MD, borderWidth: 1, borderColor: COLORS.success },
  continueButtonText: { fontSize: 15, fontWeight: '600', color: COLORS.success, textAlign: 'center' },
  bookItemDone: { borderColor: COLORS.success, backgroundColor: COLORS.success + '08' },
  bookNameDone: { color: COLORS.textSecondary, textDecorationLine: 'line-through' },
  markCompleteButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: COLORS.success, padding: 16, borderRadius: BORDER_RADIUS.MD, marginTop: SPACING.LG },
  markCompleteText: { fontSize: 16, fontWeight: '700', color: '#fff' },
  input: { backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: BORDER_RADIUS.MD, padding: SPACING.MD, fontSize: 16, color: COLORS.text, marginBottom: SPACING.MD },
  inputMultiline: { minHeight: 80, textAlignVertical: 'top' },
  dayBlock: { backgroundColor: COLORS.surface, padding: SPACING.MD, borderRadius: BORDER_RADIUS.MD, marginBottom: SPACING.MD, borderWidth: 1, borderColor: COLORS.border },
  dayBlockTitle: { ...TYPOGRAPHY.h4, color: COLORS.primary, marginBottom: SPACING.SM },
  readingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  readingRowText: { fontSize: 15, color: COLORS.text },
  addReadingBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10, marginTop: 4 },
  addReadingBtnText: { fontSize: 14, color: COLORS.primary, fontWeight: '600' },
  addDayBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 14, borderRadius: BORDER_RADIUS.MD, borderWidth: 1, borderStyle: 'dashed', borderColor: COLORS.border, marginBottom: SPACING.MD },
  addDayBtnText: { fontSize: 15, color: COLORS.primary, fontWeight: '600' },
  savePlanBtn: { backgroundColor: COLORS.primary, padding: 16, borderRadius: BORDER_RADIUS.MD, alignItems: 'center' },
  savePlanBtnDisabled: { opacity: 0.5 },
  savePlanBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
  modalSubtitle: { fontSize: 13, color: COLORS.textSecondary, marginBottom: SPACING.MD },
  pickerTouch: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: BORDER_RADIUS.MD, padding: SPACING.MD, marginBottom: SPACING.SM },
  pickerLabel: { fontSize: 12, color: COLORS.textSecondary, marginRight: 8, minWidth: 56 },
  pickerValue: { flex: 1, fontSize: 16, color: COLORS.text },
  pickerModalBox: { marginHorizontal: SPACING.LG, maxHeight: '70%', backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.LG, padding: SPACING.MD },
  pickerModalTitle: { ...TYPOGRAPHY.h3, marginBottom: SPACING.MD },
  pickerList: { maxHeight: 320 },
  pickerOption: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, paddingHorizontal: SPACING.MD, borderRadius: BORDER_RADIUS.SM },
  pickerOptionActive: { backgroundColor: `${COLORS.primary}15` },
  pickerOptionText: { fontSize: 16, color: COLORS.text },
  pickerOptionTextActive: { color: COLORS.primary, fontWeight: '600' },
  pickerCancelBtn: { paddingVertical: 12, alignItems: 'center', marginTop: SPACING.SM },
  monthsGridScroll: { maxHeight: 280 },
  monthsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  monthChip: { width: 48, height: 48, backgroundColor: `${COLORS.primary}20`, borderRadius: BORDER_RADIUS.MD, justifyContent: 'center', alignItems: 'center' },
  monthChipText: { fontSize: 16, fontWeight: '600', color: COLORS.primary },
  modalRow: { flexDirection: 'row', gap: 12, justifyContent: 'flex-end', marginTop: SPACING.MD },
  modalButton: { paddingVertical: 10, paddingHorizontal: 16 },
  modalButtonPrimary: { backgroundColor: COLORS.primary, borderRadius: BORDER_RADIUS.MD },
});
