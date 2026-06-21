import React, { useRef, useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Modal,
  TouchableOpacity,
  FlatList,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface ProgressModalProps {
  visible: boolean;
  animeTitle: string;
  initialProgress: number;
  totalEpisodes: number | null;
  selectedStatus: string | null;
  isUpdatingProgress: boolean;
  onClose: () => void;
  onConfirm: (progress: number) => void;
}

const ITEM_HEIGHT = 50;
const VISIBLE_ITEMS = 5;
const WHEEL_HEIGHT = ITEM_HEIGHT * VISIBLE_ITEMS;

export function ProgressModal({
  visible,
  animeTitle,
  initialProgress,
  totalEpisodes,
  selectedStatus,
  isUpdatingProgress,
  onClose,
  onConfirm,
}: ProgressModalProps) {
  // Rango máximo de episodios. Si es null o indefinido, usamos 100 por defecto.
  const maxEpisodes = totalEpisodes || 100;

  // Rango de episodios del 0 al maxEpisodes
  const episodesArray = Array.from({ length: maxEpisodes + 1 }, (_, i) => i);

  // Elementos con espaciadores arriba y abajo para centrado
  const items = [null, null, ...episodesArray, null, null];

  // Estado local para el valor seleccionado actualmente
  const [selectedProgress, setSelectedProgress] = useState(initialProgress);

  const flatListRef = useRef<FlatList<any>>(null);

  // Sincronizar el progreso seleccionado con el valor inicial cuando se muestra el modal
  useEffect(() => {
    if (visible) {
      // Asegurarse de no exceder el máximo permitido
      const clampedProgress = Math.min(Math.max(0, initialProgress), maxEpisodes);
      setSelectedProgress(clampedProgress);

      // Auto-scrollear a la posición correspondiente en el siguiente ciclo de renderizado
      setTimeout(() => {
        if (flatListRef.current) {
          flatListRef.current.scrollToIndex({
            index: clampedProgress,
            animated: false,
            viewPosition: 0.5,
          });
        }
      }, 80);
    }
  }, [visible, initialProgress, maxEpisodes]);

  // Manejar el final del scroll para fijar el número en el centro
  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const yOffset = event.nativeEvent.contentOffset.y;
    const index = Math.round(yOffset / ITEM_HEIGHT);
    if (index >= 0 && index <= maxEpisodes) {
      setSelectedProgress(index);
    }
  };

  const handleConfirmPress = () => {
    // Si el estado es "Terminado", forzar el progreso al máximo de episodios
    if (selectedStatus === 'Terminado' && totalEpisodes) {
      onConfirm(totalEpisodes);
    } else {
      onConfirm(selectedProgress);
    }
  };

  const renderItem = ({ item, index }: { item: number | null; index: number }) => {
    if (item === null) {
      return <View style={styles.emptyItem} />;
    }

    const isSelected = item === selectedProgress;

    return (
      <View style={styles.itemContainer}>
        <Text style={[styles.itemText, isSelected && styles.itemTextSelected]}>
          {item}
        </Text>
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.title} numberOfLines={2}>
              {selectedStatus === 'Terminado'
                ? '¿Confirmar finalización?'
                : isUpdatingProgress
                  ? `Actualizar progreso`
                  : `Añadir a mi Lista`}
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={22} color="#94a3b8" />
            </TouchableOpacity>
          </View>

          <Text style={styles.subtitle} numberOfLines={1}>
            {animeTitle}
          </Text>

          {selectedStatus !== 'Terminado' ? (
            <View style={styles.body}>
              <Text style={styles.label}>
                Desliza verticalmente para elegir los episodios vistos:
              </Text>

              <View style={styles.pickerContainer}>
                {/* Indicador de selección central */}
                <View style={styles.selectionHighlight} />

                <FlatList
                  ref={flatListRef}
                  data={items}
                  keyExtractor={(_, index) => index.toString()}
                  renderItem={renderItem}
                  showsVerticalScrollIndicator={false}
                  snapToInterval={ITEM_HEIGHT}
                  decelerationRate="fast"
                  onScroll={handleScroll}
                  scrollEventThrottle={16}
                  getItemLayout={(_, index) => ({
                    length: ITEM_HEIGHT,
                    offset: ITEM_HEIGHT * index,
                    index,
                  })}
                  onScrollToIndexFailed={(info) => {
                    setTimeout(() => {
                      flatListRef.current?.scrollToIndex({
                        index: info.index,
                        animated: false,
                        viewPosition: 0.5,
                      });
                    }, 50);
                  }}
                />
              </View>

              <Text style={styles.progressStatusText}>
                Seleccionado: <Text style={styles.progressHighlight}>{selectedProgress}</Text> de {totalEpisodes || '??'} episodios
              </Text>
            </View>
          ) : (
            <View style={styles.body}>
              <Text style={styles.confirmText}>
                ¿Confirmas que has completado todos los <Text style={styles.progressHighlight}>{totalEpisodes || '??'}</Text> episodios?
              </Text>
            </View>
          )}

          <View style={styles.footer}>
            <TouchableOpacity style={[styles.btn, styles.btnCancel]} onPress={onClose}>
              <Text style={styles.btnCancelText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.btn, styles.btnConfirm]} onPress={handleConfirmPress}>
              <Text style={styles.btnConfirmText}>
                {isUpdatingProgress ? 'Actualizar' : 'Guardar'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(5, 7, 12, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  content: {
    backgroundColor: '#1e293b',
    borderRadius: 20,
    width: '100%',
    maxWidth: 340,
    borderWidth: 1,
    borderColor: '#334155',
    overflow: 'hidden',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 20,
    paddingHorizontal: 20,
  },
  title: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
    flex: 1,
    marginRight: 10,
  },
  closeButton: {
    padding: 4,
  },
  subtitle: {
    color: '#8b5cf6',
    fontSize: 13,
    fontWeight: '600',
    paddingHorizontal: 20,
    marginTop: 4,
    marginBottom: 16,
  },
  body: {
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  label: {
    color: '#94a3b8',
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 16,
  },
  pickerContainer: {
    height: WHEEL_HEIGHT,
    width: 300,
    backgroundColor: '#0f172a',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#334155',
    position: 'relative',
    overflow: 'hidden',
    justifyContent: 'center',
  },
  selectionHighlight: {
    position: 'absolute',
    height: ITEM_HEIGHT,
    left: 8,
    right: 8,
    backgroundColor: '#1e293b',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#8b5cf6',
    top: ITEM_HEIGHT * 2, // Centered (index 2 of 5 visible slots)
  },
  itemContainer: {
    height: ITEM_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyItem: {
    height: ITEM_HEIGHT,
  },
  itemText: {
    color: '#64748b',
    fontSize: 16,
    fontWeight: '500',
  },
  itemTextSelected: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  progressStatusText: {
    color: '#94a3b8',
    fontSize: 13,
    marginTop: 16,
    marginBottom: 8,
  },
  progressHighlight: {
    color: '#8b5cf6',
    fontWeight: 'bold',
  },
  confirmText: {
    color: '#f8fafc',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
    marginVertical: 12,
  },
  footer: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#334155',
    marginTop: 16,
  },
  btn: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnCancel: {
    borderRightWidth: 1,
    borderRightColor: '#334155',
  },
  btnCancelText: {
    color: '#cbd5e1',
    fontSize: 14,
    fontWeight: '600',
  },
  btnConfirm: {
    backgroundColor: '#8b5cf6',
  },
  btnConfirmText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
  },
});
