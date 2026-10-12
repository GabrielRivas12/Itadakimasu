import React, { useState, useMemo, memo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { AiringSpcItem, ProviderSection } from '../types/airingSpc';
import { AiringSpcGridCard } from './AiringSpcGridCard';

interface AiringProviderSectionsProps {
  sections: ProviderSection[];
  onPressItem: (item: AiringSpcItem) => void;
  columns: number;
  emptyMessage?: string;
}

export function getProviderColor(provider: string): string {
  const lower = (provider || '').toLowerCase();
  if (lower.includes('animeav1')) return '#3b82f6'; // Blue
  if (lower.includes('tioanime')) return '#f97316'; // Orange
  if (lower.includes('monoschinos')) return '#10b981'; // Emerald
  if (lower.includes('.com')) return '#f43f5e'; // Rose
  if (lower.includes('.moe')) return '#a855f7'; // Purple
  if (lower.includes('.io')) return '#ec4899'; // Pink
  return '#8b5cf6'; // Violet default
}

export const AiringProviderSections = memo(function AiringProviderSections({
  sections,
  onPressItem,
  columns,
  emptyMessage = 'No hay episodios disponibles.',
}: AiringProviderSectionsProps) {
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);

  const totalCount = useMemo(() => {
    return sections.reduce((acc, sec) => acc + sec.items.length, 0);
  }, [sections]);

  const displayedSections = useMemo(() => {
    if (!selectedProvider) return sections;
    return sections.filter((s) => s.provider === selectedProvider);
  }, [sections, selectedProvider]);

  if (sections.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>{emptyMessage}</Text>
      </View>
    );
  }

  const cardWidth = `${100 / columns - 2}%` as any;

  return (
    <View style={styles.container}>
      {/* Selector / Filtro rápido de proveedores (si hay más de 1) */}
      {sections.length > 1 && (
        <View style={styles.filterWrapper}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterScroll}
          >
            <TouchableOpacity
              style={[
                styles.filterChip,
                selectedProvider === null && styles.filterChipActive,
              ]}
              onPress={() => setSelectedProvider(null)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.filterChipText,
                  selectedProvider === null && styles.filterChipTextActive,
                ]}
              >
                Todos
              </Text>
              <View
                style={[
                  styles.chipBadge,
                  selectedProvider === null && styles.chipBadgeActive,
                ]}
              >
                <Text
                  style={[
                    styles.chipBadgeText,
                    selectedProvider === null && styles.chipBadgeTextActive,
                  ]}
                >
                  {totalCount}
                </Text>
              </View>
            </TouchableOpacity>

            {sections.map((section) => {
              const isSelected = selectedProvider === section.provider;
              const providerColor = getProviderColor(section.provider);

              return (
                <TouchableOpacity
                  key={section.provider}
                  style={[
                    styles.filterChip,
                    isSelected && {
                      backgroundColor: providerColor,
                      borderColor: providerColor,
                    },
                  ]}
                  onPress={() =>
                    setSelectedProvider(isSelected ? null : section.provider)
                  }
                  activeOpacity={0.7}
                >
                  <View
                    style={[
                      styles.filterDot,
                      { backgroundColor: isSelected ? '#ffffff' : providerColor },
                    ]}
                  />
                  <Text
                    style={[
                      styles.filterChipText,
                      isSelected && styles.filterChipTextActive,
                    ]}
                  >
                    {section.provider}
                  </Text>
                  <View
                    style={[
                      styles.chipBadge,
                      isSelected && styles.chipBadgeActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.chipBadgeText,
                        isSelected && styles.chipBadgeTextActive,
                      ]}
                    >
                      {section.items.length}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* Secciones de Proveedores con sus Cards */}
      {displayedSections.map((section) => {
        const providerColor = getProviderColor(section.provider);

        return (
          <View key={section.provider} style={styles.sectionBlock}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionHeaderLeft}>
                <View
                  style={[styles.sectionDot, { backgroundColor: providerColor }]}
                />
                <Text style={styles.sectionTitle}>{section.provider}</Text>
              </View>
              <View style={styles.sectionBadge}>
                <Text style={styles.sectionBadgeText}>
                  {section.items.length} {section.items.length === 1 ? 'episodio' : 'episodios'}
                </Text>
              </View>
            </View>

            <View style={styles.cardsGrid}>
              {section.items.map((item, index) => (
                <AiringSpcGridCard
                  key={`${item.provider}-${item.slug}-${item.episode}-${index}`}
                  item={item}
                  onPress={onPressItem}
                  width={cardWidth}
                />
              ))}
            </View>
          </View>
        );
      })}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  filterWrapper: {
    paddingVertical: 8,
    paddingHorizontal: 4,
    marginBottom: 8,
  },
  filterScroll: {
    gap: 8,
    paddingHorizontal: 6,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#334155',
    gap: 6,
  },
  filterChipActive: {
    backgroundColor: '#8b5cf6',
    borderColor: '#8b5cf6',
  },
  filterDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  filterChipText: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '600',
  },
  filterChipTextActive: {
    color: '#ffffff',
  },
  chipBadge: {
    backgroundColor: '#334155',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  chipBadgeActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  chipBadgeText: {
    color: '#94a3b8',
    fontSize: 10,
    fontWeight: '700',
  },
  chipBadgeTextActive: {
    color: '#ffffff',
  },
  sectionBlock: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    marginBottom: 12,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  sectionTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  sectionBadge: {
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  sectionBadgeText: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '600',
  },
  cardsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
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
