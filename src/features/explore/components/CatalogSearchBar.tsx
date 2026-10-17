import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  TextInput,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getIsAdultContentEnabled } from '../../../../services/cache';
import { ProviderPicker } from './ProviderPicker';
import {
  DEFAULT_SEARCH_PROVIDER,
  getSearchProviders,
  isAdultSearchProvider,
} from '../constants/searchProviders';

// En web, quita el outline/borde de foco por defecto del <input>.
const webInputReset: any =
  Platform.OS === 'web' ? { outlineStyle: 'none', outlineWidth: 0 } : undefined;

interface CatalogSearchBarProps {
  query: string;
  onChangeQuery: (value: string) => void;
  provider: string;
  onSelectProvider: (providerId: string) => void;
}

/**
 * Buscador por título dentro del catálogo. Se usa en web móvil, donde la barra
 * superior (WebHeader) no está disponible. La búsqueda respeta el proveedor
 * elegido y se apoya en la lógica existente de useExploreSpc.
 */
export function CatalogSearchBar({
  query,
  onChangeQuery,
  provider,
  onSelectProvider,
}: CatalogSearchBarProps) {
  const [adultEnabled, setAdultEnabled] = useState(false);

  useEffect(() => {
    let mounted = true;
    getIsAdultContentEnabled().then((enabled) => {
      if (mounted) setAdultEnabled(enabled);
    });
    return () => {
      mounted = false;
    };
  }, []);

  // Si se desactiva +18, volvemos al proveedor por defecto.
  useEffect(() => {
    if (!adultEnabled && isAdultSearchProvider(provider)) {
      onSelectProvider(DEFAULT_SEARCH_PROVIDER);
    }
  }, [adultEnabled, provider, onSelectProvider]);

  const providers = getSearchProviders(adultEnabled);

  return (
    <View style={styles.wrapper}>
      <View style={styles.inputWrap}>
        <Ionicons name="search" size={18} color="#64748b" />
        <TextInput
          placeholder="Buscar anime..."
          placeholderTextColor="#64748b"
          style={[styles.input, webInputReset]}
          value={query}
          onChangeText={onChangeQuery}
          autoCorrect={false}
          autoCapitalize="none"
          returnKeyType="search"
        />
        {query !== '' && (
          <TouchableOpacity onPress={() => onChangeQuery('')}>
            <Ionicons name="close-circle" size={17} color="#64748b" />
          </TouchableOpacity>
        )}
        <View style={styles.divider} />
        <ProviderPicker
          provider={provider}
          onSelectProvider={onSelectProvider}
          providers={providers}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: '1%',
    paddingTop: 12,
    paddingBottom: 8,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#1e293b',
    borderRadius: 10,
    paddingHorizontal: 10,
    height: 42,
    borderWidth: 1,
    borderColor: '#334155',
  },
  input: {
    flex: 1,
    color: '#ffffff',
    fontSize: 14,
    paddingVertical: 0,
    backgroundColor: 'transparent',
  },
  divider: {
    width: 1,
    height: 18,
    backgroundColor: '#334155',
  },
});
