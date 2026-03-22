// src/screens/WorkDetailScreen.js
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Modal, TextInput, Alert, SafeAreaView, Platform,
  KeyboardAvoidingView, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import {
  getWorkById, addWork, updateWork, getAllStudents,
  getWorkStudents, setWorkStudents,
  getWorkActivities, addActivity, updateActivity, deleteActivity,
} from '../database/database';
import { colors, STATUS_COLORS, STATUS_OPTIONS } from '../theme/colors';

const EMPTY_WORK = { name: '', delivery_date: '', total_hours: '', status: 'pending', description: '' };
const EMPTY_ACTIVITY = { description: '', student_id: null, status: 'pending', estimated_hours: '' };

export default function WorkDetailScreen({ route, navigation }) {
  const { workId } = route.params || {};
  const isNew = !workId;

  const [work, setWork] = useState(EMPTY_WORK);
  const [allStudents, setAllStudents] = useState([]);
  const [selectedStudentIds, setSelectedStudentIds] = useState([]);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);

  // Activity modal
  const [activityModal, setActivityModal] = useState(false);
  const [activityForm, setActivityForm] = useState(EMPTY_ACTIVITY);
  const [editingActivityId, setEditingActivityId] = useState(null);

  // Date input helper
  const [dateText, setDateText] = useState('');

  useEffect(() => {
    navigation.setOptions({ title: isNew ? 'Novo Trabalho' : 'Editar Trabalho' });
    loadData();
  }, [workId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const students = await getAllStudents();
      setAllStudents(students);

      if (!isNew) {
        const [wData, wStudents, wActivities] = await Promise.all([
          getWorkById(workId),
          getWorkStudents(workId),
          getWorkActivities(workId),
        ]);
        if (wData) {
          setWork({
            name: wData.name,
            delivery_date: wData.delivery_date,
            total_hours: String(wData.total_hours),
            status: wData.status,
            description: wData.description || '',
          });
          setDateText(formatDateForDisplay(wData.delivery_date));
        }
        setSelectedStudentIds(wStudents.map((s) => s.id));
        setActivities(wActivities);
      }
    } catch (e) {
      Alert.alert('Erro', 'Não foi possível carregar os dados.');
    } finally {
      setLoading(false);
    }
  };

  const formatDateForDisplay = (iso) => {
    if (!iso) return '';
    const [y, m, d] = iso.split('-');
    return `${d}/${m}/${y}`;
  };

  const parseDateInput = (text) => {
    // Accepts DD/MM/YYYY
    const parts = text.replace(/\D/g, '');
    let formatted = parts;
    if (parts.length > 2) formatted = parts.slice(0, 2) + '/' + parts.slice(2);
    if (parts.length > 4) formatted = formatted.slice(0, 5) + '/' + formatted.slice(5, 9);
    return formatted;
  };

  const dateToISO = (display) => {
    const [d, m, y] = display.split('/');
    if (!d || !m || !y || y.length !== 4) return null;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  };

  const toggleStudent = (id) => {
    setSelectedStudentIds((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  const handleSaveWork = async () => {
    if (!work.name.trim()) return Alert.alert('Atenção', 'Informe o nome do trabalho.');
    if (!dateText || dateText.length < 10) return Alert.alert('Atenção', 'Informe a data de entrega no formato DD/MM/AAAA.');
    const isoDate = dateToISO(dateText);
    if (!isoDate) return Alert.alert('Atenção', 'Data inválida. Use o formato DD/MM/AAAA.');
    if (!work.total_hours || isNaN(parseFloat(work.total_hours))) return Alert.alert('Atenção', 'Informe a estimativa de horas.');
    if (selectedStudentIds.length === 0) return Alert.alert('Atenção', 'Selecione pelo menos um aluno.');

    setSaving(true);
    try {
      let id = workId;
      if (isNew) {
        id = await addWork(work.name.trim(), isoDate, parseFloat(work.total_hours), work.status, work.description);
      } else {
        await updateWork(workId, work.name.trim(), isoDate, parseFloat(work.total_hours), work.status, work.description);
      }
      await setWorkStudents(id, selectedStudentIds);
      Alert.alert('Sucesso', 'Trabalho salvo com sucesso!', [
        {
          text: 'OK',
          onPress: () => {
            if (isNew) {
              navigation.replace('WorkDetail', { workId: id, workName: work.name });
            }
          },
        },
      ]);
    } catch (e) {
      Alert.alert('Erro', 'Não foi possível salvar o trabalho.');
    } finally {
      setSaving(false);
    }
  };

  // ─── ACTIVITIES ──────────────────────────────────────────────────────────────

  const workStudents = allStudents.filter((s) => selectedStudentIds.includes(s.id));

  const openAddActivity = () => {
    if (workStudents.length === 0) {
      Alert.alert('Atenção', 'Salve o trabalho com alunos antes de adicionar atividades.');
      return;
    }
    setActivityForm({ ...EMPTY_ACTIVITY, student_id: workStudents[0]?.id || null });
    setEditingActivityId(null);
    setActivityModal(true);
  };

  const openEditActivity = (act) => {
    setActivityForm({
      description: act.description,
      student_id: act.student_id,
      status: act.status,
      estimated_hours: String(act.estimated_hours),
    });
    setEditingActivityId(act.id);
    setActivityModal(true);
  };

  const handleSaveActivity = async () => {
    if (!activityForm.description.trim()) return Alert.alert('Atenção', 'Informe a descrição da atividade.');
    if (!activityForm.student_id) return Alert.alert('Atenção', 'Selecione um aluno.');
    if (!activityForm.estimated_hours || isNaN(parseFloat(activityForm.estimated_hours))) {
      return Alert.alert('Atenção', 'Informe a estimativa de horas.');
    }
    try {
      if (editingActivityId) {
        await updateActivity(
          editingActivityId,
          activityForm.description.trim(),
          activityForm.student_id,
          activityForm.status,
          parseFloat(activityForm.estimated_hours)
        );
      } else {
        await addActivity(
          workId,
          activityForm.description.trim(),
          activityForm.student_id,
          activityForm.status,
          parseFloat(activityForm.estimated_hours)
        );
      }
      setActivityModal(false);
      const updated = await getWorkActivities(workId);
      setActivities(updated);
    } catch (e) {
      Alert.alert('Erro', 'Não foi possível salvar a atividade.');
    }
  };

  const handleDeleteActivity = (act) => {
    Alert.alert('Excluir atividade', `Remover "${act.description}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: async () => {
          await deleteActivity(act.id);
          const updated = await getWorkActivities(workId);
          setActivities(updated);
        },
      },
    ]);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <ActivityIndicator style={{ flex: 1 }} size="large" color={colors.accent} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {isNew ? 'Novo Trabalho' : 'Editar Trabalho'}
        </Text>
        <TouchableOpacity style={styles.saveBtn} onPress={handleSaveWork} disabled={saving}>
          {saving ? (
            <ActivityIndicator size="small" color={colors.white} />
          ) : (
            <Ionicons name="checkmark" size={22} color={colors.white} />
          )}
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Work Form */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            <Ionicons name="document-text-outline" size={16} color={colors.primary} /> Dados do Trabalho
          </Text>

          <Text style={styles.label}>Nome do Trabalho *</Text>
          <TextInput
            style={styles.input}
            value={work.name}
            onChangeText={(v) => setWork((p) => ({ ...p, name: v }))}
            placeholder="Ex.: TCC, Projeto de Pesquisa..."
            placeholderTextColor={colors.textMuted}
          />

          <Text style={styles.label}>Descrição</Text>
          <TextInput
            style={[styles.input, { height: 72, textAlignVertical: 'top' }]}
            value={work.description}
            onChangeText={(v) => setWork((p) => ({ ...p, description: v }))}
            placeholder="Descrição opcional..."
            placeholderTextColor={colors.textMuted}
            multiline
          />

          <View style={styles.row}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <Text style={styles.label}>Data de Entrega *</Text>
              <TextInput
                style={styles.input}
                value={dateText}
                onChangeText={(v) => setDateText(parseDateInput(v))}
                placeholder="DD/MM/AAAA"
                placeholderTextColor={colors.textMuted}
                keyboardType="numeric"
                maxLength={10}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Est. Horas *</Text>
              <TextInput
                style={styles.input}
                value={work.total_hours}
                onChangeText={(v) => setWork((p) => ({ ...p, total_hours: v }))}
                placeholder="Ex.: 40"
                placeholderTextColor={colors.textMuted}
                keyboardType="decimal-pad"
              />
            </View>
          </View>

          <Text style={styles.label}>Situação</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={work.status}
              onValueChange={(v) => setWork((p) => ({ ...p, status: v }))}
              style={styles.picker}
            >
              {STATUS_OPTIONS.map((s) => (
                <Picker.Item key={s.value} label={s.label} value={s.value} />
              ))}
            </Picker>
          </View>
        </View>

        {/* Students */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            <Ionicons name="people-outline" size={16} color={colors.primary} /> Alunos do Trabalho
          </Text>
          {allStudents.length === 0 ? (
            <Text style={styles.hintText}>Cadastre alunos na aba "Alunos" primeiro.</Text>
          ) : (
            allStudents.map((s) => {
              const selected = selectedStudentIds.includes(s.id);
              return (
                <TouchableOpacity
                  key={s.id}
                  style={[styles.studentRow, selected && styles.studentRowSelected]}
                  onPress={() => toggleStudent(s.id)}
                  activeOpacity={0.8}
                >
                  <View style={[styles.checkbox, selected && styles.checkboxSelected]}>
                    {selected && <Ionicons name="checkmark" size={14} color={colors.white} />}
                  </View>
                  <View style={styles.studentMini}>
                    <Text style={styles.studentMiniInitial}>
                      {s.name.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <Text style={[styles.studentRowName, selected && styles.studentRowNameSelected]}>
                    {s.name}
                  </Text>
                </TouchableOpacity>
              );
            })
          )}
        </View>

        {/* Activities – only shown when editing existing work */}
        {!isNew && (
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>
                <Ionicons name="list-outline" size={16} color={colors.primary} /> Atividades
              </Text>
              <TouchableOpacity style={styles.miniAddBtn} onPress={openAddActivity}>
                <Ionicons name="add" size={18} color={colors.white} />
              </TouchableOpacity>
            </View>

            {activities.length === 0 ? (
              <Text style={styles.hintText}>Nenhuma atividade cadastrada.</Text>
            ) : (
              activities.map((act) => {
                const sc = STATUS_COLORS[act.status] || STATUS_COLORS.pending;
                const pct = act.estimated_hours > 0
                  ? Math.min(100, Math.round((act.worked_hours / act.estimated_hours) * 100))
                  : 0;
                return (
                  <View key={act.id} style={styles.actCard}>
                    <View style={styles.actCardHeader}>
                      <Text style={styles.actDescription} numberOfLines={2}>
                        {act.description}
                      </Text>
                      <View style={[styles.statusBadge, { backgroundColor: sc.bg }]}>
                        <Text style={[styles.statusText, { color: sc.text }]}>{sc.label}</Text>
                      </View>
                    </View>
                    <View style={styles.actMeta}>
                      <Ionicons name="person-outline" size={13} color={colors.textMuted} />
                      <Text style={styles.actMetaText}>{act.student_name}</Text>
                      <Ionicons name="time-outline" size={13} color={colors.textMuted} style={{ marginLeft: 10 }} />
                      <Text style={styles.actMetaText}>
                        {act.worked_hours}h / {act.estimated_hours}h ({pct}%)
                      </Text>
                    </View>
                    <View style={styles.actProgressBg}>
                      <View
                        style={[
                          styles.actProgressFill,
                          {
                            width: `${pct}%`,
                            backgroundColor: act.status === 'cancelled' ? colors.danger :
                              pct >= 100 ? colors.success : colors.accent,
                          },
                        ]}
                      />
                    </View>
                    <View style={styles.actActions}>
                      <TouchableOpacity
                        style={styles.actBtn}
                        onPress={() => openEditActivity(act)}
                      >
                        <Ionicons name="pencil-outline" size={14} color={colors.primaryLight} />
                        <Text style={[styles.actBtnText, { color: colors.primaryLight }]}>Editar</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.actBtn}
                        onPress={() => handleDeleteActivity(act)}
                      >
                        <Ionicons name="trash-outline" size={14} color={colors.danger} />
                        <Text style={[styles.actBtnText, { color: colors.danger }]}>Excluir</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })
            )}
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Activity Modal */}
      <Modal visible={activityModal} transparent animationType="slide">
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingActivityId ? 'Editar Atividade' : 'Nova Atividade'}
              </Text>
              <TouchableOpacity onPress={() => setActivityModal(false)}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.label}>Descrição *</Text>
              <TextInput
                style={[styles.input, { height: 72, textAlignVertical: 'top' }]}
                value={activityForm.description}
                onChangeText={(v) => setActivityForm((p) => ({ ...p, description: v }))}
                placeholder="Descreva a atividade..."
                placeholderTextColor={colors.textMuted}
                multiline
              />

              <Text style={styles.label}>Aluno Responsável *</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={activityForm.student_id}
                  onValueChange={(v) => setActivityForm((p) => ({ ...p, student_id: v }))}
                  style={styles.picker}
                >
                  {workStudents.map((s) => (
                    <Picker.Item key={s.id} label={s.name} value={s.id} />
                  ))}
                </Picker>
              </View>

              <View style={styles.row}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={styles.label}>Est. Horas *</Text>
                  <TextInput
                    style={styles.input}
                    value={activityForm.estimated_hours}
                    onChangeText={(v) => setActivityForm((p) => ({ ...p, estimated_hours: v }))}
                    placeholder="Ex.: 8"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="decimal-pad"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Situação</Text>
                  <View style={styles.pickerContainer}>
                    <Picker
                      selectedValue={activityForm.status}
                      onValueChange={(v) => setActivityForm((p) => ({ ...p, status: v }))}
                      style={styles.picker}
                    >
                      {STATUS_OPTIONS.map((s) => (
                        <Picker.Item key={s.value} label={s.label} value={s.value} />
                      ))}
                    </Picker>
                  </View>
                </View>
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.btn, styles.btnOutline]}
                onPress={() => setActivityModal(false)}
              >
                <Text style={styles.btnOutlineText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.btn, styles.btnPrimary]} onPress={handleSaveActivity}>
                <Text style={styles.btnPrimaryText}>
                  {editingActivityId ? 'Salvar' : 'Adicionar'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: {
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? 40 : 16,
    paddingBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backBtn: { padding: 4, marginRight: 8 },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '700', color: colors.white },
  saveBtn: {
    backgroundColor: colors.accent,
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scroll: { flex: 1 },
  section: {
    backgroundColor: colors.card,
    margin: 16,
    marginBottom: 0,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 14,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  miniAddBtn: {
    backgroundColor: colors.accent,
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  label: { fontSize: 13, fontWeight: '600', color: colors.textSecondary, marginBottom: 6, marginTop: 10 },
  input: {
    backgroundColor: colors.background,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
  },
  row: { flexDirection: 'row' },
  pickerContainer: {
    backgroundColor: colors.background,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  picker: { height: 48, color: colors.text },
  hintText: { fontSize: 13, color: colors.textMuted, textAlign: 'center', paddingVertical: 10 },
  // Students
  studentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 6,
    backgroundColor: colors.background,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  studentRowSelected: {
    backgroundColor: '#EEF6FF',
    borderColor: colors.primaryLight,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  checkboxSelected: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primaryLight,
  },
  studentMini: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  studentMiniInitial: { fontSize: 13, fontWeight: '700', color: colors.white },
  studentRowName: { fontSize: 14, color: colors.textSecondary, fontWeight: '500' },
  studentRowNameSelected: { color: colors.primary, fontWeight: '600' },
  // Activity cards
  actCard: {
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  actCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  actDescription: { flex: 1, fontSize: 14, fontWeight: '600', color: colors.text, marginRight: 8 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  statusText: { fontSize: 10, fontWeight: '700' },
  actMeta: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  actMetaText: { fontSize: 12, color: colors.textSecondary, marginLeft: 4 },
  actProgressBg: {
    height: 5,
    backgroundColor: colors.border,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 8,
  },
  actProgressFill: { height: '100%', borderRadius: 3 },
  actActions: { flexDirection: 'row', gap: 12 },
  actBtn: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  actBtnText: { fontSize: 12, fontWeight: '600' },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: colors.text },
  modalFooter: { flexDirection: 'row', gap: 12, marginTop: 20 },
  btn: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  btnPrimary: { backgroundColor: colors.primary },
  btnPrimaryText: { color: colors.white, fontWeight: '700', fontSize: 15 },
  btnOutline: { borderWidth: 2, borderColor: colors.border },
  btnOutlineText: { color: colors.textSecondary, fontWeight: '600', fontSize: 15 },
});
