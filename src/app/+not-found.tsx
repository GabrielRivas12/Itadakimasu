import { Link, Stack } from 'expo-router';
import { StyleSheet, Text, View, Image } from 'react-native';

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen
        options={{
          title: '404',
          headerShown: true,
          headerStyle: {
            backgroundColor: '#0f172a',
          },
          headerTintColor: '#ffffff',
        }}
      />

      <View style={styles.container}>
        <Image
          source={require('../../assets/notfound.png')}
          style={styles.image}
          resizeMode="contain"
        />

        <Text style={styles.code}>404</Text>

        <Text style={styles.title}>
          Ara Ara~ Página no encontrada
        </Text>

        <Text style={styles.description}>
          La waifu encargada de esta sección no pudo encontrar la página que buscas.
          Tal vez fue enviada a otro mundo (isekai) ✨
        </Text>

        <Link href="/" style={styles.button}>
          <Text style={styles.buttonText}>
            Volver al Inicio
          </Text>
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0b0f19',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },

  image: {
    width: 280,
    height: 280,
    marginBottom: 16,
  },

  code: {
    fontSize: 72,
    fontWeight: '900',
    color: '#8b5cf6',
    textShadowColor: 'rgba(139, 92, 246, 0.4)',
    textShadowOffset: {
      width: 0,
      height: 0,
    },
    textShadowRadius: 12,
  },

  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
    marginTop: 10,
    marginBottom: 12,
  },

  description: {
    fontSize: 15,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 24,
    maxWidth: 320,
    marginBottom: 30,
  },

  button: {
    backgroundColor: '#8b5cf6',
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 14,
    minWidth: 180,
    alignItems: 'center',
  },

  buttonText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 16,
  },
});