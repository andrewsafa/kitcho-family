import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import HttpApi from 'i18next-http-backend';

i18n
  .use(initReactI18next)
  .use(LanguageDetector)
  .use(HttpApi)
  .init({
    supportedLngs: ['en', 'ar'],
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
    resources: {
      en: {
        translation: {
          // Customer section
          "welcome": "Welcome to Kitcho Family",
          "join_family": "Join our family and start earning rewards on every visit",
          "full_name": "Full Name",
          "mobile_number": "Mobile Number",
          "join_button": "Join Kitcho Family",
          "admin_login": "Admin Login",
          
          // Points and Levels
          "points": "Points",
          "level": "Level",
          "bronze": "Bronze",
          "silver": "Silver",
          "gold": "Gold",
          "diamond": "Diamond",
          
          // Admin Dashboard
          "admin_dashboard": "Admin Dashboard",
          "add_points": "Add Points",
          "delete_points": "Delete Points",
          "customer_search": "Search by name or mobile number...",
          "special_events": "Special Events",
          "special_offers": "Special Offers",
          "manage_benefits": "Manage Level Benefits",
          
          // Form Validations
          "name_required": "Name must be at least 2 characters",
          "mobile_invalid": "Please enter a valid mobile number",
          "points_invalid": "Invalid points value",
          
          // Messages
          "success": "Success",
          "error": "Error",
          "no_customers": "No customers found",
          "points_added": "Points added successfully",
          "points_deleted": "Points deleted successfully"
        }
      },
      ar: {
        translation: {
          // Customer section
          "welcome": "مرحباً بكم في عائلة كيتشو",
          "join_family": "انضم إلى عائلتنا وابدأ في كسب المكافآت مع كل زيارة",
          "full_name": "الاسم الكامل",
          "mobile_number": "رقم الجوال",
          "join_button": "انضم إلى عائلة كيتشو",
          "admin_login": "تسجيل دخول المسؤول",
          
          // Points and Levels
          "points": "النقاط",
          "level": "المستوى",
          "bronze": "برونزي",
          "silver": "فضي",
          "gold": "ذهبي",
          "diamond": "ماسي",
          
          // Admin Dashboard
          "admin_dashboard": "لوحة تحكم المسؤول",
          "add_points": "إضافة نقاط",
          "delete_points": "حذف نقاط",
          "customer_search": "البحث بالاسم أو رقم الجوال...",
          "special_events": "الفعاليات الخاصة",
          "special_offers": "العروض الخاصة",
          "manage_benefits": "إدارة مزايا المستويات",
          
          // Form Validations
          "name_required": "يجب أن يكون الاسم مكوناً من حرفين على الأقل",
          "mobile_invalid": "الرجاء إدخال رقم جوال صحيح",
          "points_invalid": "قيمة النقاط غير صحيحة",
          
          // Messages
          "success": "نجاح",
          "error": "خطأ",
          "no_customers": "لم يتم العثور على عملاء",
          "points_added": "تمت إضافة النقاط بنجاح",
          "points_deleted": "تم حذف النقاط بنجاح"
        }
      }
    }
  });

export default i18n;
