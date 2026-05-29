import FastTranslator, { Languages } from 'fast-mlkit-translate-text';

let translatorReady = false;
let initializing = false;

export async function prepareTranslator(): Promise<boolean> {
  if (translatorReady) return true;
  if (initializing) return false;
  
  initializing = true;
  try {
    console.log('📚 Preparando traductor offline...');
    
    await FastTranslator.prepare({
      source: 'English' as Languages,
      target: 'Spanish' as Languages,
      downloadIfNeeded: true,
    });
    
    translatorReady = true;
    console.log('Traductor listo para usar offline');
    return true;
  } catch (error) {
    console.error('Error preparando traductor:', error);
    return false;
  } finally {
    initializing = false;
  }
}

export async function translateToSpanish(text: string): Promise<string> {
  if (!text.trim()) return '';
  
  if (!translatorReady) {
    const success = await prepareTranslator();
    if (!success) {
      console.warn('No se pudo traducir porque el modelo no está listo.');
      return text; 
    }
  }
  
  try {
    const translated = await FastTranslator.translate(text);
    console.log('📝 Traducción completada');
    return translated;
  } catch (error) {
    console.error('Error de traducción:', error);
    return text; 
  }
}

export async function isTranslatorReady(): Promise<boolean> {
  return translatorReady;
}