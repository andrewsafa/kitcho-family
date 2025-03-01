import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from "@/components/ui/button";
import { Languages } from "lucide-react";

export function LanguageSwitcher() {
  const { i18n } = useTranslation();

  useEffect(() => {
    // Set Arabic as default language on component mount
    if (i18n.language !== 'ar') {
      i18n.changeLanguage('ar');
      document.documentElement.dir = 'rtl';
    }
  }, []);

  const toggleLanguage = () => {
    const newLang = i18n.language === 'en' ? 'ar' : 'en';
    i18n.changeLanguage(newLang);
    document.documentElement.dir = newLang === 'ar' ? 'rtl' : 'ltr';
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleLanguage}
      className="fixed top-4 right-4"
    >
      <Languages className="h-5 w-5" />
    </Button>
  );
}