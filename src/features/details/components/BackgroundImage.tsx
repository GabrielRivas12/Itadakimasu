import { StyleSheet, View, Image } from 'react-native';

interface BackgroundImageProps {
  uri: string | null | undefined;
  top?: number;
  height?: number;
  opacity?: number;
}

export function BackgroundImage({
  uri,
  top = 0,
  height = 150,
  opacity = 0.8,
}: BackgroundImageProps) {
  if (!uri) return null;

  return (
    <View pointerEvents="none" style={[styles.container, { top, height }]}>
      <Image
        source={{ uri }}
        style={[styles.image, { opacity }]}
        resizeMode="cover"
      />
      <View style={styles.overlay} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    width: '100%',
    zIndex: -1,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  overlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#0b0f19',
    opacity: 0.55,
  },
});
