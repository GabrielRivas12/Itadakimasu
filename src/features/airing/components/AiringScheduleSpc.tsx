import React, { useState, useMemo, memo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Image,
  RefreshControl,
} from 'react-native';
import { ScheduleGroup, ScheduleEpisode, buildImageProxyUrl } from '../../../../services/anime1v';
import { AiringSpcItem, ProviderSection } from '../types/airingSpc';
import { useResponsive } from '../../../hooks/useResponsive';
import { AiringScheduleSkeleton } from './AiringScheduleSkeleton';
import { AiringSpcSkeleton } from './AiringSpcSkeleton';
import { AiringProviderSections } from './AiringProviderSections';

const WEEKDAYS = ['Día 7', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

const RECENT_KEY = '__recent__';

interface AiringScheduleSpcProps {
  groups: ScheduleGroup[];
  loadingSchedule: boolean;
  recentSections: ProviderSection[];
  loadingRecent: boolean;
  recentEpisodesCount: number;
  onPressEpisode: (episode: ScheduleEpisode | AiringSpcItem) => void;
  onRefresh?: () => void;
  refreshing?: boolean;
}

interface DayTabEntry {
  key: string;
  day: number;
  label: string;
  count: number;
}

function sortEpisodesByTime(list: ScheduleEpisode[]): ScheduleEpisode[] {
  return [...list].sort((a, b) => {
    const ta = a.time || '';
    const tb = b.time || '';
    return tb.localeCompare(ta);
  });
}

export const AiringScheduleSpc = memo(function AiringScheduleSpc({
  groups = [],
  loadingSchedule = false,
  recentSections = [],
  loadingRecent = false,
  recentEpisodesCount = 0,
  onPressEpisode,
  onRefresh,
  refreshing = false,
}: AiringScheduleSpcProps) {
  const { getColumns, isWeb, getContentWidth, isMobile } = useResponsive();
  const columns = getColumns(2, 3, 4, 6);

  // Por defecto siempre carga desde recent-episodes
  const [selectedKey, setSelectedKey] = useState<string>(RECENT_KEY);

  // Construye las pestañas de horario: una por día de la semana con su nombre.
  const scheduleTabs = useMemo<DayTabEntry[]>(() => {
    return groups.map((group, index) => {
      const day = group.day ?? index + 1;
      return {
        key: String(day),
        day,
        label: group.dayName || WEEKDAYS[day] || `Día ${index + 1}`,
        count: group.episodes?.length || 0,
      };
    });
  }, [groups]);

  const activeGroup = useMemo(() => {
    if (selectedKey === RECENT_KEY) return null;
    return groups.find((g) => String(g.day) === selectedKey) || null;
  }, [groups, selectedKey]);

  const scheduleEpisodes = useMemo(
    () => (activeGroup ? sortEpisodesByTime(activeGroup.episodes || []) : []),
    [activeGroup]
  );

  const handleTabPress = (tabKey: string) => {
    if (selectedKey === tabKey && tabKey !== RECENT_KEY) {
      // Si toca de nuevo la fecha de horario seleccionada, vuelve a Recientes
      setSelectedKey(RECENT_KEY);
    } else {
      setSelectedKey(tabKey);
    }
  };

  const cardWidth = `${100 / columns - 2}%` as any;

  return (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={[
        styles.scrollContent,
        isWeb && { maxWidth: getContentWidth(), alignSelf: 'center', width: '100%' },
        isWeb && isMobile && { paddingHorizontal: 8 },
      ]}
      showsVerticalScrollIndicator={false}
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#8b5cf6"
          />
        ) : undefined
      }
    >
      {/* Selector de pestañas: Recientes + Días del horario */}
      <View style={styles.tabsWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabsContainer}
        >
          {/* Pestaña: Recientes (siempre visible) */}
          <TouchableOpacity
            style={[
              styles.dayTab,
              selectedKey === RECENT_KEY && styles.dayTabActive,
            ]}
            onPress={() => setSelectedKey(RECENT_KEY)}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.dayTabText,
                selectedKey === RECENT_KEY && styles.dayTabTextActive,
              ]}
            >
              Recientes
            </Text>
            {recentEpisodesCount > 0 && (
              <View
                style={[
                  styles.countBadge,
                  selectedKey === RECENT_KEY && styles.countBadgeActive,
                ]}
              >
                <Text
                  style={[
                    styles.countBadgeText,
                    selectedKey === RECENT_KEY && styles.countBadgeTextActive,
                  ]}
                >
                  {recentEpisodesCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Pestañas de días del horario (Lunes, Martes, etc.) */}
          {scheduleTabs.map((tab) => {
            const isSelected = tab.key === selectedKey;

            return (
              <TouchableOpacity
                key={tab.key}
                style={[styles.dayTab, isSelected && styles.dayTabActive]}
                onPress={() => handleTabPress(tab.key)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.dayTabText,
                    isSelected && styles.dayTabTextActive,
                  ]}
                >
                  {tab.label}
                </Text>
                {tab.count > 0 && (
                  <View
                    style={[
                      styles.countBadge,
                      isSelected && styles.countBadgeActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.countBadgeText,
                        isSelected && styles.countBadgeTextActive,
                      ]}
                    >
                      {tab.count}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Contenido Condicional */}
      {selectedKey === RECENT_KEY ? (
        // Modo Recientes: Cards separadas por secciones de proveedores
        loadingRecent && recentEpisodesCount === 0 ? (
          <AiringSpcSkeleton />
        ) : (
          <AiringProviderSections
            sections={recentSections}
            onPressItem={onPressEpisode}
            columns={columns}
            emptyMessage="No hay episodios recientes disponibles."
          />
        )
      ) : (
        // Modo Día de Horario: Episodios programados para el día seleccionado
        loadingSchedule && groups.length === 0 ? (
          <AiringScheduleSkeleton />
        ) : scheduleEpisodes.length > 0 ? (
          <View style={styles.cardsGrid}>
            {scheduleEpisodes.map((item, index) => {
              const imageUri = item.image ? buildImageProxyUrl(item.image) : null;
              return (
                <TouchableOpacity
                  key={`${item.slug}-${item.episode}-${index}`}
                  style={[styles.card, { width: cardWidth }]}
                  onPress={() => onPressEpisode(item)}
                  activeOpacity={0.8}
                >
                  <View style={styles.imageWrapper}>
                    {imageUri ? (
                      <Image
                        source={{ uri: imageUri }}
                        style={styles.cardImage}
                        fadeDuration={300}
                      />
                    ) : (
                      <View style={styles.cardPlaceholder} />
                    )}
                    <View style={styles.cardBadge}>
                      <Text style={styles.cardBadgeText}>EP {item.episode}</Text>
                    </View>
                    {item.predicted && (
                      <View style={styles.predictedBadge}>
                        <Text style={styles.predictedBadgeText}>Próximo</Text>
                      </View>
                    )}
                  </View>
                  <View style={styles.cardContent}>
                    <Text style={styles.cardTitle} numberOfLines={2}>
                      {item.title}
                    </Text>
                    {(!!item.category || !!item.dayOfWeek) && (
                      <View style={styles.cardMetaRow}>
                        {!!item.category && (
                          <Text style={styles.cardCategoryText} numberOfLines={1}>
                            {item.category}
                          </Text>
                        )}
                        {!!item.dayOfWeek && (
                          <Text style={styles.cardDayText}>{item.dayOfWeek}</Text>
                        )}
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        ) : (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No hay episodios programados para este día.</Text>
          </View>
        )
      )}
    </ScrollView>
  );
});

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 32,
  },
  tabsWrapper: {
    backgroundColor: '#0b0f19',
    paddingVertical: 10,
    marginBottom: 4,
  },
  tabsContainer: {
    paddingHorizontal: 12,
    gap: 8,
  },
  dayTab: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#334155',
    gap: 6,
  },
  dayTabActive: {
    backgroundColor: '#8b5cf6',
    borderColor: '#8b5cf6',
  },
  dayTabText: {
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: '600',
  },
  dayTabTextActive: {
    color: '#ffffff',
  },
  countBadge: {
    backgroundColor: '#334155',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  countBadgeActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  countBadgeText: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '700',
  },
  countBadgeTextActive: {
    color: '#ffffff',
  },
  cardsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    paddingHorizontal: 4,
  },
  card: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    marginHorizontal: '1%',
    marginBottom: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#334155',
  },
  imageWrapper: {
    position: 'relative',
  },
  cardImage: {
    width: '100%',
    aspectRatio: 2 / 3,
  },
  cardPlaceholder: {
    width: '100%',
    aspectRatio: 2 / 3,
    backgroundColor: '#1e293b',
  },
  cardBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  cardBadgeText: {
    color: '#f97316',
    fontSize: 10,
    fontWeight: 'bold',
  },
  predictedBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(139, 92, 246, 0.9)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  predictedBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  cardContent: {
    padding: 10,
  },
  cardTitle: {
    color: '#f8fafc',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 4,
    lineHeight: 18,
  },
  cardMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  cardCategoryText: {
    color: '#a78bfa',
    fontSize: 11,
    fontWeight: '700',
    flexShrink: 1,
  },
  cardDayText: {
    color: '#8b5cf6',
    fontSize: 11,
    fontWeight: '500',
  },
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    color: '#64748b',
    fontSize: 14,
    textAlign: 'center',
  },
});
