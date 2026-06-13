import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export const PrivacyPage = () => {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Privacidad y Políticas</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.documentBody}>
          <Text style={styles.lastUpdated}>Última actualización: 08 de junio de 2026</Text>

          <Text style={styles.paragraph}>
            La presente Política de Privacidad y Condiciones de Uso (en adelante, "la Política") establece los términos bajo los cuales Itadakimasu! (en adelante, "la Aplicación") utiliza y protege la información que es proporcionada por sus usuarios al momento de utilizar su plataforma. Estamos comprometidos con la seguridad de los datos de nuestros usuarios.
          </Text>

          <Text style={styles.sectionHeading}>1. Aceptación de los Términos</Text>
          <Text style={styles.paragraph}>
            Al acceder y utilizar Itadakimasu!, el usuario acepta de manera expresa y sin reservas todos los términos establecidos en este documento. Si el usuario no está de acuerdo con alguna de las disposiciones aquí descritas, deberá abstenerse de utilizar la Aplicación de inmediato.
          </Text>

          <Text style={styles.sectionHeading}>2. Información Recolectada</Text>
          <Text style={styles.paragraph}>
            Nuestra Aplicación podrá recolectar información personal, por ejemplo: Nombre, información de contacto como su dirección de correo electrónica e información demográfica. Así mismo, cuando sea necesario, podrá ser requerida información específica para procesar la sincronización de su lista de anime a través de servicios de terceros como Google.
          </Text>

          <Text style={styles.sectionHeading}>3. Uso de la Información Recolectada</Text>
          <Text style={styles.paragraph}>
            Itadakimasu! utiliza la información con el fin de proporcionar el mejor servicio posible, particularmente para mantener un registro de usuarios, de sus preferencias y el estado de su lista de seguimiento de anime. La información recopilada se utiliza exclusivamente para la personalización de la experiencia del usuario dentro de la plataforma.
          </Text>

          <Text style={styles.sectionHeading}>4. Normas de Conducta y Uso Correcto</Text>
          <Text style={styles.paragraph}>
            El usuario se compromete a utilizar la Aplicación de conformidad con la ley, la moral, las buenas costumbres y el orden público. Se considera uso correcto:
          </Text>
          <Text style={styles.bulletItem}>• El registro de actividad personal de visualización de contenido anime.</Text>
          <Text style={styles.bulletItem}>• La gestión de listas de favoritos y seguimiento para fines no lucrativos.</Text>
          <Text style={styles.bulletItem}>• La interacción con las funciones de la interfaz de usuario de manera manual y diligente.</Text>

          <Text style={styles.sectionHeading}>5. Actividades Prohibidas (Uso Incorrecto)</Text>
          <Text style={styles.paragraph}>
            Queda estrictamente prohibido y será motivo de rescisión inmediata del acceso a los servicios, así como de posibles acciones legales:
          </Text>
          <Text style={styles.bulletItem}>
            • <Text style={styles.bold}>Extracción Automatizada (Scraping):</Text> El uso de scripts, bots o cualquier tecnología para extraer masivamente datos, imágenes o enlaces de la Aplicación. Por ejemplo, el uso de herramientas externas para descargar la base de datos de títulos.
          </Text>
          <Text style={styles.bulletItem}>
            • <Text style={styles.bold}>Ingeniería Inversa:</Text> Intentar descompilar, desensamblar o descubrir el código fuente de la Aplicación con el fin de replicar sus funciones o encontrar vulnerabilidades.
          </Text>
          <Text style={styles.bulletItem}>
            • <Text style={styles.bold}>Uso Comercial No Autorizado:</Text> La explotación de las funcionalidades de Itadakimasu! para obtener beneficios económicos directos o indirectos, como la venta de acceso a funciones Premium o el uso del nombre en promociones externas.
          </Text>
          <Text style={styles.bulletItem}>
            • <Text style={styles.bold}>Suplantación de Identidad:</Text> Acceder o intentar acceder a cuentas de otros usuarios mediante técnicas de phishing o ingeniería social, así como proporcionar información falsa durante el registro.
          </Text>

          <Text style={styles.sectionHeading}>6. Seguridad y Almacenamiento</Text>
          <Text style={styles.paragraph}>
            Itadakimasu! utiliza los servicios de Google Firebase para el almacenamiento de datos y la autenticación segura. Aunque implementamos medidas de seguridad de grado industrial, el usuario reconoce que ningún sistema de transmisión de datos por internet o sistema de almacenamiento electrónico es invulnerable. No vendemos ni cedemos su información personal a terceros bajo ninguna circunstancia.
          </Text>

          <Text style={styles.sectionHeading}>7. Enlaces a Terceros</Text>
          <Text style={styles.paragraph}>
            Esta Aplicación pudiera contener enlaces a otros sitios que pudieran ser de su interés. Una vez que usted de clic en estos enlaces y abandone nuestra plataforma, ya no tenemos control sobre al sitio al que es redirigido y por lo tanto no somos responsables de los términos o privacidad ni de la protección de sus datos en esos otros sitios de terceros.
          </Text>

          <View style={styles.spacer} />
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0b0f19',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
    backgroundColor: '#0b0f19',
  },
  backButton: {
    padding: 8,
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  content: {
    padding: 20,
  },
  documentBody: {
    maxWidth: 800,
    alignSelf: 'center',
    width: '100%',
  },
  lastUpdated: {
    color: '#64748b',
    fontSize: 13,
    marginBottom: 20,
    fontStyle: 'italic',
  },
  sectionHeading: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#f8fafc',
    marginTop: 24,
    marginBottom: 12,
  },
  paragraph: {
    fontSize: 15,
    color: '#94a3b8',
    lineHeight: 24,
    marginBottom: 16,
    textAlign: 'justify',
  },
  bulletItem: {
    fontSize: 15,
    color: '#94a3b8',
    lineHeight: 22,
    marginBottom: 10,
    paddingLeft: 10,
  },
  bold: {
    fontWeight: 'bold',
    color: '#cbd5e1',
  },
  spacer: {
    height: 60,
  },
});
