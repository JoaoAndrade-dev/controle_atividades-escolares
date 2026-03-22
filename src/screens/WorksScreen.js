// src/screens/WorksScreen.js
import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Alert, SafeAreaView, Platform, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { getAllWorks, deleteWork } from '../database/database';
import { colors, STATUS_COLORS } from '../theme/colors';

export default function WorksScreen({ navigation }) {
  const [works, setWorks] = useState([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      loadWorks();
    }, [])
  );

  const loadWorks = async () => {
    try {
      setLoading(true);
      const data = await getAllWorks();
      setWorks(data);
    } catch (e) {
      Alert.alert('Erro', 'Não foi possível carregar os trabalhos.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (work) => {
    Alert.alert(
      'Confirmar exclusão',
      `Deseja remover "${work.name}"? Todas as atividades serão excluídas também.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteWork(work.id);
              loadWorks();
            } catch (e) {
              Alert.alert('Erro', 'Não foi possível excluir o trabalho.');
            }
          },
        },
      ]
    );
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
  };

  const getProgress = (work) => {
    if (!work.activity_count || work.activity_count === 0) return 0;
    return Math.round((work.completed_count / work.activity_count) * 100);
  };

  const renderWork = ({ item, index }) => {
    const sc = STATUS_COLORS[item.status] || STATUS_COLORS.pending;
    const progress = getProgress(item);
    const workedHours = item.worked_hours || 0;

    return (
      <TouchableOpacity
        style={[styles.card, { marginTop: index === 0 ? 0 : 12 }]}
        onPress={() => navigation.navigate('WorkDetail', { workId: item.id, workName: item.name })}
        activeOpacity={0.85}
      >
        {/* Header row */}
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleRow}>
            <View style={styles.workIcon}>
              <Ionicons name="document-text" size={20} color={colors.primaryLight} />
            </View>
            <Text style={styles.cardTitle} numberOfLines={1}>{item.name}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: sc.bg }]}>
            <Text style={[styles.statusText, { color: sc.text }]}>{sc.label}</Text>
          </View>
        </View>

        {/* Info row */}
        <View style={styles.infoRow}>
          <View style={styles.infoItem}>
            <Ionicons name="calendar-outline" size={14} color={colors.textMuted} />
            <Text style={styles.infoText}>{formatDate(item.delivery_date)}</Text>
          </View>
          <View style={styles.infoItem}>
            <Ionicons name="time-outline" size={14} color={colors.textMuted} />
            <Text style={styles.infoText}>{workedHours}h / {item.total_hours}h</Text>
          </View>
          <View style={styles.infoItem}>
            <Ionicons name="checkmark-circle-outline" size={14} color={colors.textMuted} />
            <Text style={styles.infoText}>{item.completed_count}/{item.activity_count} ativ.</Text>
          </View>
        </View>

        {/* Progress bar */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBg}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${progress}%`,
                  backgroundColor: item.status === 'cancelled' ? colors.danger :
                    progress === 100 ? colors.success : colors.accent,
                },
              ]}
            />
          </View>
          <Text style={styles.progressText}>{progress}%</Text>
        </View>

        {/* Actions */}
        <View style={styles.cardFooter}>
          <TouchableOpacity
            style={styles.footerBtn}
            onPress={() => navigation.navigate('WorkDetail', { workId: item.id, workName: item.name })}
          >
            <Ionicons name="pencil-outline" size={15} color={colors.primaryLight} />
            <Text style={[styles.footerBtnText, { color: colors.primaryLight }]}>Editar</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.footerBtn} onPress={() => handleDelete(item)}>
            <Ionicons name="trash-outline" size={15} color={colors.danger} />
            <Text style={[styles.footerBtnText, { color: colors.danger }]}>Excluir</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Trabalhos</Text>
          <Text style={styles.headerSub}>{works.length} trabalho{works.length !== 1 ? 's' : ''}</Text>
        </View>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => navigation.navigate('WorkDetail', { workId: null })}
        >
          <Ionicons name="add" size={24} color={colors.white} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator style={{ flex: 1 }} size="large" color={colors.accent} />
      ) : works.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="folder-open-outline" size={64} color={colors.textMuted} />
          <Text style={styles.emptyText}>Nenhum trabalho cadastrado</Text>
          <Text style={styles.emptyHint}>Toque em + para adicionar</Text>
        </View>
      ) : (
        <FlatList
          data={works}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderWork}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: { fontSize: 24, fontWeight: '700', color: colors.white },
  headerSub: { fontSize: 13, color: 'rgba(255,255,255,0.65)', marginTop: 2 },
  addBtn: {
    backgroundColor: colors.accent,
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  list: { padding: 16, paddingBottom: 24 },
  card: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 8 },
  workIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  cardTitle: { fontSize: 16, fontWeight: '700', color: colors.text, flex: 1 },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  statusText: { fontSize: 11, fontWeight: '700' },
  infoRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 12,
  },
  infoItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  infoText: { fontSize: 12, color: colors.textSecondary },
  progressContainer: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  progressBg: {
    flex: 1,
    height: 6,
    backgroundColor: colors.border,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', borderRadius: 3 },
  progressText: { fontSize: 12, fontWeight: '700', color: colors.textSecondary, minWidth: 32 },
  cardFooter: {
    flexDirection: 'row',
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 10,
  },
  footerBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  footerBtnText: { fontSize: 13, fontWeight: '600' },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyText: { fontSize: 16, color: colors.textSecondary, marginTop: 16, fontWeight: '500' },
  emptyHint: { fontSize: 13, color: colors.textMuted, marginTop: 6 },
});
