import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Image, Dimensions, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Anime } from '../../../../services/anilist';
import { useResponsive } from '../../../hooks/useResponsive';

interface HeroSectionProps {
  bannerAnimes: Anime[];
}

export const HeroSection: React.FC<HeroSectionProps> = ({ bannerAnimes }) => {
  const router = useRouter();
  const { isMobile, isTablet } = useResponsive();
  const [currentIndex, setCurrentIndex] = useState(0);
  const fadeAnim = React.useRef(new Animated.Value(1)).current;
  
  // Efecto de carrusel suave
  useEffect(() => {
    if (bannerAnimes.length <= 1) return;

    const interval = setInterval(() => {
      // Animación de salida
      Animated.timing(fadeAnim, {
        toValue: 0.3,
        duration: 1000,
        useNativeDriver: true,
      }).start(() => {
        setCurrentIndex((prev) => (prev + 1) % bannerAnimes.length);
        // Animación de entrada
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }).start();
      });
    }, 6000);

    return () => clearInterval(interval);
  }, [bannerAnimes, fadeAnim]);

  const handleGetStarted = () => {
    router.push('/home');
  };

  const currentAnime = bannerAnimes[currentIndex];

  // Ajustes dinámicos por responsividad
  const dynamicStyles = {
    titleSize: isMobile ? 36 : isTablet ? 54 : 64,
    contentPadding: isMobile ? 24 : isTablet ? 40 : 80,
    alignItems: isMobile ? 'center' : 'flex-start' as any,
    textAlign: isMobile ? 'center' : 'left' as any,
    containerHeight: isMobile ? 500 : 700,
    cardHeight: isMobile ? '95%' : '80%',
  };

  return (
    <View style={[styles.outerContainer, { height: dynamicStyles.containerHeight }]}>
      <View style={[styles.cardContainer, { height: dynamicStyles.cardHeight as any }]}>
        {/* Background Banner with Carousel Effect */}
        <Animated.View style={[styles.bannerWrapper, { opacity: fadeAnim }]}>
          {currentAnime?.bannerImage ? (
            <Image 
              source={{ uri: currentAnime.bannerImage }} 
              style={styles.bannerImage}
              resizeMode="cover"
            />
          ) : (
            <View style={[styles.bannerImage, { backgroundColor: '#1e293b' }]} />
          )}
          <View style={styles.overlay} />
        </Animated.View>

        {/* Content */}
        <View style={[styles.contentContainer, { paddingHorizontal: dynamicStyles.contentPadding }]}>
          <View style={[styles.textWrapper, { alignItems: dynamicStyles.alignItems }]}>
            <Text style={styles.welcomeText}>Bienvenido a</Text>
            <Text style={[styles.titleText, { fontSize: dynamicStyles.titleSize, textAlign: dynamicStyles.textAlign }]}>
              Itadakimasu!
            </Text>
            <Text style={[styles.subtitleText, { textAlign: dynamicStyles.textAlign, fontSize: isMobile ? 15 : 18 }]}>
              Tu portal definitivo para descubrir, organizar y disfrutar del mejor anime. 
              Comienza a crear tus propias listas privadas y lleva el seguimiento de tus series favoritas.
            </Text>
            
            <TouchableOpacity 
              style={[styles.button, isMobile && { width: '100%', justifyContent: 'center' }]} 
              onPress={handleGetStarted}
              activeOpacity={0.8}
            >
              <Text style={styles.buttonText}>Ver Anime</Text>
              <Ionicons name="arrow-forward" size={20} color="#ffffff" style={styles.buttonIcon} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Navigation Dots - Hidden on very small screens to save space */}
        {!isMobile && (
          <View style={styles.dotsContainer}>
            {bannerAnimes.slice(0, 5).map((_, i) => (
              <View 
                key={i} 
                style={[
                  styles.dot, 
                  i === currentIndex % 5 && styles.activeDot
                ]} 
              />
            ))}
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  outerContainer: {
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginTop: 20,
    marginBottom: 20,
  },
  cardContainer: {
    width: '100%',
    maxWidth: 1550,
    backgroundColor: '#0b0f19',
    borderRadius: 32,
    position: 'relative',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#1e293b',
    // @ts-ignore
    boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
  },
  bannerWrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  bannerImage: {
    width: '100%',
    height: '100%',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    // @ts-ignore - Propiedad de Web
    backgroundImage: 'linear-gradient(90deg, rgba(11, 15, 25, 0.95) 0%, rgba(11, 15, 25, 0.6) 50%, rgba(11, 15, 25, 0.4) 100%)',
    backgroundColor: 'rgba(11, 15, 25, 0.6)',
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
    zIndex: 10,
  },
  textWrapper: {
    maxWidth: 550,
  },
  welcomeText: {
    color: '#8b5cf6',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  titleText: {
    color: '#ffffff',
    fontWeight: '900',
    marginBottom: 16,
    // @ts-ignore
    textShadow: '0 4px 15px rgba(0,0,0,0.3)',
  },
  subtitleText: {
    color: '#cbd5e1',
    lineHeight: 24,
    marginBottom: 32,
  },
  button: {
    backgroundColor: '#8b5cf6',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 16,
    // @ts-ignore
    cursor: 'pointer',
    // @ts-ignore
    transition: 'transform 0.2s ease',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  buttonIcon: {
    marginLeft: 10,
  },
  dotsContainer: {
    position: 'absolute',
    bottom: 30,
    right: 40,
    flexDirection: 'row',
    gap: 8,
    zIndex: 20,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  activeDot: {
    width: 24,
    backgroundColor: '#8b5cf6',
  },
});
