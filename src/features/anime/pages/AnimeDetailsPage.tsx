import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Share,
  Alert,
  Platform,
  Dimensions,
  Modal,
  TextInput,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { fetchAnimeDetails, Anime } from '../../../../services/anilist';
import { fetchSpanishSynopsisFromJikan } from '../../../../services/kitsu';
import {
  getAnimeStatus,
  addOrUpdateAnimeInList,
  removeAnimeFromList,
  UserListStatus,
  getAnimeProgress,
  updateAnimeProgress,
} from '../../../../services/animeList';
import { AnimeHeader } from '../components/AnimeHeader';
import { StatusSelector } from '../components/StatusSelector';
import { QuickStats } from '../components/QuickStats';

const { width, height } = Dimensions.get('window');

const cleanHtmlText = (text: string): string => {
  if (!text) return '';
  return text
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .trim();
};

const formatDate = (date: { year?: number; month?: number; day?: number } | undefined): string => {
  if (!date || !date.year) return 'Desconocida';
  
  const day = date.day || 1;
  const month = date.month || 1;
  const year = date.year;
  
  return `${day.toString().padStart(2, '0')}/${month.toString().padStart(2, '0')}/${year}`;
};

function SkeletonLoader() {
  return (
    <View style={styles.skeletonContainer}>
      <View style={styles.skeletonHeader} />
      <View style={styles.skeletonTitle} />
      <View style={styles.skeletonStats} />
      <View style={styles.skeletonText} />
      <View style={styles.skeletonText} />
      <View style={styles.skeletonTextShort} />
    </View>
  );
}

