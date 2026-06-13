import React from 'react';
import { StyleSheet, ScrollView, View, Text } from 'react-native';
import { HeroSection } from '../components/HeroSection';
import { useLanding } from '../hooks/useLanding';
import { useResponsive } from '../../../hooks/useResponsive';
import { Ionicons } from '@expo/vector-icons';

export function LandingPage() {
  const { bannerAnimes, isLoading } = useLanding();
  const { isMobile, isTablet } = useResponsive();

  return (
    <ScrollView style={styles.container} bounces={false}>
      <HeroSection bannerAnimes={bannerAnimes} />

      {/* Features Section */}
      <View style={[styles.featuresContainer, isMobile && { marginTop: 0 }]}>
        <Text style={[styles.featuresTitle, { fontSize: isMobile ? 28 : 36 }]}>
          Explora funciones increíbles
        </Text>
        <Text style={[styles.featuresSubtitle, { fontSize: isMobile ? 16 : 18 }]}>
          Todo lo que necesitas para disfrutar de tu pasión por el anime en un solo lugar.
        </Text>

        <View style={styles.featuresGrid}>
          <FeatureCard
            icon="library"
            title="Biblioteca Personal"
            description="Organiza tu colección con estados personalizados: Viendo, Terminado o Por Ver. Mantén tu progreso siempre al día."
            color="#8b5cf6"
          />
          <FeatureCard
            icon="search-circle"
            title="Descubrimiento Inteligente"
            description="Encuentra tu próximo anime favorito usando filtros avanzados por género, año y popularidad de forma rápida."
            color="#3b82f6"
          />
          <FeatureCard
            icon="stats-chart"
            title="Estadísticas de Usuario"
            description="Lleva un registro detallado de tus hábitos y tiempo dedicado. Esta función estará disponible muy pronto."
            color="#10b981"
            isComingSoon
          />
        </View>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>© 2026 Itadakimasu! - Tu experiencia anime definitiva.</Text>
      </View>
    </ScrollView>
  );
}

const FeatureCard = ({ icon, title, description, color, isComingSoon }: { icon: any, title: string, description: string, color: string, isComingSoon?: boolean }) => {
  const { isMobile } = useResponsive();

  return (
    <View style={[styles.card, isMobile && { width: '100%' }]}>
      <View style={[styles.cardIconWrapper, { backgroundColor: `${color}15` }]}>
        <Ionicons name={icon} size={32} color={color} />
      </View>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>{title}</Text>
        {isComingSoon && (
          <View style={styles.comingSoonBadge}>
            <Text style={styles.comingSoonText}>PRÓXIMAMENTE</Text>
          </View>
        )}
      </View>
      <Text style={styles.cardDescription}>{description}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0b0f19',
  },
  featuresContainer: {
    marginTop: 20,
    paddingBottom: 100,
    paddingHorizontal: 20,
    maxWidth: 1200,
    alignSelf: 'center',
    width: '100%',
  },
  featuresTitle: {
    color: '#ffffff',
    fontSize: 36,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 16,
  },
  featuresSubtitle: {
    color: '#94a3b8',
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 60,
    maxWidth: 700,
    alignSelf: 'center',
  },
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 24,
  },
  card: {
    backgroundColor: '#161b2c',
    padding: 32,
    borderRadius: 24,
    width: 360,
    borderWidth: 1,
    borderColor: '#1e293b',
    // @ts-ignore
    transition: 'transform 0.3s ease',
  },
  cardIconWrapper: {
    width: 64,
    height: 64,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    flexWrap: 'wrap',
    gap: 8,
  },
  cardTitle: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  comingSoonBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  comingSoonText: {
    color: '#10b981',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  cardDescription: {
    color: '#94a3b8',
    fontSize: 15,
    lineHeight: 24,
  },
  footer: {
    paddingVertical: 48,
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
    alignItems: 'center',
  },
  footerText: {
    color: '#475569',
    fontSize: 14,
  },
});
