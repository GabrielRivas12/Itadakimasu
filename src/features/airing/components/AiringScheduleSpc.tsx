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
import { AiringSpcItem } from '../types/airingSpc';
import { RECENT_PROVIDER_TABS } from '../constants/recentProviders';
import { useResponsive } from '../../../hooks/useResponsive';
import { AiringScheduleSkeleton } from './AiringScheduleSkeleton';
import { AiringSpcSkeleton } from './AiringSpcSkeleton';
import { AiringSpcGridCard } from './AiringSpcGridCard';

const WEEKDAYS = ['Día 7', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

const RECENT_KEY = '__recent__';

// Día de la semana actual con la misma numeración del horario (1 = Lunes ... 7 = Domingo).
function getTodayDayNumber(): number {
  const jsDay = new Date().getDay(); // 0 = Domingo ... 6 = Sábado
  return jsDay === 0 ? 7 : jsDay;
}

interface AiringScheduleSpcProps {
  groups: ScheduleGroup[];
  loadingSchedule: boolean;
  recentEpisodes: AiringSpcItem[];
  recentProvider: string;
  recentProviderCounts: Record<string, number>;
  onSelectRecentProvider: (provider: string) => void;
  loadingRecent: boolean;
  onPressEpisode: (episode: ScheduleEpisode | AiringSpcItem) => void;
  onRefresh?: () => void;
  refreshing?: boolean;
  /** Encabezado web que se desplaza junto con el contenido. */
  header?: React.ReactNode;
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
  recentEpisodes = [],
  recentProvider,
  recentProviderCounts = {},
  onSelectRecentProvider,
  loadingRecent = false,
  onPressEpisode,
  onRefresh,
  refreshing = false,
  header,
}: AiringScheduleSpcProps) {
  const { getColumns, isWeb, getContentWidth, isMobile } = useResponsive();
  const columns = getColumns(2, 3, 4, 6);

  // Por defecto siempre se muestra Recientes (AnimeAV1)
  const [selectedKey, setSelectedKey] = useState<string>(RECENT_KEY);

  // Día de hoy: solo se usa como indicador visual mientras estamos en Recientes.
  const todayKey = useMemo(() => String(getTodayDayNumber()), []);

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
  const isRecentMode = selectedKey === RECENT_KEY;
  // En móvil nativo (Android/iOS) damos un poco más de aire a las secciones.
  const isNativeMobile = !isWeb && isMobile;

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
      {header}

      {/* Selector de pestañas: días del horario (el día de hoy se marca como indicador) */}
      <View
        style={[
          styles.tabsWrapper,
          isWeb && styles.tabsWrapperWeb,
          isNativeMobile && styles.tabsWrapperMobile,
        ]}
      >
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabsContainer}
        >
          {/* Pestañas de días del horario (Lunes, Martes, etc.) */}
          {scheduleTabs.map((tab) => {
            // El día seleccionado manda; si estamos en Recientes, hoy solo se marca
            // como indicador (estilo activo) sin disparar la selección.
            const isSelected = tab.key === selectedKey;
            const isTodayIndicator = selectedKey === RECENT_KEY && tab.key === todayKey;
            const isActive = isSelected || isTodayIndicator;

            return (
              <TouchableOpacity
                key={tab.key}
                style={[styles.dayTab, isActive && styles.dayTabActive]}
                onPress={() => handleTabPress(tab.key)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.dayTabText,
                    isActive && styles.dayTabTextActive,
                  ]}
                >
                  {tab.label}
                </Text>
                {tab.count > 0 && (
                  <View
                    style={[
                      styles.countBadge,
                      isActive && styles.countBadgeActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.countBadgeText,
                        isActive && styles.countBadgeTextActive,
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

      {/* Etiquetas de proveedor (siempre visibles): cada una carga su propio feed */}
      <View
        style={[
          styles.providerTabsWrapper,
          isNativeMobile && styles.providerTabsWrapperMobile,
        ]}
      >
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tabsContainer}
          >
            {RECENT_PROVIDER_TABS.map((provider) => {
              const isSelected = provider.id === recentProvider;
              const count = recentProviderCounts[provider.id] ?? 0;

              return (
                <TouchableOpacity
                  key={provider.id}
                  style={[
                    styles.providerTab,
                    isSelected && {
                      backgroundColor: provider.color,
                      borderColor: provider.color,
                    },
                  ]}
                  onPress={() => {
                    // Cambiar de proveedor vuelve a Recientes y carga su feed
                    setSelectedKey(RECENT_KEY);
                    onSelectRecentProvider(provider.id);
                  }}
                  activeOpacity={0.7}
                >
                  <View
                    style={[
                      styles.providerDot,
                      { backgroundColor: isSelected ? '#ffffff' : provider.color },
                    ]}
                  />
                  <Text
                    style={[
                      styles.providerTabText,
                      isSelected && styles.providerTabTextActive,
                    ]}
                  >
                    {provider.label}
                  </Text>
                  {count > 0 && (
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
                        {count}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

      {/* Contenido: Recientes por proveedor o el horario del día seleccionado */}
      {isRecentMode ? (
        loadingRecent && recentEpisodes.length === 0 ? (
          <AiringSpcSkeleton />
        ) : recentEpisodes.length > 0 ? (
          <View style={[styles.cardsGrid, isNativeMobile && styles.cardsGridMobile]}>
            {recentEpisodes.map((item, index) => (
              <AiringSpcGridCard
                key={`${item.provider}-${item.slug}-${item.episode}-${index}`}
                item={item}
                onPress={onPressEpisode}
                width={cardWidth}
              />
            ))}
          </View>
        ) : (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No hay episodios recientes disponibles.</Text>
          </View>
        )
      ) : loadingSchedule && groups.length === 0 ? (
        <AiringScheduleSkeleton />
      ) : scheduleEpisodes.length > 0 ? (
        <View style={[styles.cardsGrid, isNativeMobile && styles.cardsGridMobile]}>
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
    paddingTop: 10,
    marginBottom: 4,
  },
  tabsWrapperWeb: {
    marginBottom: 16,
  },
  tabsWrapperMobile: {
    paddingTop: 12,
    paddingBottom: 2,
    marginBottom: 8,
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
  providerTabsWrapper: {
    backgroundColor: '#0b0f19',
    paddingBottom: 10,
    marginBottom: 4,
  },
  providerTabsWrapperMobile: {
    paddingTop: 6,
    paddingBottom: 14,
    marginBottom: 8,
  },
  providerTab: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111827',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#334155',
    gap: 6,
  },
  providerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  providerTabText: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '700',
  },
  providerTabTextActive: {
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
  cardsGridMobile: {
    paddingHorizontal: 8,
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
