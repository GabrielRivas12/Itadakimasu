import React, { useState, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Image,
  Modal,
  TextInput,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { TopAnimeItem } from '../../../../services/firestore';
import { Anime, searchAnime } from '../../../../services/anilist';
import { useTopAnime } from '../hooks/useTopAnime';

export function TopAnime() {
  const { topList, loading, userList, handleAdd, handleRemove } = useTopAnime();
  const router = useRouter();
  const [showAddModal, setShowAddModal] = useState(false);
  const [addMode, setAddMode] = useState<'list' | 'search'>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Anime[]>([]);
  const [searching, setSearching] = useState(false);

  const availableFromList = useMemo(() => {
    const topIds = new Set(topList.map(t => t.animeId));
    return userList.filter(item => !topIds.has(item.animeId));
  }, [userList, topList]);

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    try {
      const results = await searchAnime(query, null);
      const topIds = new Set(topList.map(t => t.animeId));
      setSearchResults(results.filter(r => !topIds.has(r.id)).slice(0, 10));
    } catch (e) {
      console.error('Error searching anime:', e);
    } finally {
      setSearching(false);
    }
  };

  const handleSelectFromList = (anime: Anime) => {
    handleAdd(anime);
    setShowAddModal(false);
  };

  const handleSelectFromSearch = (anime: Anime) => {
    handleAdd(anime);
    setShowAddModal(false);
    setSearchQuery('');
    setSearchResults([]);
  };

  const openAddModal = () => {
    setAddMode('list');
    setSearchQuery('');
    setSearchResults([]);
    setShowAddModal(true);
  };

  const topSlots = useMemo(() => {
    const slots: (TopAnimeItem | null)[] = [];
    for (let i = 0; i < 10; i++) {
      slots.push(topList[i] || null);
    }
    return slots;
  }, [topList]);

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Mi Top 10</Text>
        {topList.length < 10 && (
          <TouchableOpacity style={styles.addButton} onPress={openAddModal}>
            <Ionicons name="add" size={20} color="#ffffff" />
            <Text style={styles.addButtonText}>Agregar</Text>
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#8b5cf6" />
        </View>
      ) : (
        <View style={styles.grid}>
          {topSlots.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={[styles.topCard, item && styles.topCardFilled]}
              activeOpacity={0.7}
              onPress={() => {
                if (!item) openAddModal();
              }}
            >
              <View style={styles.rankBadge}>
                <Text style={styles.rankText}>{index + 1}</Text>
              </View>

              {item ? (
                <>
                  <Image
                    source={{ uri: item.anime.coverImage?.medium || item.anime.coverImage?.large }}
                    style={styles.coverImage}
                  />
                  <Text style={styles.cardTitle} numberOfLines={2}>
                    {item.anime.title.romaji || item.anime.title.english}
                  </Text>
                  <TouchableOpacity
                    style={styles.removeIcon}
                    onPress={() => handleRemove(item.animeId)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons name="close-circle" size={18} color="#ef4444" />
                  </TouchableOpacity>
                </>
              ) : (
                <View style={styles.emptySlot}>
                  <Ionicons name="add-circle-outline" size={24} color="#475569" />
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>
      )}

      <Modal visible={showAddModal} transparent animationType="fade" onRequestClose={() => setShowAddModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Agregar a Top 10</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <Ionicons name="close" size={24} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            <View style={styles.modeTabs}>
              <TouchableOpacity
                style={[styles.modeTab, addMode === 'list' && styles.modeTabActive]}
                onPress={() => setAddMode('list')}
              >
                <Text style={[styles.modeTabText, addMode === 'list' && styles.modeTabTextActive]}>
                  De mi lista
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modeTab, addMode === 'search' && styles.modeTabActive]}
                onPress={() => setAddMode('search')}
              >
                <Text style={[styles.modeTabText, addMode === 'search' && styles.modeTabTextActive]}>
                  Buscar
                </Text>
              </TouchableOpacity>
            </View>

            {addMode === 'list' ? (
              availableFromList.length === 0 ? (
                <Text style={styles.emptyText}>
                  {userList.length === 0
                    ? 'Tu lista está vacía. Agrega animes desde la página de Colección.'
                    : 'Todos los animes de tu lista ya están en tu Top 10.'}
                </Text>
              ) : (
                <FlatList
                  data={availableFromList}
                  keyExtractor={(item) => String(item.animeId)}
                  style={styles.pickerList}
                  renderItem={({ item }) => (
                    <TouchableOpacity style={styles.pickerItem} onPress={() => handleSelectFromList(item.anime)}>
                      <Image
                        source={{ uri: item.anime.coverImage?.medium || item.anime.coverImage?.large }}
                        style={styles.pickerImage}
                      />
                      <Text style={styles.pickerText} numberOfLines={1}>
                        {item.anime.title.romaji || item.anime.title.english}
                      </Text>
                    </TouchableOpacity>
                  )}
                />
              )
            ) : (
              <View>
                <TextInput
                  style={styles.searchInput}
                  placeholder="Buscar anime..."
                  placeholderTextColor="#64748b"
                  value={searchQuery}
                  onChangeText={handleSearch}
                />
                {searching ? (
                  <ActivityIndicator size="small" color="#8b5cf6" style={styles.searchSpinner} />
                ) : searchResults.length > 0 ? (
                  <FlatList
                    data={searchResults}
                    keyExtractor={(item) => String(item.id)}
                    style={styles.pickerList}
                    renderItem={({ item }) => (
                      <TouchableOpacity style={styles.pickerItem} onPress={() => handleSelectFromSearch(item)}>
                        <Image
                          source={{ uri: item.coverImage?.medium || item.coverImage?.large }}
                          style={styles.pickerImage}
                        />
                        <Text style={styles.pickerText} numberOfLines={1}>
                          {item.title.romaji || item.title.english}
                        </Text>
                      </TouchableOpacity>
                    )}
                  />
                ) : searchQuery.trim().length >= 2 ? (
                  <Text style={styles.emptyText}>Sin resultados</Text>
                ) : null}
              </View>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
    borderLeftWidth: 3,
    borderLeftColor: '#8b5cf6',
    paddingLeft: 12,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#8b5cf6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  addButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
  },
  loadingContainer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  topCard: {
    width: '18.4%',
    aspectRatio: 0.7,
    backgroundColor: '#1e293b',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#334155',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 4,
    position: 'relative',
  },
  topCardFilled: {
    borderStyle: 'solid',
    borderColor: '#334155',
    justifyContent: 'flex-start',
    paddingTop: 22,
  },
  rankBadge: {
    position: 'absolute',
    top: 4,
    left: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#8b5cf6',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  rankText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  coverImage: {
    width: '100%',
    height: '60%',
    borderRadius: 6,
    backgroundColor: '#334155',
  },
  cardTitle: {
    color: '#cbd5e1',
    fontSize: 8,
    marginTop: 4,
    textAlign: 'center',
    lineHeight: 10,
  },
  removeIcon: {
    position: 'absolute',
    top: 2,
    right: 2,
    zIndex: 1,
  },
  emptySlot: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#1e293b',
    borderRadius: 20,
    padding: 24,
    maxHeight: '80%',
    borderWidth: 1,
    borderColor: '#334155',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  modeTabs: {
    flexDirection: 'row',
    backgroundColor: '#0f172a',
    borderRadius: 10,
    padding: 4,
    marginBottom: 16,
  },
  modeTab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  modeTabActive: {
    backgroundColor: '#8b5cf6',
  },
  modeTabText: {
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: '600',
  },
  modeTabTextActive: {
    color: '#ffffff',
  },
  pickerList: {
    maxHeight: 300,
  },
  pickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#2d3748',
    gap: 12,
  },
  pickerImage: {
    width: 36,
    height: 52,
    borderRadius: 4,
    backgroundColor: '#334155',
  },
  pickerText: {
    color: '#cbd5e1',
    fontSize: 14,
    flex: 1,
  },
  searchInput: {
    backgroundColor: '#0f172a',
    borderRadius: 12,
    padding: 14,
    color: '#ffffff',
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 12,
  },
  searchSpinner: {
    paddingVertical: 20,
  },
  emptyText: {
    color: '#64748b',
    fontSize: 13,
    textAlign: 'center',
    paddingVertical: 20,
  },
});
