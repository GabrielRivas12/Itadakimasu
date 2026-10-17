import React from 'react';
import {
  StyleSheet,
  View,
  TextInput,
  TouchableOpacity,
  Text,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ProviderPicker } from './ProviderPicker';
import { DEFAULT_SEARCH_PROVIDER } from '../constants/searchProviders';

interface SearchBarProps {
  value?: string;
  onChangeText?: (text: string) => void;
  onClear?: () => void;
  onPress?: () => void;
  /** Proveedor activo para la búsqueda (id del proveedor). */
  provider?: string;
  /** Cambia el proveedor de búsqueda. Si no se pasa, no se muestra el picker. */
  onSelectProvider?: (providerId: string) => void;
}

// En web, quita el outline/borde de foco por defecto del <input>.
const webInputReset: any = { outlineStyle: 'none', outlineWidth: 0 };

export function SearchBar({
  value = '',
  onChangeText,
  onClear,
  onPress,
  provider = DEFAULT_SEARCH_PROVIDER,
  onSelectProvider,
}: SearchBarProps) {
  const showPicker = !onPress && !!onSelectProvider;
  const isWeb = Platform.OS === 'web';

  const input = (
    <>
      <Ionicons name="search" size={20} color="#64748b" style={styles.searchIcon} />
      {onPress ? (
        <Text style={styles.placeholder}>Buscar anime...</Text>
      ) : (
        <>
          <TextInput
            placeholder="Buscar anime..."
            placeholderTextColor="#64748b"
            style={[styles.searchInput, isWeb && webInputReset]}
            value={value}
            onChangeText={onChangeText}
            clearButtonMode="while-editing"
          />
          {value !== '' && (
            <TouchableOpacity onPress={onClear}>
              <Ionicons name="close-circle" size={18} color="#64748b" />
            </TouchableOpacity>
          )}
          {showPicker && (
            <>
              <View style={styles.divider} />
              <ProviderPicker
                provider={provider}
                onSelectProvider={onSelectProvider!}
              />
            </>
          )}
        </>
      )}
    </>
  );

  return (
    <View style={styles.searchContainer}>
      {onPress ? (
        <TouchableOpacity
          style={[styles.searchBar, isWeb && styles.searchBarWeb]}
          activeOpacity={0.7}
          onPress={onPress}
        >
          {input}
        </TouchableOpacity>
      ) : (
        <View style={[styles.searchBar, isWeb && styles.searchBarWeb]}>{input}</View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  searchContainer: {
    paddingHorizontal: 13,
    paddingTop: 12,
    paddingBottom: 8,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
    borderWidth: 1,
    borderColor: '#334155',
  },
  searchBarWeb: {
    width: '100%',
    maxWidth: 560,
  },
  searchIcon: {
    marginRight: 8,
  },
  placeholder: {
    color: '#64748b',
    fontSize: 15,
    flex: 1,
  },
  searchInput: {
    flex: 1,
    color: '#ffffff',
    fontSize: 15,
    backgroundColor: 'transparent',
  },
  divider: {
    width: 1,
    height: 22,
    backgroundColor: '#334155',
    marginHorizontal: 8,
  },
});
