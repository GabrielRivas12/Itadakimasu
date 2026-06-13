import React, { useRef, useState, useEffect } from 'react';
import { StyleSheet, Text, View, Modal, TouchableOpacity,
  FlatList, NativeSyntheticEvent, NativeScrollEvent,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface YearPickerModalProps {
  visible: boolean;
  initialYear: number | 'Todos';
  onClose: () => void;
  onConfirm: (year: number | 'Todos') => void;
}

const ITEM_HEIGHT = 50;
const VISIBLE_ITEMS = 5;
const WHEEL_HEIGHT = ITEM_HEIGHT * VISIBLE_ITEMS;

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = ['Todos', ...Array.from({ length: 50 }, (_, i) => CURRENT_YEAR - i)];

export function YearPickerModal({
  visible,
  initialYear,
  onClose,
  onConfirm,
}: YearPickerModalProps) {
  const [selectedYear, setSelectedYear] = useState<number | 'Todos'>(initialYear);
  const flatListRef = useRef<FlatList<any>>(null);

  const items = [null, null, ...YEARS, null, null];

  useEffect(() => {
    if (visible) {
      setSelectedYear(initialYear);
      
      const index = YEARS.indexOf(initialYear as any);
      const safeIndex = index !== -1 ? index : 0;
      
      setTimeout(() => {
        if (flatListRef.current) {
          flatListRef.current.scrollToIndex({
            index: safeIndex,
            animated: false,
            viewPosition: 0.5,
          });
        }
      }, 80);
    }
  }, [visible, initialYear]);

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const yOffset = event.nativeEvent.contentOffset.y;
    const index = Math.round(yOffset / ITEM_HEIGHT);
    if (index >= 0 && index < YEARS.length) {
      setSelectedYear(YEARS[index] as any);
    }
  };

  const renderItem = ({ item }: { item: any; index: number }) => {
    if (item === null) {
      return <View style={styles.emptyItem} />;
    }

    const isSelected = item === selectedYear;
    
    return (
      <View style={styles.itemContainer}>
        <Text style={[styles.itemText, isSelected && styles.itemTextSelected]}>
          {item}
        </Text>
      </View>
    );
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.title}>Seleccionar Año</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={22} color="#94a3b8" />
            </TouchableOpacity>
          </View>

          <View style={styles.body}>
            <Text style={styles.label}>Desliza para elegir el año de estreno:</Text>
            
            <View style={styles.pickerContainer}>
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
              />
            </View>
          </View>

          <View style={styles.footer}>
            <TouchableOpacity style={[styles.btn, styles.btnCancel]} onPress={onClose}>
              <Text style={styles.btnCancelText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.btn, styles.btnConfirm]} 
              onPress={() => onConfirm(selectedYear)}
            >
              <Text style={styles.btnConfirmText}>Seleccionar</Text>
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
    maxWidth: 300,
    borderWidth: 1,
    borderColor: '#334155',
    overflow: 'hidden',
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
  },
  title: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  closeButton: {
    padding: 4,
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
    width: '100%',
    backgroundColor: '#0f172a',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#334155',
    position: 'relative',
    overflow: 'hidden',
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
    top: ITEM_HEIGHT * 2,
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