export function AnimeDetailsPage() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  
  const [anime, setAnime] = useState<Anime | null>(null);
  const [loading, setLoading] = useState(true);
  const [spanishSynopsis, setSpanishSynopsis] = useState<string | null>(null);
  const [loadingSpanishSynopsis, setLoadingSpanishSynopsis] = useState(false);
  const [userStatus, setUserStatus] = useState<UserListStatus | null>(null);
  const [userProgress, setUserProgress] = useState<number>(0);
  const [showStatusSelector, setShowStatusSelector] = useState(false);
  const [showProgressModal, setShowProgressModal] = useState(false);
  const [progressInput, setProgressInput] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<UserListStatus | null>(null);
  const [isUpdatingProgress, setIsUpdatingProgress] = useState(false);

  const animeId = typeof id === 'string' ? parseInt(id, 10) : Array.isArray(id) ? parseInt(id[0], 10) : null;

  useEffect(() => {
    if (animeId) {
      loadDetails(animeId);
    }
  }, [animeId]);

  const loadDetails = async (id: number) => {
    try {
      setLoading(true);
      const [details, status, progress] = await Promise.all([
        fetchAnimeDetails(id),
        getAnimeStatus(id),
        getAnimeProgress(id),
      ]);
      
      setAnime(details);
      setUserStatus(status);
      setUserProgress(progress);

      // Intentar obtener sinopsis desde Jikan API
      if (details && details.idMal) {
        setLoadingSpanishSynopsis(true);
        try {
          const synopsis = await fetchSpanishSynopsisFromJikan(details.idMal);
          if (synopsis && synopsis.trim()) {
            const cleanedSynopsis = cleanHtmlText(synopsis);
            setSpanishSynopsis(cleanedSynopsis);
          }
        } catch (error) {
          console.error('Error fetching synopsis:', error);
        } finally {
          setLoadingSpanishSynopsis(false);
        }
      }
    } catch (error) {
      console.error('Error loading anime details:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveProgress = async (progress: number, isUpdate: boolean = false) => {
    if (!anime) return;
    
    let finalProgress = progress;
    
    // Si es "Terminado", forzar progreso al total de episodios
    if (selectedStatus === 'Terminado' && anime.episodes) {
      finalProgress = anime.episodes;
    }
    
    // Limitar progreso al total de episodios
    if (anime.episodes && finalProgress > anime.episodes) {
      finalProgress = anime.episodes;
    }
    
    if (isUpdate) {
      await updateAnimeProgress(anime.id, finalProgress);
      setUserProgress(finalProgress);
      Alert.alert('¡Éxito!', `Progreso actualizado a ${finalProgress}/${anime.episodes || '??'} episodios`);
    } else {
      await addOrUpdateAnimeInList(anime, selectedStatus!, finalProgress);
      setUserStatus(selectedStatus);
      setUserProgress(finalProgress);
      Alert.alert('¡Éxito!', `Anime agregado a tu lista como "${selectedStatus}" con ${finalProgress}/${anime.episodes || '??'} episodios`);
    }
    
    setShowProgressModal(false);
    setProgressInput('');
    setSelectedStatus(null);
    setShowStatusSelector(false);
    setIsUpdatingProgress(false);
  };

  const handleUpdateStatus = async (status: UserListStatus) => {
    if (!anime) return;
    
    // Si el estado es "En Proceso" o "Terminado", pedir progreso
    if (status === 'En Proceso' || status === 'Terminado') {
      setSelectedStatus(status);
      setIsUpdatingProgress(false);
      setProgressInput(userProgress.toString());
      setShowProgressModal(true);
    } else {
      // Para "Por Ver", no necesita progreso
      await addOrUpdateAnimeInList(anime, status, 0);
      setUserStatus(status);
      setUserProgress(0);
      setShowStatusSelector(false);
      Alert.alert('¡Éxito!', `Anime agregado a tu lista como "${status}"`);
    }
  };

  const handleUpdateProgress = async () => {
    if (!anime || !userStatus) return;
    
    setSelectedStatus(userStatus);
    setProgressInput(userProgress.toString());
    setIsUpdatingProgress(true);
    setShowProgressModal(true);
  };

  const handleProgressConfirm = async () => {
    let progress = parseInt(progressInput, 10);
    if (isNaN(progress)) progress = 0;
    await saveProgress(progress, isUpdatingProgress);
  };

  const handleRemove = async () => {
    if (!animeId) return;
    try {
      await removeAnimeFromList(animeId);
      setUserStatus(null);
      setUserProgress(0);
      setShowStatusSelector(false);
      Alert.alert('¡Eliminado!', 'Anime quitado de tu lista personal');
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'No se pudo eliminar el anime de tu lista');
    }
  };

  const handleShare = async () => {
    if (!anime) return;
    try {
      await Share.share({
        message: `¡Mira este anime en AnimeLT! ${anime.title.english || anime.title.romaji}\nhttps://anilist.co/anime/${anime.id}`,
      });
    } catch (error) {
      console.error('Error sharing anime:', error);
    }
  };

  const getStatusInSpanish = (status: string): string => {
    const statusMap: Record<string, string> = {
      'FINISHED': 'Finalizado',
      'RELEASING': 'En emisión',
      'NOT_YET_RELEASED': 'Próximamente',
      'CANCELLED': 'Cancelado',
      'HIATUS': 'En pausa',
    };
    return statusMap[status] || status;
  };

  // Mostrar skeleton mientras carga
  if (loading) {
    return (
      <>
        <Stack.Screen
          options={{
            headerShown: true,
            title: 'Cargando...',
            headerTransparent: true,
            headerTintColor: '#ffffff',
            headerLeft: () => (
              <TouchableOpacity onPress={() => router.back()} style={styles.headerIconButton}>
                <Ionicons name="arrow-back" size={24} color="#ffffff" />
              </TouchableOpacity>
            ),
          }}
        />
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
          <SkeletonLoader />
        </ScrollView>
      </>
    );
  }

  if (!anime) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={64} color="#f43f5e" />
        <Text style={styles.errorText}>No se pudo cargar la información</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Regresar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const cleanDescription = anime.description
    ? cleanHtmlText(anime.description)
    : 'No hay descripción disponible para este anime.';

  const displaySynopsis = spanishSynopsis || cleanDescription;

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: anime.title.english || anime.title.romaji,
          headerTransparent: true,
          headerTintColor: '#ffffff',
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={styles.headerIconButton}>
              <Ionicons name="arrow-back" size={24} color="#ffffff" />
            </TouchableOpacity>
          ),
          headerRight: () => (
            <TouchableOpacity onPress={handleShare} style={styles.headerIconButton}>
              <Ionicons name="share-social" size={22} color="#ffffff" />
            </TouchableOpacity>
          ),
        }}
      />

      <ScrollView style={styles.container} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <AnimeHeader anime={anime} />

        <StatusSelector
          userStatus={userStatus}
          userProgress={userProgress}
          totalEpisodes={anime.episodes}
          showStatusSelector={showStatusSelector}
          setShowStatusSelector={setShowStatusSelector}
          onUpdateStatus={handleUpdateStatus}
          onUpdateProgress={handleUpdateProgress}
          onRemove={handleRemove}
        />

        <QuickStats
          averageScore={anime.averageScore}
          episodes={anime.episodes}
          status={anime.status || 'UNKNOWN'}
        />

        <View style={styles.sectionContainer}>
          <Text style={styles.sectionHeader}>Sinopsis</Text>
          {loadingSpanishSynopsis ? (
            <View style={styles.synopsisLoading}>
              <ActivityIndicator size="small" color="#8b5cf6" />
              <Text style={styles.synopsisLoadingText}>Cargando sinopsis...</Text>
            </View>
          ) : (
            <Text style={styles.synopsisText}>{displaySynopsis}</Text>
          )}
        </View>

        {/* Separador visual entre Sinopsis y Ficha Técnica */}
        <View style={styles.divider} />

        <View style={styles.sectionContainer}>
          <Text style={styles.sectionHeader}>Ficha Técnica</Text>
          
          <View style={styles.specCard}>
            <View style={styles.specRow}>
              <Text style={styles.specLabel}>Tipo</Text>
              <Text style={styles.specValue}>{anime.type || 'N/A'}</Text>
            </View>
            
            <View style={styles.specRow}>
              <Text style={styles.specLabel}>Episodios</Text>
              <Text style={styles.specValue}>{anime.episodes || '??'}</Text>
            </View>
            
            <View style={styles.specRow}>
              <Text style={styles.specLabel}>Estado</Text>
              <Text style={styles.specValue}>{getStatusInSpanish(anime.status || 'UNKNOWN')}</Text>
            </View>

            <View style={styles.specRow}>
              <Text style={styles.specLabel}>Fecha de estreno</Text>
              <Text style={styles.specValue}>{formatDate(anime.startDate)}</Text>
            </View>

            <View style={styles.specRow}>
              <Text style={styles.specLabel}>Géneros</Text>
              <Text style={styles.specValue} numberOfLines={2}>
                {anime.genres?.length ? anime.genres.join(', ') : 'No especificados'}
              </Text>
            </View>

            {anime.format && (
              <View style={styles.specRow}>
                <Text style={styles.specLabel}>Formato</Text>
                <Text style={styles.specValue}>{anime.format}</Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      {/* Modal para ingresar progreso */}
      <Modal
        visible={showProgressModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowProgressModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {selectedStatus === 'Terminado' 
                  ? '¿Confirmar finalización?' 
                  : isUpdatingProgress
                    ? `Actualizar progreso de "${anime?.title.english || anime?.title.romaji}"`
                    : `¿Cuántos episodios has visto de "${anime?.title.english || anime?.title.romaji}"?`}
              </Text>
              <TouchableOpacity onPress={() => setShowProgressModal(false)}>
                <Ionicons name="close" size={24} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            {selectedStatus !== 'Terminado' && (
              <View style={styles.modalBody}>
                <Text style={styles.modalLabel}>
                  Episodios vistos (de {anime?.episodes || '??'})
                </Text>
                <TextInput
                  style={styles.modalInput}
                  value={progressInput}
                  onChangeText={setProgressInput}
                  keyboardType="numeric"
                  placeholder="0"
                  placeholderTextColor="#64748b"
                  maxLength={4}
                />
                {anime?.episodes && (
                  <TouchableOpacity 
                    style={styles.maxButton}
                    onPress={() => setProgressInput(anime.episodes?.toString() || '0')}
                  >
                    <Text style={styles.maxButtonText}>Completar todos</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            {selectedStatus === 'Terminado' && (
              <View style={styles.modalBody}>
                <Text style={styles.modalConfirmText}>
                  ¿Confirmas que has completado todos los {anime?.episodes || '??'} episodios?
                </Text>
              </View>
            )}

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => setShowProgressModal(false)}
              >
                <Text style={styles.modalButtonCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonConfirm]}
                onPress={handleProgressConfirm}
              >
                <Text style={styles.modalButtonConfirmText}>
                  {isUpdatingProgress ? 'Actualizar' : 'Guardar'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0b0f19',
  },
  scrollContent: {
    paddingBottom: 40,
  },
  skeletonContainer: {
    paddingHorizontal: 16,
    paddingTop: 100,
  },
  skeletonHeader: {
    width: width - 32,
    height: 200,
    backgroundColor: '#1e293b',
    borderRadius: 12,
    marginBottom: 16,
  },
  skeletonTitle: {
    width: width - 32,
    height: 28,
    backgroundColor: '#1e293b',
    borderRadius: 8,
    marginBottom: 16,
  },
  skeletonStats: {
    width: width - 32,
    height: 60,
    backgroundColor: '#1e293b',
    borderRadius: 8,
    marginBottom: 24,
  },
  skeletonText: {
    width: width - 32,
    height: 16,
    backgroundColor: '#1e293b',
    borderRadius: 4,
    marginBottom: 12,
  },
  skeletonTextShort: {
    width: (width - 32) * 0.7,
    height: 16,
    backgroundColor: '#1e293b',
    borderRadius: 4,
    marginBottom: 12,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#0b0f19',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#94a3b8',
    fontSize: 16,
    marginTop: 12,
  },
  errorContainer: {
    flex: 1,
    backgroundColor: '#0b0f19',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 24,
  },
  backButton: {
    backgroundColor: '#8b5cf6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#ffffff',
    fontWeight: 'bold',
  },
  headerIconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
    marginRight: 8,
    marginTop: Platform.OS === 'ios' ? 0 : 12,
  },
  sectionContainer: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  sectionHeader: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#8b5cf6',
    paddingLeft: 12,
  },
  synopsisText: {
    color: '#cbd5e1',
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'justify',
  },
  synopsisLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
  },
  synopsisLoadingText: {
    color: '#94a3b8',
    fontSize: 14,
  },
  divider: {
    height: 1,
    backgroundColor: '#1e293b',
    marginHorizontal: 16,
    marginVertical: 8,
  },
  specCard: {
    backgroundColor: '#111827',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginTop: 4,
  },
  specRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  specLabel: {
    color: '#8b5cf6',
    fontSize: 14,
    fontWeight: '600',
  },
  specValue: {
    color: '#94a3b8',
    fontSize: 14,
    fontWeight: '400',
    flex: 1,
    textAlign: 'right',
    marginLeft: 16,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    width: width - 48,
    maxWidth: 400,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  modalTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
    flex: 1,
    marginRight: 12,
  },
  modalBody: {
    padding: 20,
  },
  modalLabel: {
    color: '#94a3b8',
    fontSize: 14,
    marginBottom: 8,
  },
  modalInput: {
    backgroundColor: '#0f172a',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: '#ffffff',
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  maxButton: {
    marginTop: 12,
    alignSelf: 'flex-end',
  },
  maxButtonText: {
    color: '#8b5cf6',
    fontSize: 12,
    fontWeight: '600',
  },
  modalConfirmText: {
    color: '#cbd5e1',
    fontSize: 14,
    textAlign: 'center',
    marginVertical: 8,
  },
  modalFooter: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  modalButton: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
  },
  modalButtonCancel: {
    borderRightWidth: 1,
    borderRightColor: '#334155',
  },
  modalButtonCancelText: {
    color: '#94a3b8',
    fontSize: 16,
    fontWeight: '500',
  },
  modalButtonConfirm: {
    backgroundColor: '#8b5cf6',
  },
  modalButtonConfirmText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});