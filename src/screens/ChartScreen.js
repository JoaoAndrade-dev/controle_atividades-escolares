// src/screens/ChartScreen.js
import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, SafeAreaView,
  Platform, ActivityIndicator, Alert, Dimensions,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { getAllWorks, getWorkActivities } from '../database/database';
import { colors, STATUS_COLORS } from '../theme/colors';

const { width: SCREEN_W } = Dimensions.get('window');
const BAR_CHART_WIDTH = SCREEN_W - 64;
const BAR_HEIGHT = 28;
const BAR_GAP = 10;

export default function ChartScreen() {
  const [works, setWorks] = useState([]);
  const [selectedWorkId, setSelectedWorkId] = useState(null);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(false);

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
        const id = selectedWorkId && data.find((w) => w.id === selectedWorkId)
          ? selectedWorkId
          : data[0].id;
        setSelectedWorkId(id);
        await loadActivities(id);
      }
    } catch (e) {
      Alert.alert('Erro', 'Não foi possível carregar os dados.');
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

  const handleWorkChange = (id) => {
    setSelectedWorkId(id);
    loadActivities(id);
  };

  // ─── CALCULATIONS ─────────────────────────────────────────────────────────────

  const selectedWork = works.find((w) => w.id === selectedWorkId);
  const totalEstimated = activities.reduce((s, a) => s + (a.estimated_hours || 0), 0);
  const totalWorked = activities.reduce((s, a) => s + (a.worked_hours || 0), 0);
  const totalPct = totalEstimated > 0 ? Math.min(100, (totalWorked / totalEstimated) * 100) : 0;

  const maxHours = Math.max(...activities.map((a) => a.estimated_hours || 0), 1);

  // Count by status
  const statusCount = activities.reduce(
    (acc, a) => {
      acc[a.status] = (acc[a.status] || 0) + 1;
      return acc;
    },
    { pending: 0, completed: 0, cancelled: 0 }
  );

  // ─── RENDER ──────────────────────────────────────────────────────────────────

  const renderDonut = () => {
    const r = 60;
    const cx = 80;
    const cy = 80;
    const circumference = 2 * Math.PI * r;
    const filled = (totalPct / 100) * circumference;
    const gap = circumference - filled;

    return (
      <View style={styles.donutContainer}>
        <View style={styles.donutWrapper}>
          {/* SVG-free approach: use border-radius rings */}
          <View style={[styles.donutOuter, { borderColor: colors.border }]}>
            <View
              style={[
                styles.donutFill,
                {
                  borderColor:
                    totalPct >= 100
                      ? colors.success
                      : selectedWork?.status === 'cancelled'
                      ? colors.danger
                      : colors.accent,
                  // Simulate arc using border trick
                  transform: [{ rotate: `${(totalPct / 100) * 360}deg` }],
                },
              ]}
            />
            <View style={styles.donutInner}>
              <Text style={styles.donutPct}>{Math.round(totalPct)}%</Text>
              <Text style={styles.donutLabel}>concluído</Text>
            </View>
          </View>
        </View>

        <View style={styles.donutStats}>
          <View style={styles.donutStatItem}>
            <View style={[styles.dot, { backgroundColor: colors.accent }]} />
            <Text style={styles.donutStatLabel}>Trabalhadas</Text>
            <Text style={styles.donutStatVal}>{totalWorked}h</Text>
          </View>
          <View style={styles.donutStatItem}>
            <View style={[styles.dot, { backgroundColor: colors.border }]} />
            <Text style={styles.donutStatLabel}>Estimadas</Text>
            <Text style={styles.donutStatVal}>{totalEstimated}h</Text>
          </View>
          <View style={styles.donutStatItem}>
            <View style={[styles.dot, { backgroundColor: colors.primaryLight }]} />
            <Text style={styles.donutStatLabel}>Atividades</Text>
            <Text style={styles.donutStatVal}>{activities.length}</Text>
          </View>
        </View>
      </View>
    );
  };

  const renderStatusPills = () => (
    <View style={styles.pillsRow}>
      {Object.entries(statusCount).map(([status, count]) => {
        const sc = STATUS_COLORS[status];
        return (
          <View key={status} style={[styles.pill, { backgroundColor: sc.bg }]}>
            <Text style={[styles.pillCount, { color: sc.text }]}>{count}</Text>
            <Text style={[styles.pillLabel, { color: sc.text }]}>{sc.label}</Text>
          </View>
        );
      })}
    </View>
  );

  const renderBarChart = () => {
    if (activities.length === 0) return null;

    return (
      <View style={styles.chartSection}>
        <Text style={styles.chartTitle}>Horas por Atividade</Text>
        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: colors.border }]} />
            <Text style={styles.legendText}>Estimadas</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: colors.accent }]} />
            <Text style={styles.legendText}>Trabalhadas</Text>
          </View>
        </View>

        {activities.map((act, idx) => {
          const estPct = Math.min(1, (act.estimated_hours || 0) / maxHours);
          const wrkPct = act.estimated_hours > 0
            ? Math.min(1, (act.worked_hours || 0) / act.estimated_hours)
            : 0;
          const sc = STATUS_COLORS[act.status] || STATUS_COLORS.pending;
          const overallPct = act.estimated_hours > 0
            ? Math.min(100, Math.round((act.worked_hours / act.estimated_hours) * 100))
            : 0;

          return (
            <View key={act.id} style={styles.barGroup}>
              {/* Activity label */}
              <View style={styles.barLabelRow}>
                <Text style={styles.barIndex}>#{idx + 1}</Text>
                <Text style={styles.barLabel} numberOfLines={1}>{act.description}</Text>
                <View style={[styles.miniPill, { backgroundColor: sc.bg }]}>
                  <Text style={[styles.miniPillText, { color: sc.text }]}>{sc.label}</Text>
                </View>
              </View>

              {/* Student */}
              <Text style={styles.barStudent}>
                <Ionicons name="person-outline" size={11} color={colors.textMuted} /> {act.student_name}
              </Text>

              {/* Estimated bar (background) */}
              <View style={styles.barTrack}>
                <View style={[styles.barEst, { width: BAR_CHART_WIDTH * estPct }]}>
                  <Text style={styles.barEstLabel}>{act.estimated_hours}h</Text>
                </View>
              </View>

              {/* Worked bar (foreground) */}
              <View style={styles.barTrack}>
                <View
                  style={[
                    styles.barWorked,
                    {
                      width: BAR_CHART_WIDTH * estPct * wrkPct,
                      backgroundColor:
                        act.status === 'cancelled'
                          ? colors.danger
                          : wrkPct >= 1
                          ? colors.success
                          : colors.accent,
                    },
                  ]}
                >
                  {act.worked_hours > 0 && (
                    <Text style={styles.barWorkedLabel}>{act.worked_hours}h</Text>
                  )}
                </View>
              </View>

              {/* Percentage */}
              <Text style={styles.barPct}>{overallPct}% concluído</Text>
            </View>
          );
        })}
      </View>
    );
  };

  const renderRingProgress = () => {
    // Simple circular progress using views
    const size = 160;
    const strokeWidth = 18;
    const radius = (size - strokeWidth) / 2;
    const pct = Math.min(totalPct, 100);

    // We'll use a visual trick with a View ring
    return (
      <View style={styles.ringContainer}>
        <View
          style={[
            styles.ring,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              borderWidth: strokeWidth,
              borderColor: colors.border,
            },
          ]}
        >
          <View style={styles.ringInner}>
            <Text style={styles.ringPct}>{Math.round(pct)}%</Text>
            <Text style={styles.ringLabel}>concluído</Text>
          </View>
        </View>
        {/* Colored arc overlay - simplified as a colored top border */}
        <View
          style={[
            styles.ringOverlay,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              borderWidth: strokeWidth,
              borderLeftColor: 'transparent',
              borderBottomColor: 'transparent',
              borderTopColor:
                pct >= 100
                  ? colors.success
                  : selectedWork?.status === 'cancelled'
                  ? colors.danger
                  : colors.accent,
              borderRightColor:
                pct >= 50
                  ? pct >= 100
                    ? colors.success
                    : selectedWork?.status === 'cancelled'
                    ? colors.danger
                    : colors.accent
                  : 'transparent',
              transform: [{ rotate: `${(pct / 100) * 360 - 90}deg` }],
            },
          ]}
        />
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Gráficos</Text>
        <Text style={styles.headerSub}>Progresso dos trabalhos</Text>
      </View>

      {works.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="bar-chart-outline" size={64} color={colors.textMuted} />
          <Text style={styles.emptyText}>Nenhum trabalho cadastrado</Text>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
          {/* Work Picker */}
          <View style={styles.pickerCard}>
            <Text style={styles.pickerCardLabel}>Selecionar Trabalho</Text>
            <View style={styles.pickerWrap}>
              <Picker
                selectedValue={selectedWorkId}
                onValueChange={handleWorkChange}
                style={styles.picker}
              >
                {works.map((w) => (
                  <Picker.Item key={w.id} label={w.name} value={w.id} />
                ))}
              </Picker>
            </View>
          </View>

          {loading ? (
            <ActivityIndicator size="large" color={colors.accent} style={{ marginTop: 40 }} />
          ) : (
            <>
              {/* Overview card */}
              <View style={styles.overviewCard}>
                <Text style={styles.overviewTitle}>Visão Geral</Text>
                {selectedWork && (
                  <View style={styles.overviewWorkName}>
                    <Ionicons name="document-text-outline" size={16} color={colors.accent} />
                    <Text style={styles.overviewWorkNameText} numberOfLines={1}>
                      {selectedWork.name}
                    </Text>
                  </View>
                )}

                {renderStatusPills()}

                {/* Total progress bars */}
                <View style={styles.totalProgress}>
                  <View style={styles.totalProgressRow}>
                    <Text style={styles.totalProgressLabel}>Horas totais trabalhadas</Text>
                    <Text style={styles.totalProgressVal}>
                      {totalWorked}h / {totalEstimated}h
                    </Text>
                  </View>
                  <View style={styles.totalProgressBg}>
                    <View
                      style={[
                        styles.totalProgressFill,
                        {
                          width: `${Math.min(100, totalPct)}%`,
                          backgroundColor:
                            totalPct >= 100
                              ? colors.success
                              : selectedWork?.status === 'cancelled'
                              ? colors.danger
                              : colors.accent,
                        },
                      ]}
                    />
                  </View>
                  <View style={styles.totalProgressFooter}>
                    <Text style={styles.totalPctText}>{Math.round(totalPct)}% concluído</Text>
                    {selectedWork && (
                      <View
                        style={[
                          styles.miniPill,
                          { backgroundColor: STATUS_COLORS[selectedWork.status]?.bg },
                        ]}
                      >
                        <Text
                          style={[
                            styles.miniPillText,
                            { color: STATUS_COLORS[selectedWork.status]?.text },
                          ]}
                        >
                          {STATUS_COLORS[selectedWork.status]?.label}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              </View>

              {/* Bar chart section */}
              {activities.length === 0 ? (
                <View style={styles.noActivity}>
                  <Ionicons name="list-outline" size={40} color={colors.textMuted} />
                  <Text style={styles.noActivityText}>Nenhuma atividade cadastrada</Text>
                </View>
              ) : (
                renderBarChart()
              )}
            </>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      )}
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
  scroll: { padding: 16, paddingBottom: 24 },
  pickerCard: {
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  pickerCardLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
    marginBottom: 8,
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
  overviewCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 3,
  },
  overviewTitle: { fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 10 },
  overviewWorkName: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#EEF2FF',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 12,
  },
  overviewWorkNameText: { fontSize: 14, fontWeight: '600', color: colors.primary, flex: 1 },
  pillsRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  pill: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
  },
  pillCount: { fontSize: 22, fontWeight: '800' },
  pillLabel: { fontSize: 10, fontWeight: '600', marginTop: 2 },
  totalProgress: {},
  totalProgressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  totalProgressLabel: { fontSize: 13, color: colors.textSecondary, fontWeight: '500' },
  totalProgressVal: { fontSize: 13, color: colors.text, fontWeight: '700' },
  totalProgressBg: {
    height: 10,
    backgroundColor: colors.border,
    borderRadius: 5,
    overflow: 'hidden',
    marginBottom: 8,
  },
  totalProgressFill: { height: '100%', borderRadius: 5 },
  totalProgressFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalPctText: { fontSize: 13, fontWeight: '700', color: colors.textSecondary },
  miniPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  miniPillText: { fontSize: 10, fontWeight: '700' },
  // Bar chart
  chartSection: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 3,
  },
  chartTitle: { fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 10 },
  legend: { flexDirection: 'row', gap: 16, marginBottom: 16 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 12, height: 12, borderRadius: 6 },
  legendText: { fontSize: 12, color: colors.textSecondary },
  barGroup: { marginBottom: 20 },
  barLabelRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 2 },
  barIndex: { fontSize: 11, fontWeight: '700', color: colors.textMuted, marginRight: 6, minWidth: 20 },
  barLabel: { flex: 1, fontSize: 13, fontWeight: '600', color: colors.text, marginRight: 6 },
  barStudent: { fontSize: 11, color: colors.textMuted, marginBottom: 6, marginLeft: 26 },
  barTrack: {
    height: BAR_HEIGHT,
    backgroundColor: 'transparent',
    marginBottom: 3,
    justifyContent: 'center',
  },
  barEst: {
    height: BAR_HEIGHT,
    backgroundColor: colors.border,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingRight: 8,
    minWidth: 36,
  },
  barEstLabel: { fontSize: 11, fontWeight: '700', color: colors.textSecondary },
  barWorked: {
    height: BAR_HEIGHT,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingRight: 8,
    minWidth: act => act > 0 ? 36 : 0,
  },
  barWorkedLabel: { fontSize: 11, fontWeight: '700', color: colors.white },
  barPct: {
    fontSize: 11,
    color: colors.textMuted,
    marginLeft: 26,
    marginTop: 2,
  },
  // Ring (simplified)
  ringContainer: { position: 'relative', alignSelf: 'center', marginVertical: 10 },
  ring: { justifyContent: 'center', alignItems: 'center' },
  ringOverlay: { position: 'absolute', top: 0, left: 0 },
  ringInner: { alignItems: 'center' },
  ringPct: { fontSize: 28, fontWeight: '800', color: colors.text },
  ringLabel: { fontSize: 12, color: colors.textMuted },
  donutContainer: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  donutWrapper: {},
  donutOuter: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 14,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  donutFill: {},
  donutInner: { alignItems: 'center' },
  donutPct: { fontSize: 20, fontWeight: '800', color: colors.text },
  donutLabel: { fontSize: 10, color: colors.textMuted },
  donutStats: { flex: 1, gap: 10 },
  donutStatItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  donutStatLabel: { flex: 1, fontSize: 12, color: colors.textSecondary },
  donutStatVal: { fontSize: 13, fontWeight: '700', color: colors.text },
  noActivity: { alignItems: 'center', padding: 30, gap: 10 },
  noActivityText: { fontSize: 14, color: colors.textSecondary },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyText: { fontSize: 16, color: colors.textSecondary, marginTop: 16, fontWeight: '500' },
});
