import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, Image, TouchableOpacity, Animated, Dimensions } from 'react-native';
import { Anime } from '../../../../services/anilist';
import { useResponsive } from '../../../hooks/useResponsive';

interface FeaturedBannerProps {
  featured: Anime[];
  onPress: (id: number) => void;
}

export function FeaturedBanner({ featured, onPress }: FeaturedBannerProps) {
  const { isMobile } = useResponsive();
  const [currentIndex, setCurrentIndex] = useState(0);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!featured || featured.length <= 1) return;

    const timer = setInterval(() => {
      // Animación de salida (Fade out)
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }).start(() => {
        // Cambiar al siguiente index
        setCurrentIndex((prevIndex) => (prevIndex + 1) % featured.length);
        
        // Animación de entrada (Fade in)
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }).start();
      });
    }, 6000); // Cambia cada 6 segundos

    return () => clearInterval(timer);
  }, [featured?.length]);

  // Si no hay datos, no renderizar nada
  if (!featured || featured.length === 0) return null;

  const currentAnime = featured[currentIndex];

  return (
    <View style={[styles.bannerContainer, isMobile && { height: 180, margin: 12 }]}>
      <Animated.View style={[styles.innerContainer, { opacity: fadeAnim }]}>
        <Image
          source={{
            uri: currentAnime.bannerImage || currentAnime.coverImage.extraLarge || currentAnime.coverImage.large,
          }}
          style={styles.bannerImage}
          resizeMode="cover"
        />
        <View style={[styles.bannerOverlay, isMobile && { padding: 12 }]}>
          <View style={styles.tag}>
            <Text style={styles.tagText}>TENDENCIA HOY</Text>
          </View>
          
          <Text style={[styles.bannerTitle, isMobile && { fontSize: 18 }]} numberOfLines={1}>
            {currentAnime.title.romaji || currentAnime.title.english}
          </Text>
          
          <Text style={[styles.bannerSubtitle, isMobile && { fontSize: 11, marginBottom: 8 }]} numberOfLines={2}>
            {currentAnime.description
              ? currentAnime.description.replace(/<[^>]*>/g, '')
              : 'Una producción imperdible disponible ahora en AnimeLT.'}
          </Text>
          
          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.bannerButton, isMobile && { paddingHorizontal: 12, paddingVertical: 6 }]}
              onPress={() => onPress(currentAnime.id)}
            >
              <Text style={[styles.bannerButtonText, isMobile && { fontSize: 12 }]}>Ver Ahora</Text>
            </TouchableOpacity>

            {/* Indicadores de posición (Dots) */}
            <View style={styles.dotsContainer}>
              {featured.map((_, index) => (
                <View 
                  key={index} 
                  style={[
                    styles.dot, 
                    currentIndex === index ? styles.activeDot : styles.inactiveDot
                  ]} 
                />
              ))}
            </View>
          </View>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  bannerContainer: {
    margin: 16,
    height: 220,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#1e293b',
    position: 'relative',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  innerContainer: {
    flex: 1,
  },
  bannerImage: {
    width: '100%',
    height: '100%',
  },
  bannerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    padding: 16,
    justifyContent: 'flex-end',
  },
  tag: {
    backgroundColor: '#8b5cf6',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginBottom: 8,
  },
  tagText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  bannerTitle: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  bannerSubtitle: {
    color: '#cbd5e1',
    fontSize: 12,
    marginBottom: 12,
    lineHeight: 16,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bannerButton: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  bannerButtonText: {
    color: '#0f172a',
    fontWeight: 'bold',
    fontSize: 14,
  },
  dotsContainer: {
    flexDirection: 'row',
    gap: 6,
  },
  dot: {
    height: 6,
    borderRadius: 3,
  },
  activeDot: {
    width: 20,
    backgroundColor: '#8b5cf6',
  },
  inactiveDot: {
    width: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
});
