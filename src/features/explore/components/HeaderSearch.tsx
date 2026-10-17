import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, usePathname } from 'expo-router';
import {
  searchAnime1V,
  buildImageProxyUrl,
  Anime1VSearchResult,
} from '../../../../services/anime1v';
import { getIsAdultContentEnabled } from '../../../../services/cache';
import { ProviderPicker } from './ProviderPicker';
import {
  DEFAULT_SEARCH_PROVIDER,
  getSearchProviders,
  isAdultSearchProvider,
} from '../constants/searchProviders';

const MAX_RESULTS = 8;

// En web, quita el outline/borde de foco por defecto del <input>.
const webInputReset: any = Platform.OS === 'web' ? { outlineStyle: 'none', outlineWidth: 0 } : undefined;

// Dominio de origen de un resultado de HentaiLA (.com / .moe / .io).
const getHentailaSource = (item: Anime1VSearchResult): string | null => {
  const match = (item.url || '').match(/hentaila\.(com|moe|io)/i);
  return match ? `HentaiLA .${match[1].toLowerCase()}` : null;
};

export function HeaderSearch() {
  const router = useRouter();
  const pathname = usePathname();
  const [query, setQuery] = useState('');
  const [provider, setProvider] = useState(DEFAULT_SEARCH_PROVIDER);
  const [results, setResults] = useState<Anime1VSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [adultEnabled, setAdultEnabled] = useState(false);

  const trimmed = query.trim();

  // El header vive en el layout raíz: releemos el ajuste +18 al navegar.
  useEffect(() => {
    let mounted = true;
    getIsAdultContentEnabled().then((enabled) => {
      if (mounted) setAdultEnabled(enabled);
    });
    return () => {
      mounted = false;
    };
  }, [pathname]);

  // Si se desactiva +18, volvemos al proveedor por defecto.
  useEffect(() => {
    if (!adultEnabled && isAdultSearchProvider(provider)) {
      setProvider(DEFAULT_SEARCH_PROVIDER);
    }
  }, [adultEnabled, provider]);

  const providers = getSearchProviders(adultEnabled);

  useEffect(() => {
    if (!trimmed) {
      setResults([]);
      setLoading(false);
      setOpen(false);
      return;
    }

    let cancelled = false;
    setOpen(true);
    setLoading(true);

    const timer = setTimeout(async () => {
      try {
        const data = await searchAnime1V(trimmed, provider);
        if (!cancelled) {
          setResults(data.slice(0, MAX_RESULTS));
        }
      } catch (error) {
        console.error('Error buscando en el header:', error);
        if (!cancelled) setResults([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [trimmed, provider]);

  const handleClear = () => {
    setQuery('');
    setOpen(false);
  };

  const handleResultPress = (item: Anime1VSearchResult) => {
    setQuery('');
    setOpen(false);
    router.push({
      pathname: '/animatedetailsepaicore',
      params: { url: item.url, title: item.title },
    });
  };

  const showDropdown = open && trimmed.length > 0;

  return (
    <View style={styles.wrapper}>
      <View style={styles.inputWrap}>
        <Ionicons name="search" size={18} color="#64748b" />
        <TextInput
          placeholder="Buscar anime..."
          placeholderTextColor="#64748b"
          style={[styles.input, webInputReset]}
          value={query}
          onChangeText={setQuery}
        />
        {query !== '' && (
          <TouchableOpacity onPress={handleClear}>
            <Ionicons name="close-circle" size={17} color="#64748b" />
          </TouchableOpacity>
        )}
        <View style={styles.divider} />
        <ProviderPicker
          compact
          provider={provider}
          onSelectProvider={setProvider}
          providers={providers}
        />

        {showDropdown && (
          <View style={styles.dropdown}>
            {loading && results.length === 0 ? (
              <View style={styles.dropdownState}>
                <ActivityIndicator size="small" color="#8b5cf6" />
              </View>
            ) : results.length === 0 ? (
              <View style={styles.dropdownState}>
                <Text style={styles.dropdownStateText}>Sin resultados</Text>
              </View>
            ) : (
              <ScrollView
                style={styles.resultsScroll}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                {results.map((item) => {
                  const source = getHentailaSource(item);
                  return (
                    <TouchableOpacity
                      key={`${item.id}-${item.url}`}
                      style={styles.resultRow}
                      activeOpacity={0.7}
                      onPress={() => handleResultPress(item)}
                    >
                      {item.image ? (
                        <Image
                          source={{ uri: buildImageProxyUrl(item.image) }}
                          style={styles.resultImage}
                        />
                      ) : (
                        <View style={styles.resultImagePlaceholder} />
                      )}
                      <View style={styles.resultInfo}>
                        <Text style={styles.resultTitle} numberOfLines={2}>
                          {item.title}
                        </Text>
                        {(!!item.type || !!source) && (
                          <View style={styles.resultMetaRow}>
                            {!!item.type && (
                              <Text style={styles.resultType} numberOfLines={1}>
                                {String(item.type)}
                              </Text>
                            )}
                            {!!source && (
                              <Text style={styles.resultSource} numberOfLines={1}>
                                {source}
                              </Text>
                            )}
                          </View>
                        )}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}
          </View>
        )}
      </View>

      <TouchableOpacity
        style={styles.filtersButton}
        activeOpacity={0.8}
        onPress={() => router.push('/explore')}
      >
        <Ionicons name="options-outline" size={16} color="#c4b5fd" />
        <Text style={styles.filtersText}>Filtros</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    maxWidth: 420,
    minWidth: 0,
    overflow: 'visible',
  },
  inputWrap: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#1e293b',
    borderRadius: 10,
    paddingHorizontal: 10,
    height: 40,
    borderWidth: 1,
    borderColor: '#334155',
    position: 'relative',
    overflow: 'visible',
    zIndex: 2000,
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
  dropdown: {
    position: 'absolute',
    top: '100%',
    marginTop: 6,
    left: 0,
    right: 0,
    backgroundColor: '#1e293b',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
    overflow: 'hidden',
    zIndex: 3000,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 16,
  },
  dropdownState: {
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dropdownStateText: {
    color: '#64748b',
    fontSize: 13,
  },
  resultsScroll: {
    maxHeight: 360,
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  resultImage: {
    width: 34,
    height: 46,
    borderRadius: 6,
    backgroundColor: '#0f172a',
  },
  resultImagePlaceholder: {
    width: 34,
    height: 46,
    borderRadius: 6,
    backgroundColor: '#0f172a',
  },
  resultInfo: {
    flex: 1,
  },
  resultTitle: {
    color: '#e2e8f0',
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 17,
  },
  resultMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 2,
  },
  resultType: {
    color: '#64748b',
    fontSize: 11,
  },
  resultSource: {
    color: '#fb7185',
    fontSize: 11,
    fontWeight: '700',
  },
  filtersButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
  },
  filtersText: {
    color: '#c4b5fd',
    fontSize: 13,
    fontWeight: '700',
  },
});
