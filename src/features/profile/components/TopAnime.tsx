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
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { TopAnimeItem } from '../../../../services/firestore';
import { Anime, searchAnime } from '../../../../services/anilist';
import { useTopAnime } from '../hooks/useTopAnime';

export function TopAnime() {
  const { topList, loading, userList, handleAdd, handleRemove } = useTopAnime();
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);
  const [modalTab, setModalTab] = useState<'manage' | 'lista' | 'buscar'>('manage');
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
    setModalTab('manage');
  };

  const handleSelectFromSearch = (anime: Anime) => {
    handleAdd(anime);
    setSearchQuery('');
    setSearchResults([]);
    setModalTab('manage');
  };

  const openModal = (tab: 'manage' | 'lista' | 'buscar') => {
    setModalTab(tab);
    setSearchQuery('');
    setSearchResults([]);
    setShowModal(true);
  };

  const isFull = topList.length >= 10;

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Mi Top 10</Text>
        <TouchableOpacity style={styles.editButton} onPress={() => openModal('manage')}>
          <Ionicons name="pencil" size={18} color="#ffffff" />
          <Text style={styles.editButtonText}>Editar</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#8b5cf6" />
        </View>
      ) : topList.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="star-outline" size={48} color="#334155" />
          <Text style={styles.emptyStateTitle}>No hay anime en tu Top 10</Text>
          <Text style={styles.emptyStateText}>
            Presiona Editar para agregar tus animes favoritos desde tu lista o buscando nuevos.
          </Text>
          <TouchableOpacity style={styles.emptyStateButton} onPress={() => openModal('lista')}>
            <Ionicons name="add" size={20} color="#ffffff" />
            <Text style={styles.emptyStateButtonText}>Agregar anime</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.list}>
          {topList.map((item, index) => (
            <TouchableOpacity
              key={item.animeId}
              style={styles.horizontalCard}
              activeOpacity={0.7}
              onPress={() => router.push({ pathname: '/animedetails', params: { id: item.anime.id } })}
            >
              <View style={[
                styles.rankBadge,
                index === 0 && styles.rankBadgeGold,
                index === 1 && styles.rankBadgeSilver,
                index === 2 && styles.rankBadgeBronze,
              ]}>
                {index === 0 ? (
                  <Ionicons name="trophy" size={12} color="#fbbf24" />
                ) : index === 1 ? (
                  <Ionicons name="medal" size={12} color="#e2e8f0" />
                ) : index === 2 ? (
                  <Ionicons name="medal-outline" size={12} color="#d97747" />
                ) : null}
                <Text style={[
                  styles.rankText,
                  index === 0 && styles.rankTextGold,
                  index === 1 && styles.rankTextSilver,
                  index === 2 && styles.rankTextBronze,
                ]}>{index + 1}</Text>
              </View>
              <Image
                source={{ uri: item.anime.coverImage?.medium || item.anime.coverImage?.large }}
                style={styles.coverImage}
              />
              <View style={styles.cardInfo}>
                <Text style={styles.cardTitle} numberOfLines={1}>
                  {item.anime.title.romaji || item.anime.title.english}
                </Text>
                <View style={styles.cardMeta}>
                  {item.anime.genres && item.anime.genres.length > 0 && (
                    <Text style={styles.cardGenres} numberOfLines={1}>
                      {item.anime.genres.slice(0, 3).join(' • ')}
                    </Text>
                  )}
                  {item.anime.episodes != null && (
                    <View style={styles.cardEpisodes}>
                      <Ionicons name="tv-outline" size={11} color="#64748b" />
                      <Text style={styles.cardEpisodesText}>{item.anime.episodes}</Text>
                    </View>
                  )}
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <Modal visible={showModal} transparent animationType="fade" onRequestClose={() => setShowModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {modalTab === 'manage' ? 'Editar Top 10' : 'Agregar a Top 10'}
              </Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <Ionicons name="close" size={24} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            {modalTab === 'manage' && (
              <>
                <View style={styles.manageActions}>
                  {!isFull && (
                    <TouchableOpacity
                      style={styles.manageActionButton}
                      onPress={() => setModalTab('lista')}
                    >
                      <Ionicons name="list-outline" size={18} color="#8b5cf6" />
                      <Text style={styles.manageActionText}>De mi lista</Text>
                    </TouchableOpacity>
                  )}
                  {!isFull && (
                    <TouchableOpacity
                      style={styles.manageActionButton}
                      onPress={() => setModalTab('buscar')}
                    >
                      <Ionicons name="search-outline" size={18} color="#8b5cf6" />
                      <Text style={styles.manageActionText}>Buscar</Text>
                    </TouchableOpacity>
                  )}
                  {isFull && (
                    <Text style={styles.fullText}>El Top 10 está completo. Elimina uno para agregar otro.</Text>
                  )}
                </View>

                {topList.length > 0 && (
                  <View style={styles.manageSection}>
                    <Text style={styles.manageLabel}>Animes en tu Top 10</Text>
                    <FlatList
                      data={topList}
                      keyExtractor={(item) => String(item.animeId)}
                      style={styles.manageList}
                      renderItem={({ item, index }) => (
                        <View style={styles.manageItem}>
                          <View style={styles.manageRank}>
                            <Text style={styles.manageRankText}>{index + 1}</Text>
                          </View>
                          <Image
                            source={{ uri: item.anime.coverImage?.medium || item.anime.coverImage?.large }}
                            style={styles.manageCover}
                          />
                          <Text style={styles.manageName} numberOfLines={1}>
                            {item.anime.title.romaji || item.anime.title.english}
                          </Text>
                          <TouchableOpacity
                            style={styles.manageRemove}
                            onPress={() => {
                              handleRemove(item.animeId);
                              if (topList.length === 1) setShowModal(false);
                            }}
                          >
                            <Ionicons name="trash-outline" size={18} color="#ef4444" />
                          </TouchableOpacity>
                        </View>
                      )}
                    />
                  </View>
                )}
              </>
            )}

            {modalTab === 'lista' && (
              availableFromList.length === 0 ? (
                <View>
                  <Text style={styles.emptyHint}>
                    {userList.length === 0
                      ? 'Tu lista está vacía. Agrega animes desde la página de Colección.'
                      : 'Todos los animes de tu lista ya están en tu Top 10.'}
                  </Text>
                  <TouchableOpacity style={styles.backToManage} onPress={() => setModalTab('manage')}>
                    <Ionicons name="arrow-back" size={16} color="#8b5cf6" />
                    <Text style={styles.backToManageText}>Volver</Text>
                  </TouchableOpacity>
                </View>
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
            )}

            {modalTab === 'buscar' && (
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
                  <Text style={styles.emptyHint}>Sin resultados</Text>
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
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#334155',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  editButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
  },
  loadingContainer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
    backgroundColor: '#161b2c',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2d3748',
    gap: 12,
  },
  emptyStateTitle: {
    color: '#94a3b8',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyStateText: {
    color: '#64748b',
    fontSize: 13,
    textAlign: 'center',
    paddingHorizontal: 32,
    lineHeight: 18,
  },
  emptyStateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#8b5cf6',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
    marginTop: 4,
  },
  emptyStateButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  list: {
    gap: 8,
  },
  horizontalCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 8,
    paddingLeft: 50,
    borderWidth: 1,
    borderColor: '#334155',
    gap: 10,
    position: 'relative',
  },
  rankBadge: {
    position: 'absolute',
    left: 8,
    width: 38,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#8b5cf6',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 2,
    zIndex: 1,
  },
  rankBadgeGold: {
    backgroundColor: 'rgba(251, 191, 36, 0.2)',
    borderWidth: 1,
    borderColor: '#fbbf24',
  },
  rankBadgeSilver: {
    backgroundColor: 'rgba(148, 163, 184, 0.2)',
    borderWidth: 1,
    borderColor: '#94a3b8',
  },
  rankBadgeBronze: {
    backgroundColor: 'rgba(217, 119, 71, 0.2)',
    borderWidth: 1,
    borderColor: '#d97747',
  },
  rankText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  rankTextGold: {
    color: '#fbbf24',
  },
  rankTextSilver: {
    color: '#e2e8f0',
  },
  rankTextBronze: {
    color: '#d97747',
  },
  coverImage: {
    width: 40,
    height: 56,
    borderRadius: 6,
    backgroundColor: '#334155',
  },
  cardInfo: {
    flex: 1,
    gap: 4,
    overflow: 'hidden',
  },
  cardTitle: {
    color: '#cbd5e1',
    fontSize: 14,
    fontWeight: '600',
    overflow: 'hidden',
  },
  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  cardGenres: {
    color: '#64748b',
    fontSize: 11,
    flexShrink: 1,
    overflow: 'hidden',
  },
  cardEpisodes: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    flexShrink: 0,
  },
  cardEpisodesText: {
    color: '#64748b',
    fontSize: 11,
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
  manageSection: {
    marginBottom: 16,
    marginTop: 12,
  },
  manageLabel: {
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  manageList: {
    maxHeight: 200,
  },
  manageItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#2d3748',
  },
  manageRank: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#8b5cf6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  manageRankText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  manageCover: {
    width: 32,
    height: 44,
    borderRadius: 4,
    backgroundColor: '#334155',
  },
  manageName: {
    color: '#cbd5e1',
    fontSize: 14,
    flex: 1,
  },
  manageRemove: {
    padding: 6,
  },
  manageActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  manageActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#334155',
    gap: 6,
  },
  manageActionText: {
    color: '#8b5cf6',
    fontSize: 14,
    fontWeight: '600',
  },
  fullText: {
    color: '#64748b',
    fontSize: 13,
    textAlign: 'center',
    paddingVertical: 8,
  },
  backToManage: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 10,
    marginTop: 8,
  },
  backToManageText: {
    color: '#8b5cf6',
    fontSize: 14,
    fontWeight: '500',
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
  emptyHint: {
    color: '#64748b',
    fontSize: 13,
    textAlign: 'center',
    paddingVertical: 20,
  },
});
