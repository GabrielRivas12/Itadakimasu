import React, { useRef, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Modal,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  SEARCH_PROVIDERS,
  HENTAILA_SEARCH_PROVIDERS,
  DEFAULT_SEARCH_PROVIDER,
  SearchProviderOption,
} from '../constants/searchProviders';

interface ProviderPickerProps {
  provider?: string;
  onSelectProvider: (providerId: string) => void;
  /** Versión reducida para el header. */
  compact?: boolean;
  /** Lista de proveedores a mostrar (por defecto, los base sin +18). */
  providers?: SearchProviderOption[];
}

const MENU_WIDTH = 176;

const ALL_PROVIDERS = [...SEARCH_PROVIDERS, ...HENTAILA_SEARCH_PROVIDERS];

export function ProviderPicker({
  provider = DEFAULT_SEARCH_PROVIDER,
  onSelectProvider,
  compact = false,
  providers = SEARCH_PROVIDERS,
}: ProviderPickerProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuLayout, setMenuLayout] = useState({ top: 0, left: 0 });
  const buttonRef = useRef<View>(null);

  const active =
    providers.find((p) => p.id === provider) ??
    ALL_PROVIDERS.find((p) => p.id === provider) ??
    providers[0];

  const openMenu = () => {
    if (menuOpen) {
      setMenuOpen(false);
      return;
    }
    const node = buttonRef.current;
    if (node && typeof node.measureInWindow === 'function') {
      node.measureInWindow((x, y, width, height) => {
        setMenuLayout({
          top: y + height + 6,
          left: Math.max(8, x + width - MENU_WIDTH),
        });
        setMenuOpen(true);
      });
    } else {
      setMenuOpen(true);
    }
  };

  return (
    <>
      <TouchableOpacity
        ref={buttonRef}
        style={[
          styles.button,
          compact && styles.buttonCompact,
          { borderColor: active.color },
        ]}
        onPress={openMenu}
        activeOpacity={0.7}
      >
        <View style={[styles.dot, { backgroundColor: active.color }]} />
        <Text style={[styles.code, { color: active.color }]}>{active.code}</Text>
        <Ionicons name="chevron-down" size={compact ? 12 : 14} color="#94a3b8" />
      </TouchableOpacity>

      <Modal
        visible={menuOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setMenuOpen(false)}
      >
        <Pressable style={styles.overlay} onPress={() => setMenuOpen(false)}>
          <View style={[styles.menu, { top: menuLayout.top, left: menuLayout.left }]}>
            <Text style={styles.menuTitle}>Buscar en</Text>
            {providers.map((option) => {
              const isSelected = option.id === active.id;
              return (
                <TouchableOpacity
                  key={option.id}
                  style={[styles.menuItem, isSelected && styles.menuItemActive]}
                  activeOpacity={0.7}
                  onPress={() => {
                    onSelectProvider(option.id);
                    setMenuOpen(false);
                  }}
                >
                  <View style={[styles.dot, { backgroundColor: option.color }]} />
                  <Text style={styles.menuItemLabel}>{option.label}</Text>
                  {isSelected && (
                    <Ionicons name="checkmark" size={16} color={option.color} />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
    backgroundColor: '#0f172a',
  },
  buttonCompact: {
    paddingHorizontal: 6,
    paddingVertical: 4,
    gap: 4,
    borderRadius: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  code: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
  },
  menu: {
    position: 'absolute',
    width: MENU_WIDTH,
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
});
