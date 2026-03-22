// src/screens/ActivitiesProgressScreen.js
import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Modal, TextInput, Alert, SafeAreaView, Platform,
  KeyboardAvoidingView, ActivityIndicator, FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import { useFocusEffect } from '@react-navigation/native';
import { getAllWorks, getWorkActivities, updateActivityProgress } from '../database/database';
import { colors, STATUS_COLORS, STATUS_OPTIONS } from '../theme/colors';

export default function ActivitiesProgressScreen() {
  const [works, setWorks] = useState([]);
  const [selectedWork, setSelectedWork] = useState(null);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(false);

  // Edit modal
  const [editModal, setEditModal] = useState(false);
  const [editingActivity, setEditingActivity] = useState(null);
  const [workedHoursInput, setWorkedHoursInput] = useState('');
  const [statusInput, setStatusInput] = useState('pending');

  useFocusEffect(
    useCallback(() => {
      loadWorks();
    }, [])
  );

  const loadWorks = async () => {
    try {
      const data = await getAllWorks();
      setWorks(data);
      if (data.length > 0) {
        if (!selectedWork) {
          setSelectedWork(data[0]);
          loadActivities(data[0].id);
        } else {
          // Refresh current
          const refreshed = data.find((w) => w.id === selectedWork.id);
          if (refreshed) {
            setSelectedWork(refreshed);
            loadActivities(refreshed.id);
          }
        }
      }
    } catch (e) {
      Alert.alert('Erro', 'Não foi possível carregar os trabalhos.');
    }
  };

  const loadActivities = async (workId) => {
    try {
      setLoading(true);
      const data = await getWorkActivities(workId);
      setActivities(data);
    } catch (e) {
      Alert.alert('Erro', 'Não foi possível carregar as atividades.');
    } finally {
      setLoading(false);
    }
  };

  const selectWork = (work) => {
    setSelectedWork(work);
    loadActivities(work.id);
  };

  const openEdit = (act) => {
    setEditingActivity(act);
    setWorkedHoursInput(String(act.worked_hours));
    setStatusInput(act.status);
    setEditModal(true);
  };

  const handleSaveProgress = async () => {
    if (workedHoursInput === '' || isNaN(parseFloat(workedHoursInput))) {
      return Alert.alert('Atenção', 'Informe um valor válido para as horas trabalhadas.');
    }
    const hours = parseFloat(workedHoursInput);
    if (hours < 0) return Alert.alert('Atenção', 'As horas não podem ser negativas.');
    try {
      await updateActivityProgress(editingActivity.id, hours, statusInput);
      setEditModal(false);
      loadActivities(selectedWork.id);
      loadWorks();
    } catch (e) {
      Alert.alert('Erro', 'Não foi possível salvar o progresso.');
    }
  };

  const totalEstimated = activities.reduce((s, a) => s + (a.estimated_hours || 0), 0);
  const totalWorked = activities.reduce((s, a) => s + (a.worked_hours || 0), 0);
  const totalPct = totalEstimated > 0 ? Math.min(100, Math.round((totalWorked / totalEstimated) * 100)) : 0;

  const renderActivity = ({ item, index }) => {
    const sc = STATUS_COLORS[item.status] || STATUS_COLORS.pending;
    const pct = item.estimated_hours > 0
      ? Math.min(100, Math.round((item.worked_hours / item.estimated_hours) * 100))
      : 0;
    const barColor = item.status === 'cancelled' ? colors.danger :
      pct >= 100 ? colors.success : colors.accent;

    return (
      <View style={[styles.actCard, { marginTop: index === 0 ? 0 : 10 }]}>
        <View style={styles.actHeader}>
          <Text style={styles.actDesc} numberOfLines={2}>{item.description}</Text>
          <View style={[styles.badge, { backgroundColor: sc.bg }]}>
            <Text style={[styles.badgeText, { color: sc.text }]}>{sc.label}</Text>
          </View>
        </View>

        <View style={styles.actMeta}>
          <Ionicons name="person-circle-outline" size={14} color={colors.textMuted} />
          <Text style={styles.actMetaText}>{item.student_name}</Text>
        </View>

        {/* Hours row */}
        <View style={styles.hoursRow}>
          <View style={styles.hoursBox}>
            <Text style={styles.hoursLabel}>Trabalhadas</Text>
            <Text style={[styles.hoursValue, { color: colors.accent }]}>{item.worked_hours}h</Text>
          </View>
          <View style={styles.hoursBox}>
            <Text style={styles.hoursLabel}>Estimadas</Text>
            <Text style={styles.hoursValue}>{item.estimated_hours}h</Text>
          </View>
          <View style={styles.hoursBox}>
            <Text style={styles.hoursLabel}>Concluído</Text>
            <Text style={[styles.hoursValue, { color: pct >= 100 ? colors.success : colors.textSecondary }]}>
              {pct}%
            </Text>
          </View>
        </View>

        {/* Progress bar */}
        <View style={styles.progressBg}>
          <View style={[styles.progressFill, { width: `${pct}%`, backgroundColor: barColor }]} />
        </View>

        <TouchableOpacity style={styles.updateBtn} onPress={() => openEdit(item)}>
          <Ionicons name="create-outline" size={16} color={colors.white} />
          <Text style={styles.updateBtnText}>Atualizar Progresso</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Andamento</Text>
        <Text style={styles.headerSub}>Acompanhamento de atividades</Text>
      </View>

      {/* Work Selector */}
      {works.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="folder-open-outline" size={64} color={colors.textMuted} />
          <Text style={styles.emptyText}>Nenhum trabalho cadastrado</Text>
          <Text style={styles.emptyHint}>Crie trabalhos na aba "Trabalhos"</Text>
        </View>
      ) : (
        <>
          <View style={styles.workSelectorContainer}>
            <Text style={styles.workSelectorLabel}>Selecionar Trabalho</Text>
            <View style={styles.pickerWrap}>
              <Picker
                selectedValue={selectedWork?.id}
                onValueChange={(id) => {
                  const w = works.find((x) => x.id === id);
                  if (w) selectWork(w);
                }}
                style={styles.picker}
              >
                {works.map((w) => (
                  <Picker.Item key={w.id} label={w.name} value={w.id} />
                ))}
              </Picker>
            </View>
          </View>

          {/* Summary card */}
          {selectedWork && (
            <View style={styles.summaryCard}>
              <View style={styles.summaryRow}>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryVal}>{totalWorked}h</Text>
                  <Text style={styles.summaryLbl}>Trabalhadas</Text>
                </View>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryVal}>{totalEstimated}h</Text>
                  <Text style={styles.summaryLbl}>Estimadas</Text>
                </View>
                <View style={styles.summaryItem}>
                  <Text style={[styles.summaryVal, { color: totalPct >= 100 ? colors.success : colors.accent }]}>
                    {totalPct}%
                  </Text>
                  <Text style={styles.summaryLbl}>Concluído</Text>
                </View>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryVal}>{activities.length}</Text>
                  <Text style={styles.summaryLbl}>Atividades</Text>
                </View>
              </View>
              <View style={styles.summaryProgressBg}>
                <View
                  style={[
                    styles.summaryProgressFill,
                    {
                      width: `${totalPct}%`,
                      backgroundColor: totalPct >= 100 ? colors.success : colors.accent,
                    },
                  ]}
                />
              </View>
            </View>
          )}

          {/* Activities list */}
          {loading ? (
            <ActivityIndicator style={{ flex: 1 }} size="large" color={colors.accent} />
          ) : activities.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="list-outline" size={48} color={colors.textMuted} />
              <Text style={styles.emptyText}>Nenhuma atividade neste trabalho</Text>
            </View>
          ) : (
            <FlatList
              data={activities}
              keyExtractor={(item) => String(item.id)}
              renderItem={renderActivity}
              contentContainerStyle={styles.list}
              showsVerticalScrollIndicator={false}
            />
          )}
        </>
      )}

      {/* Edit Modal */}
      <Modal visible={editModal} transparent animationType="slide">
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Atualizar Progresso</Text>
              <TouchableOpacity onPress={() => setEditModal(false)}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {editingActivity && (
              <>
                <View style={styles.activityInfo}>
                  <Ionicons name="document-outline" size={16} color={colors.primary} />
                  <Text style={styles.activityInfoText} numberOfLines={2}>
                    {editingActivity.description}
                  </Text>
                </View>

                <Text style={styles.label}>Horas Trabalhadas</Text>
                <View style={styles.hoursInputRow}>
                  <TextInput
                    style={[styles.input, { flex: 1 }]}
                    value={workedHoursInput}
                    onChangeText={setWorkedHoursInput}
                    keyboardType="decimal-pad"
                    placeholder="0"
                    placeholderTextColor={colors.textMuted}
                    autoFocus
                  />
                  <Text style={styles.hoursUnit}>
                    / {editingActivity.estimated_hours}h estimadas
                  </Text>
                </View>

                <Text style={styles.label}>Situação</Text>
                <View style={styles.statusGrid}>
                  {STATUS_OPTIONS.map((opt) => {
                    const sc = STATUS_COLORS[opt.value];
                    const selected = statusInput === opt.value;
                    return (
                      <TouchableOpacity
                        key={opt.value}
                        style={[
                          styles.statusOption,
                          { borderColor: selected ? sc.text : colors.border },
                          selected && { backgroundColor: sc.bg },
                        ]}
                        onPress={() => setStatusInput(opt.value)}
                      >
                        <Ionicons
                          name={
                            opt.value === 'completed' ? 'checkmark-circle' :
                              opt.value === 'cancelled' ? 'close-circle' : 'time'
                          }
                          size={18}
                          color={selected ? sc.text : colors.textMuted}
                        />
                        <Text
                          style={[
                            styles.statusOptionText,
                            { color: selected ? sc.text : colors.textSecondary },
                          ]}
                        >
                          {opt.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </>
            )}

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.btn, styles.btnOutline]}
                onPress={() => setEditModal(false)}
              >
                <Text style={styles.btnOutlineText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.btn, styles.btnPrimary]} onPress={handleSaveProgress}>
                <Text style={styles.btnPrimaryText}>Salvar</Text>
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
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 40 : 16,
    paddingBottom: 20,
  },
  headerTitle: { fontSize: 24, fontWeight: '700', color: colors.white },
  headerSub: { fontSize: 13, color: 'rgba(255,255,255,0.65)', marginTop: 2 },
  workSelectorContainer: {
    backgroundColor: colors.card,
    margin: 16,
    marginBottom: 0,
    borderRadius: 14,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  workSelectorLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  pickerWrap: {
    backgroundColor: colors.background,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  picker: { height: 48, color: colors.text },
  summaryCard: {
    backgroundColor: colors.primary,
    margin: 16,
    marginBottom: 0,
    borderRadius: 16,
    padding: 16,
  },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 14 },
  summaryItem: { alignItems: 'center' },
  summaryVal: { fontSize: 22, fontWeight: '800', color: colors.white },
  summaryLbl: { fontSize: 11, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  summaryProgressBg: {
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  summaryProgressFill: { height: '100%', borderRadius: 4 },
  list: { padding: 16, paddingBottom: 24 },
  actCard: {
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,
  },
  actHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  actDesc: { flex: 1, fontSize: 15, fontWeight: '600', color: colors.text, marginRight: 8 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  badgeText: { fontSize: 10, fontWeight: '700' },
  actMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 10 },
  actMetaText: { fontSize: 12, color: colors.textSecondary },
  hoursRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 10,
    backgroundColor: colors.background,
    borderRadius: 10,
    paddingVertical: 10,
  },
  hoursBox: { alignItems: 'center' },
  hoursLabel: { fontSize: 10, color: colors.textMuted, marginBottom: 2 },
  hoursValue: { fontSize: 16, fontWeight: '700', color: colors.text },
  progressBg: {
    height: 6,
    backgroundColor: colors.border,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 12,
  },
  progressFill: { height: '100%', borderRadius: 3 },
  updateBtn: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingVertical: 10,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  updateBtnText: { color: colors.white, fontWeight: '600', fontSize: 14 },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyText: { fontSize: 16, color: colors.textSecondary, marginTop: 16, fontWeight: '500' },
  emptyHint: { fontSize: 13, color: colors.textMuted, marginTop: 6 },
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
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: colors.text },
  activityInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#EEF2FF',
    borderRadius: 10,
    padding: 12,
    gap: 8,
    marginBottom: 4,
  },
  activityInfoText: { flex: 1, fontSize: 14, color: colors.primary, fontWeight: '500' },
  label: { fontSize: 13, fontWeight: '600', color: colors.textSecondary, marginBottom: 6, marginTop: 14 },
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
  hoursInputRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  hoursUnit: { fontSize: 13, color: colors.textMuted, flex: 1 },
  statusGrid: { flexDirection: 'row', gap: 8, marginTop: 4 },
  statusOption: {
    flex: 1,
    borderWidth: 2,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    gap: 4,
  },
  statusOptionText: { fontSize: 11, fontWeight: '600' },
  modalFooter: { flexDirection: 'row', gap: 12, marginTop: 24 },
  btn: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  btnPrimary: { backgroundColor: colors.primary },
  btnPrimaryText: { color: colors.white, fontWeight: '700', fontSize: 15 },
  btnOutline: { borderWidth: 2, borderColor: colors.border },
  btnOutlineText: { color: colors.textSecondary, fontWeight: '600', fontSize: 15 },
});
