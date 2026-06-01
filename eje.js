import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, Button } from 'react-native';
import { useState, useEffect } from 'react';

import { GoogleAuthProvider, signInWithCredential, onAuthStateChanged, signOut } from "firebase/auth";
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { auth } from "./firebase"; // importar la instancia de firebase.js o env

// Configuracion del id Aouth de Google
GoogleSignin.configure({
  webClientId: "456437249502-s61d9oe65isjne6k150ijpdop7da4aqs.apps.googleusercontent.com",
  offlineAccess: false,
});

export default function App() {
  // estado para almacenar el usuario autenticado
  const [user, setUser] = useState(null); 

  // escuchar cambios en el estado cuando se activa el componente
  useEffect(() => {
    // escuchar cambios en el estado de autenticación
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      // currentUser será null si no hay sesión
      // o el objeto usuario si ya estaba autenticado
      setUser(currentUser);
    });

    // limpiar cuando el componente se desmonte 
    return unsubscribe;
  }, []);

  // metodo de login con Google
  const loginWithGoogle = async () => {
    try {
      // verifica que el dispositivo tenga los servicios de Google Play disponibles
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

      // abrir ventana de login de Google y obtener el idToken
      const userInfo = await GoogleSignin.signIn();
      const idToken = userInfo.data?.idToken;

      // si no se recibe el idToken, lanzar un error
      if (!idToken) {
        throw new Error("No se recibió idToken de Google");
      }

      // crear credenciales de Firebase con el idToken de Google
      const credential = GoogleAuthProvider.credential(idToken);
      // iniciar sesión en Firebase con las credenciales de Google
      await signInWithCredential(auth, credential);

    } catch (error) {
      // capturar y mostrar cualquier error que ocurra durante el proceso de login
      console.error("Error login Google:", error);
    }
  };

  // metodo de logout
  const logoutGoogle = async () => {
    try {
      await GoogleSignin.signOut();
      await signOut(auth);
    } catch (error) {
      console.error("Error logout Google:", error);
    }
  };


  // componente de la interfaz de usuario
  return (
    <View style={styles.container}>
      {user ? ( // si el usuario está autenticado, mostrar su nombre y un botón de logout
        <>
          <Text style={styles.text}>
            Bienvenido, {user.displayName}
          </Text>
          
          <Button title="Cerrar sesión" onPress={logoutGoogle} />
        </>
      ) : (
        <Button title="Login con Google" onPress={loginWithGoogle} />
      )}
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    backgroundColor: '#fff' 
  },
  text: {
    marginBottom: 20,
    fontSize: 18
  }
});