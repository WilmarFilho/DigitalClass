import { useState, useEffect } from 'react';
import { translations, Language } from '@/lib/i18n';

type NestedKeyOf<ObjectType extends object> = 
{[Key in keyof ObjectType & (string | number)]: ObjectType[Key] extends object
? `${Key}` | `${Key}.${NestedKeyOf<ObjectType[Key]>}`
: `${Key}`
}[keyof ObjectType & (string | number)];

export function useTranslation() {
  const [lang, setLang] = useState<Language>('pt-BR');

  useEffect(() => {
    // Inicializar idioma via localStorage no client-side
    const saved = localStorage.getItem('dc-language') as Language | null;
    if (saved && ["pt-BR", "en", "es"].includes(saved)) {
      setLang(saved);
    }
    
    // Ouvinte para reatividade quando o idioma mudar de outra tela/componente
    const handleLanguageChange = () => {
      const updated = localStorage.getItem('dc-language') as Language | null;
      if (updated && ["pt-BR", "en", "es"].includes(updated)) {
        setLang(updated);
      }
    };

    window.addEventListener('languageChange', handleLanguageChange);
    return () => window.removeEventListener('languageChange', handleLanguageChange);
  }, []);

  const t = (key: string, replacements?: Record<string, string | number>): string => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const dict = translations[lang] as any;
    
    let text = key;
    if (dict && key in dict) {
      text = dict[key];
    }

    if (replacements) {
      Object.entries(replacements).forEach(([k, v]) => {
        text = text.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
      });
    }
    
    return text;
  };

  return { t, lang };
}
