import React, { memo } from 'react';
import {
  StyleSheet,
  View,
  FlatList,
  ActivityIndicator,
  Text,
  TouchableOpacity as RNTouchableOpacity,
} from 'react-native';
import { AiringSpcGridCard } from '../components/AiringSpcGridCard';
import { AiringSpcSkeleton } from '../components/AiringSpcSkeleton';
import { AiringScheduleSpc } from '../components/AiringScheduleSpc';
import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { useAiringSpc } from '../hooks/useAiringSpc';
import { useResponsive } from '../../../hooks/useResponsive';
import { usePortraitOrientation } from '../../../hooks/usePortraitOrientation';

export const AiringSpcPage = memo(function AiringSpcPage() {
  usePortraitOrientation();
  const {
    results,
    loadingAdult,
    loadingMore,
    scheduleGroups,
    loadingSchedule,
    refreshingSchedule,
    refreshSchedule,
    isAdult,
    isAdultSettingEnabled,
    toggleAdult,
    handleLoadMore,
    handleAnimePress,
    handleScheduleEpisodePress,
  } = useAiringSpc();

  const { getColumns, isWeb, getContentWidth, isMobile } = useResponsive();
  const columns = getColumns(2, 3, 4, 6);

  return (
    <View style={styles.container}>
      <Tabs.Screen
        options={{
          headerRight: () =>
            !isWeb && isAdultSettingEnabled ? (
              <View style={styles.headerRightWrap}>
                <RNTouchableOpacity
                  style={[styles.r18Button, isAdult && styles.r18ButtonActive]}
                  onPress={toggleAdult}
                >
                  <Text style={[styles.r18Text, isAdult && styles.r18TextActive]}>R18</Text>
                  <Ionicons
                    name={isAdult ? "eye" : "eye-off"}
                    size={18}
                    color={isAdult ? "#ffffff" : "#94a3b8"}
                  />
                </RNTouchableOpacity>
              </View>
            ) : null,
        }}
      />
      {isWeb && (
        <View style={[
          styles.header,
          isWeb && { maxWidth: getContentWidth(), alignSelf: 'center', width: '100%' },
          isWeb && isMobile && { paddingTop: 20, paddingHorizontal: 16 }
        ]}>
          <View style={styles.headerTop}>
            <View>
              <Text style={styles.headerTitle}>En Emisión</Text>
              <Text style={styles.headerSubtitle}>
                {isAdult ? 'Contenido para Adultos' : 'Calendario de emisión'}
              </Text>
            </View>
            {isAdultSettingEnabled && (
              <RNTouchableOpacity
                style={[styles.r18Button, isAdult && styles.r18ButtonActive]}
                onPress={toggleAdult}
              >
                <Text style={[styles.r18Text, isAdult && styles.r18TextActive]}>R18</Text>
                <Ionicons
                  name={isAdult ? "eye" : "eye-off"}
                  size={18}
                  color={isAdult ? "#ffffff" : "#94a3b8"}
                />
              </RNTouchableOpacity>
            )}
          </View>
        </View>
      )}

      {isAdult ? (
        // Modo R18: Grid de episodios de HentaiLA
        loadingAdult && results.length === 0 ? (
          <View style={[
            styles.flex,
            isWeb && { maxWidth: getContentWidth(), alignSelf: 'center', width: '100%' },
          ]}>
            <AiringSpcSkeleton />
          </View>
        ) : (
          <View style={styles.flex}>
            <FlatList
              key={`adult-col-${columns}`}
              data={results}
              keyExtractor={(item, index) => `${item.slug}-${item.episode}-${index}`}
              numColumns={columns}
              contentContainerStyle={[
                styles.gridContent,
                isWeb && { maxWidth: getContentWidth(), alignSelf: 'center', width: '100%' },
                isWeb && isMobile && { paddingHorizontal: 8 }
              ]}
              columnWrapperStyle={styles.gridRow}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => (
                <AiringSpcGridCard
                  item={item}
                  onPress={handleAnimePress}
                  width={`${100 / columns - 2}%`}
                />
              )}
              onEndReached={handleLoadMore}
              onEndReachedThreshold={0.5}
              ListFooterComponent={() =>
                loadingMore ? (
                  <View style={styles.footerLoader}>
                    <ActivityIndicator size="small" color="#8b5cf6" />
                  </View>
                ) : null
              }
            />
          </View>
        )
      ) : (
        // Modo Normal: Calendario de emisión de SenpaiCore
        <AiringScheduleSpc
          groups={scheduleGroups}
          loading={loadingSchedule}
          onPressEpisode={handleScheduleEpisodePress}
          onRefresh={refreshSchedule}
          refreshing={refreshingSchedule}
        />
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0b0f19',
  },
  flex: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 45,
    paddingBottom: 15,
    backgroundColor: '#0b0f19',
  },
  headerTitle: {
    color: '#ffffff',
    fontSize: 28,
    fontWeight: 'bold',
  },
  headerSubtitle: {
    color: '#94a3b8',
    fontSize: 14,
    marginTop: 4,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerRightWrap: {
    marginRight: 16,
  },
  r18Button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
  },
  r18ButtonActive: {
    backgroundColor: '#f43f5e',
    borderColor: '#fb7185',
  },
  r18Text: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: 'bold',
  },
  r18TextActive: {
    color: '#ffffff',
  },
  gridContent: {
    paddingHorizontal: 10,
    paddingBottom: 24,
    paddingTop: 8,
  },
  gridRow: {
    justifyContent: 'flex-start',
  },
  footerLoader: {
    paddingVertical: 20,
    alignItems: 'center',
  },
});