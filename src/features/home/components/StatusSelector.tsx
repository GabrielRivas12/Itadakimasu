import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { UserListStatus } from '../../../../services/animeList';

interface StatusSelectorProps {
  userStatus: UserListStatus | null;
  userProgress?: number;
  totalEpisodes?: number | null;
  showStatusSelector: boolean;
  setShowStatusSelector: (show: boolean) => void;
  onUpdateStatus: (status: UserListStatus) => void;
  onRemove: () => void;
  isUpdating?: boolean;
}

export function StatusSelector({
  userStatus,
  userProgress = 0,
  totalEpisodes,
  showStatusSelector,
  setShowStatusSelector,
  onUpdateStatus,
  onRemove,
  isUpdating = false,
}: StatusSelectorProps) {

  // Color del indicador según el estado actual
  const getStatusColor = () => {
    if (userStatus === 'En Proceso') return '#38bdf8';
    if (userStatus === 'Terminado') return '#4ade80';
    if (userStatus === 'Por Ver') return '#f59e0b';
    return '#8b5cf6';
  };

  // Formatear texto de progreso
  const getProgressText = () => {
    if (!userStatus) return '';
    if (userStatus === 'Terminado') {
      return `Completado (${totalEpisodes || '??'} ep.)`;
    }
    if (userStatus === 'En Proceso') {
      return `Progreso: ${userProgress}/${totalEpisodes || '??'} episodios`;
    }
    if (userStatus === 'Por Ver') {
      return `Pendiente por ver`;
    }
    return '';
  };

  return (
    <View style={styles.actionContainer}>
      <TouchableOpacity
        style={[
          styles.listButton,
          userStatus ? styles.listButtonActive : styles.listButtonInactive,
        ]}
        onPress={() => setShowStatusSelector(!showStatusSelector)}
        disabled={isUpdating}
      >
        {isUpdating ? (
          <ActivityIndicator size="small" color="#8b5cf6" style={styles.actionIcon} />
        ) : (
          <Ionicons
            name={userStatus ? 'checkmark-circle' : 'add-circle-outline'}
            size={20}
            color={userStatus ? getStatusColor() : '#ffffff'}
            style={styles.actionIcon}
          />
        )}
        <View style={styles.listButtonTextContainer}>
          <View style={styles.statusTextWrapper}>
            {userStatus && (
              <View style={[styles.statusDot, { backgroundColor: getStatusColor() }]} />
            )}
            <Text style={[styles.listButtonText, userStatus && styles.listButtonTextActive]}>
              {userStatus ? `Lista: ${userStatus}` : 'Añadir a mi Lista'}
            </Text>
          </View>
          {userStatus && (
            <Text style={styles.progressSubtext}>{getProgressText()}</Text>
          )}
        </View>
        <Ionicons
          name={showStatusSelector ? 'chevron-up' : 'chevron-down'}
          size={16}
          color={userStatus ? getStatusColor() : '#cbd5e1'}
          style={styles.chevronIcon}
        />
      </TouchableOpacity>

      {showStatusSelector && (
        <View style={styles.selectorDropdown}>
          <Text style={styles.dropdownTitle}>Elegir estado del Anime:</Text>

          <TouchableOpacity
            style={styles.dropdownOption}
            onPress={() => onUpdateStatus('En Proceso')}
            disabled={isUpdating}
          >
            <Ionicons name="play" size={16} color="#38bdf8" />
            <Text style={styles.dropdownOptionText}>En Proceso</Text>
            {userStatus === 'En Proceso' && <Ionicons name="checkmark" size={18} color="#8b5cf6" style={styles.checkIcon} />}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.dropdownOption}
            onPress={() => onUpdateStatus('Terminado')}
            disabled={isUpdating}
          >
            <Ionicons name="checkmark-done" size={16} color="#4ade80" />
            <Text style={styles.dropdownOptionText}>Terminado</Text>
            {userStatus === 'Terminado' && <Ionicons name="checkmark" size={18} color="#8b5cf6" style={styles.checkIcon} />}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.dropdownOption}
            onPress={() => onUpdateStatus('Por Ver')}
            disabled={isUpdating}
          >
            <Ionicons name="bookmark" size={16} color="#f59e0b" />
            <Text style={styles.dropdownOptionText}>Por Ver</Text>
            {userStatus === 'Por Ver' && <Ionicons name="checkmark" size={18} color="#8b5cf6" style={styles.checkIcon} />}
          </TouchableOpacity>

          {/* Botón para quitar de la lista - SIEMPRE visible si el anime está en la lista */}
          {userStatus && (
            <TouchableOpacity
              style={[styles.dropdownOption, styles.dropdownRemove]}
              onPress={onRemove}
              disabled={isUpdating}
            >
              <Ionicons name="trash" size={16} color="#f43f5e" />
              <Text style={[styles.dropdownOptionText, styles.removeText]}>Quitar de mi Lista</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  actionContainer: {
    paddingHorizontal: 16,
    marginBottom: 20,
    zIndex: 10,
  },
  listButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  listButtonInactive: {
    backgroundColor: '#8b5cf6',
    borderColor: '#8b5cf6',
  },
  listButtonActive: {
    backgroundColor: '#1e293b',
    borderColor: '#334155',
  },
  actionIcon: {
    marginRight: 8,
  },
  listButtonTextContainer: {
    flex: 1,
  },
  statusTextWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  listButtonText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 15,
    textAlign: 'center',
  },
  listButtonTextActive: {
    color: '#8b5cf6',
  },
  progressSubtext: {
    color: '#64748b',
    fontSize: 11,
    textAlign: 'center',
    marginTop: 2,
  },
  chevronIcon: {
    marginLeft: 8,
  },
  selectorDropdown: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
    marginTop: 8,
    padding: 8,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  dropdownTitle: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: 'bold',
    paddingHorizontal: 10,
    paddingVertical: 6,
    textTransform: 'uppercase',
  },
  dropdownOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  dropdownOptionText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 10,
    flex: 1,
  },
  checkIcon: {
    marginLeft: 'auto',
  },
  dropdownRemove: {
    borderTopWidth: 1,
    borderTopColor: '#334155',
    marginTop: 6,
    paddingTop: 12,
  },
  removeText: {
    color: '#f43f5e',
  },
});