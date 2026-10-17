import React, { useRef, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Modal,
  Pressable,
  ScrollView,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export interface DropdownOption {
  value: string;
  label: string;
}

interface DropdownPickerProps {
  /** Nombre del campo (ej. "Tipo", "Género"). */
  label: string;
  value: string;
  options: DropdownOption[];
  onChange: (value: string) => void;
  /** Ancho del menú desplegable. */
  menuWidth?: number;
  /** Ocupa el ancho disponible del contenedor (filtros en móvil). */
  fill?: boolean;
}

export function DropdownPicker({
  label,
  value,
  options,
  onChange,
  menuWidth = 220,
  fill = false,
}: DropdownPickerProps) {
  const [open, setOpen] = useState(false);
  const [layout, setLayout] = useState({ top: 0, left: 0, width: menuWidth });
  const buttonRef = useRef<View>(null);

  const active = options.find((o) => o.value === value) ?? options[0];

  const openMenu = () => {
    if (open) {
      setOpen(false);
      return;
    }
    const node = buttonRef.current;
    if (node && typeof node.measureInWindow === 'function') {
      const screenWidth = Dimensions.get('window').width;
      node.measureInWindow((x, y, width, height) => {
        // El menú usa el mismo ancho que el botón (sin salirse de la pantalla) y
        // se alinea con su borde izquierdo: se abre hacia la derecha.
        const menuW = Math.min(width, screenWidth - 16);
        const left = Math.max(8, Math.min(x, screenWidth - menuW - 8));
        setLayout({
          top: y + height + 6,
          left,
          width: menuW,
        });
        setOpen(true);
      });
    } else {
      setOpen(true);
    }
  };

  return (
    <>
      <TouchableOpacity
        ref={buttonRef}
        style={[styles.pill, fill && styles.pillFill]}
        activeOpacity={0.7}
        onPress={openMenu}
      >
        <Text style={styles.fieldLabel}>{label}</Text>
        <Text style={styles.value} numberOfLines={1}>
          {active?.label ?? ''}
        </Text>
        <Ionicons name="chevron-down" size={15} color="#94a3b8" />
      </TouchableOpacity>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <Pressable style={styles.overlay} onPress={() => setOpen(false)}>
          <View style={[styles.menu, { top: layout.top, left: layout.left, width: layout.width }]}>
            <Text style={styles.menuTitle}>{label}</Text>
            <ScrollView
              style={styles.menuScroll}
              showsVerticalScrollIndicator={false}
            >
              {options.map((option) => {
                const isSelected = option.value === value;
                return (
                  <TouchableOpacity
                    key={option.value}
                    style={[styles.menuItem, isSelected && styles.menuItemActive]}
                    activeOpacity={0.7}
                    onPress={() => {
                      onChange(option.value);
                      setOpen(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.menuItemLabel,
                        isSelected && styles.menuItemLabelActive,
                      ]}
                      numberOfLines={1}
                    >
                      {option.label}
                    </Text>
                    {isSelected && (
                      <Ionicons name="checkmark" size={16} color="#8b5cf6" />
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
    maxWidth: 260,
  },
  pillFill: {
    flexGrow: 1,
    flexBasis: '45%',
    maxWidth: '100%',
  },
  fieldLabel: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  value: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
    flexGrow: 1,
    flexShrink: 1,
    textAlign: 'right',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
  },
  menu: {
    position: 'absolute',
    backgroundColor: '#1e293b',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
    paddingVertical: 6,
    paddingHorizontal: 6,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 12,
  },
  menuTitle: {
    color: '#64748b',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    paddingHorizontal: 8,
    paddingTop: 4,
    paddingBottom: 6,
  },
  menuScroll: {
    maxHeight: 320,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 8,
    paddingVertical: 10,
    borderRadius: 8,
  },
  menuItemActive: {
    backgroundColor: '#0f172a',
  },
  menuItemLabel: {
    color: '#e2e8f0',
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  menuItemLabelActive: {
    color: '#ffffff',
  },
});
