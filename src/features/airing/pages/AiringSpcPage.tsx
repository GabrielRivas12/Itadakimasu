import React, { memo } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  RefreshControl,
  Text,
  TouchableOpacity as RNTouchableOpacity,
} from 'react-native';
import { AiringSpcSkeleton } from '../components/AiringSpcSkeleton';
import { AiringScheduleSpc } from '../components/AiringScheduleSpc';
import { AiringProviderSections } from '../components/AiringProviderSections';
import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { useAiringSpc } from '../hooks/useAiringSpc';
import { useResponsive } from '../../../hooks/useResponsive';
import { usePortraitOrientation } from '../../../hooks/usePortraitOrientation';

export const AiringSpcPage = memo(function AiringSpcPage() {
  usePortraitOrientation();
  const {
    // Normal mode
    recentEpisodes,
    recentProvider,
    recentProviderCounts,
    selectRecentProvider,
    loadingRecent,
    scheduleGroups,
    loadingSchedule,

    // Adult mode
    adultEpisodes,
    adultSections,
    loadingAdult,

    // Controls
    isAdult,
    isAdultSettingEnabled,
    toggleAdult,
    refreshing,
    refreshData,
    handleAnimePress,
  } = useAiringSpc();

  const { getColumns, isWeb, getContentWidth, isMobile } = useResponsive();
  const columns = getColumns(2, 3, 4, 6);

  // Encabezado web (solo escritorio/tablet): en web móvil se usa el header nativo.
  const webHeader = isWeb && !isMobile ? (
    <View style={styles.header}>
      <View style={styles.headerTop}>
        <View>
          <Text style={styles.headerTitle}>En Emisión</Text>
          <Text style={styles.headerSubtitle}>
            {isAdult ? 'Contenido para Adultos (+18)' : 'Episodios recientes y calendario'}
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
  ) : null;

  return (
    <View style={styles.container}>
      <Tabs.Screen
        options={{
          headerRight: () =>
            isAdultSettingEnabled ? (
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
      {isAdult ? (
        // Modo R18: Episodios de HentaiLA separados por proveedor
        loadingAdult && adultEpisodes.length === 0 ? (
          <View
            style={[
              styles.flex,
              isWeb && { maxWidth: getContentWidth(), alignSelf: 'center', width: '100%' },
            ]}
          >
            <AiringSpcSkeleton />
          </View>
        ) : (
          <ScrollView
            style={styles.flex}
            contentContainerStyle={[
              styles.scrollContent,
              isWeb && { maxWidth: getContentWidth(), alignSelf: 'center', width: '100%' },
              isWeb && isMobile && { paddingHorizontal: 8 },
            ]}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={refreshData}
                tintColor="#f43f5e"
              />
            }
          >
            {webHeader}
            <AiringProviderSections
              sections={adultSections}
              onPressItem={handleAnimePress}
              columns={columns}
              emptyMessage="No hay episodios para adultos disponibles."
            />
          </ScrollView>
        )
      ) : (
        // Modo Normal: Recientes + Calendario de emisión interactivo por día de la semana
        <AiringScheduleSpc
          header={webHeader}
          groups={scheduleGroups}
          loadingSchedule={loadingSchedule}
          recentEpisodes={recentEpisodes}
          recentProvider={recentProvider}
          recentProviderCounts={recentProviderCounts}
          onSelectRecentProvider={selectRecentProvider}
          loadingRecent={loadingRecent}
          onPressEpisode={handleAnimePress}
          onRefresh={refreshData}
          refreshing={refreshing}
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
  scrollContent: {
    paddingBottom: 32,
    paddingTop: 8,
  },
  header: {
    paddingHorizontal: 12,
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
});