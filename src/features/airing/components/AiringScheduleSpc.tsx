import React, { useState, useMemo, memo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Image,
  FlatList,
  RefreshControl,
  Platform,
} from 'react-native';
import { ScheduleGroup, ScheduleEpisode, buildImageProxyUrl } from '../../../../services/anime1v';
import { useResponsive } from '../../../hooks/useResponsive';
import { AiringScheduleSkeleton } from './AiringScheduleSkeleton';

interface AiringScheduleSpcProps {
  groups: ScheduleGroup[];
  loading: boolean;
  onPressEpisode: (episode: ScheduleEpisode) => void;
  onRefresh?: () => void;
  refreshing?: boolean;
}

interface DayTabEntry {
  key: string;
  date: Date;
  originIndex: number;
  tabLabel: string;
}

function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

function dateToMMDD(date: Date): string {
  return `${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

// Devuelve la fecha calendario de hoy en el huso local (sin hora).
function todayOnly(now: Date): Date {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
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
  loading = false,
  onPressEpisode,
  onRefresh,
  refreshing = false,
}: AiringScheduleSpcProps) {
  const { getColumns, isWeb, getContentWidth, isMobile } = useResponsive();
  const columns = getColumns(2, 3, 4, 6);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  // Construye las pestañas ordenadas: Hoy, Ayer, luego fechas ascendentes.
  const tabs = useMemo<DayTabEntry[]>(() => {
    if (groups.length === 0) return [];
    const now = new Date();
    const today = todayOnly(now);
    const todayJsDay = now.getDay(); // 0=Domingo
    const todayApiDay = ((todayJsDay + 6) % 7) + 1; // Lunes=1..Domingo=7

    const entries: DayTabEntry[] = groups.map((group, index) => {
      const apiDay = group.day ?? index + 1;
      const diff = apiDay - todayApiDay;
      const date = new Date(today);
      date.setDate(today.getDate() + diff);
      return {
        key: group.day ? String(group.day) : `${index}`,
        date,
        originIndex: index,
        tabLabel: '',
      };
    });

    // Filtra fechas pasadas anteriores a ayer (solo se muestran Ayer, Hoy y futuros).
    const filtered = entries.filter((e) => e.date.getTime() >= today.getTime() - 86400000);

    // Ordena: Hoy primero (diff 0), Ayer segundo (diff -1), luego ascendente por fecha.
    filtered.sort((a, b) => {
      const aDiff = a.date.getTime() - today.getTime();
      const bDiff = b.date.getTime() - today.getTime();
      if (aDiff === 0) return -1;
      if (bDiff === 0) return 1;
      if (aDiff === -86400000) return -1;
      if (bDiff === -86400000) return 1;
      return a.date.getTime() - b.date.getTime();
    });

    filtered.forEach((entry) => {
      const diff = entry.date.getTime() - today.getTime();
      if (diff === 0) {
        entry.tabLabel = 'Hoy';
      } else if (diff === -86400000) {
        entry.tabLabel = 'Ayer';
      } else {
        entry.tabLabel = dateToMMDD(entry.date);
      }
    });

    return filtered;
  }, [groups]);

  const activeEntry = useMemo(() => {
    if (tabs.length === 0) return null;
    const selected =
      tabs.find((t) => t.key === selectedKey) ||
      tabs.find((t) => t.tabLabel === 'Hoy') ||
      tabs[0];
    return selected;
  }, [tabs, selectedKey]);

  const activeGroup = useMemo(() => {
    if (activeEntry == null) return null;
    return groups[activeEntry.originIndex] || null;
  }, [groups, activeEntry]);

  const episodes = useMemo(
    () => (activeGroup ? sortEpisodesByTime(activeGroup.episodes || []) : []),
    [activeGroup]
  );

  if (loading && groups.length === 0) {
    return (
      <View style={[
        styles.flex,
        isWeb && { maxWidth: getContentWidth(), alignSelf: 'center', width: '100%' },
      ]}>
        <AiringScheduleSkeleton />
      </View>
    );
  }

  return (
    <View style={styles.flex}>
      {/* Grid de episodios del día seleccionado */}
      {episodes.length > 0 ? (
        <FlatList
          key={`schedule-col-${columns}`}
          data={episodes}
          keyExtractor={(item, index) => `${item.slug}-${item.episode}-${index}`}
          numColumns={columns}
          contentContainerStyle={[
            styles.gridContent,
            isWeb && { maxWidth: getContentWidth(), alignSelf: 'center', width: '100%' },
            isWeb && isMobile && { paddingHorizontal: 8 },
          ]}
          columnWrapperStyle={styles.gridRow}
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
          ListHeaderComponent={() => (
            /* Selector de días / pestañas */
            groups.length > 0 ? (
              <View style={styles.tabsWrapper}>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={[
                    styles.tabsContainer,
                    isWeb && { maxWidth: getContentWidth(), alignSelf: 'center' },
                  ]}
                >
                  {tabs.map((tab) => {
                    const isSelected = tab.key === activeEntry?.key;
                    const group = groups[tab.originIndex];
                    const count = group?.episodes?.length || 0;
                    return (
                      <TouchableOpacity
                        key={`${tab.key}-${tab.date.toISOString()}`}
                        style={[styles.dayTab, isSelected && styles.dayTabActive]}
                        onPress={() => setSelectedKey(tab.key)}
                        activeOpacity={0.7}
                      >
                        <Text style={[styles.dayTabText, isSelected && styles.dayTabTextActive]}>
                          {tab.tabLabel}
                        </Text>
                        {count > 0 && (
                          <View
                            style={[styles.countBadge, isSelected && styles.countBadgeActive]}
                          >
                            <Text
                              style={[styles.countBadgeText, isSelected && styles.countBadgeTextActive]}
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
            ) : null
          )}
          renderItem={({ item }) => {
            const imageUri = item.image ? buildImageProxyUrl(item.image) : null;
            return (
              <TouchableOpacity
                style={[styles.card, { width: `${100 / columns - 2}%` }]}
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
          }}
        />
      ) : (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No hay episodios programados para este día.</Text>
        </View>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  tabsWrapper: {
    backgroundColor: '#0b0f19',
    paddingBottom: 10,
  },
  tabsContainer: {
    paddingHorizontal: 16,
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
  gridContent: {
    paddingHorizontal: 10,
    paddingBottom: 24,
    paddingTop: 4,
  },
  gridRow: {
    justifyContent: 'flex-start',
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
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
  },
  emptyText: {
    color: '#64748b',
    fontSize: 14,
    textAlign: 'center',
  },
});
