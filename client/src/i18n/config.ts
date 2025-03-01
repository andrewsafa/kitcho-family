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
    fallbackLng: 'ar',
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
          "member": "Member",
          "your_points": "Your Points",
          "your_level": "Your Level",
          "your_benefits": "Your Benefits",
          "your_progress": "Your Progress",
          "next_level": "Next Level",
          "points_needed": "Points needed",
          "current_points": "Current Points",

          // Admin Dashboard
          "admin_dashboard": "Admin Dashboard",
          "add_points": "Add Points",
          "delete_points": "Delete Points",
          "customer_search": "Search by name or mobile number...",
          "special_events": "Special Events",
          "special_offers": "Special Offers",
          "manage_benefits": "Manage Level Benefits",
          "create_event": "Create Event",
          "create_offer": "Create Offer",
          "add_benefit": "Add Benefit",
          "event_name": "Event Name",
          "event_description": "Event Description",
          "point_multiplier": "Point Multiplier",
          "start_date": "Start Date",
          "end_date": "End Date",
          "offer_title": "Offer Title",
          "offer_description": "Offer Description",
          "valid_until": "Valid Until",
          "no_events": "No special events",
          "no_offers": "No special offers",
          "active_events": "Active Events",
          "active_offers": "Active Offers",
          "change_password": "Change Password",
          "current_password": "Current Password",
          "new_password": "New Password",
          "confirm_password": "Confirm Password",
          "keep_earning": "Keep earning points to reach the next level!",
          "actions": "Actions",
          "search": "Search",
          "customers": "Customers",
          "name": "Name",
          "mobile": "Mobile",

          // Form Validations
          "name_required": "Name must be at least 2 characters",
          "mobile_invalid": "Please enter a valid mobile number",
          "points_invalid": "Invalid points value",
          "cannot_delete_more": "Cannot delete more points than customer has",
          "enter_points": "Enter number of points to delete",
          "enter_reason": "Enter reason for deleting points",
          "positive_number": "Please enter a positive number",

          // Messages
          "success": "Success",
          "error": "Error",
          "no_customers": "No customers found",
          "points_added": "Points added successfully",
          "points_deleted": "Points deleted successfully",
          "event_created": "Special event created successfully",
          "offer_created": "Special offer created successfully",
          "password_updated": "Password updated successfully",
          "password_error": "Failed to update password",
          "customer_not_found": "Customer not found"
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
          "member": "عضو",
          "your_points": "نقاطك",
          "your_level": "مستواك",
          "your_benefits": "مزاياك",
          "your_progress": "تقدمك",
          "next_level": "المستوى التالي",
          "points_needed": "النقاط المطلوبة",
          "current_points": "النقاط الحالية",

          // Admin Dashboard
          "admin_dashboard": "لوحة تحكم المسؤول",
          "add_points": "إضافة نقاط",
          "delete_points": "حذف نقاط",
          "customer_search": "البحث بالاسم أو رقم الجوال...",
          "special_events": "الفعاليات الخاصة",
          "special_offers": "العروض الخاصة",
          "manage_benefits": "إدارة مزايا المستويات",
          "create_event": "إنشاء فعالية",
          "create_offer": "إنشاء عرض",
          "add_benefit": "إضافة ميزة",
          "event_name": "اسم الفعالية",
          "event_description": "وصف الفعالية",
          "point_multiplier": "مضاعف النقاط",
          "start_date": "تاريخ البدء",
          "end_date": "تاريخ الانتهاء",
          "offer_title": "عنوان العرض",
          "offer_description": "وصف العرض",
          "valid_until": "صالح حتى",
          "no_events": "لا توجد فعاليات خاصة",
          "no_offers": "لا توجد عروض خاصة",
          "active_events": "الفعاليات النشطة",
          "active_offers": "العروض النشطة",
          "change_password": "تغيير كلمة المرور",
          "current_password": "كلمة المرور الحالية",
          "new_password": "كلمة المرور الجديدة",
          "confirm_password": "تأكيد كلمة المرور",
          "keep_earning": "واصل كسب النقاط للوصول إلى المستوى التالي!",
          "actions": "العمليات",
          "search": "بحث",
          "customers": "العملاء",
          "name": "الاسم",
          "mobile": "الجوال",

          // Form Validations
          "name_required": "يجب أن يكون الاسم مكوناً من حرفين على الأقل",
          "mobile_invalid": "الرجاء إدخال رقم جوال صحيح",
          "points_invalid": "قيمة النقاط غير صحيحة",
          "cannot_delete_more": "لا يمكن حذف نقاط أكثر من رصيد العميل",
          "enter_points": "أدخل عدد النقاط المراد حذفها",
          "enter_reason": "أدخل سبب حذف النقاط",
          "positive_number": "الرجاء إدخال رقم موجب",

          // Messages
          "success": "نجاح",
          "error": "خطأ",
          "no_customers": "لم يتم العثور على عملاء",
          "points_added": "تمت إضافة النقاط بنجاح",
          "points_deleted": "تم حذف النقاط بنجاح",
          "event_created": "تم إنشاء الفعالية الخاصة بنجاح",
          "offer_created": "تم إنشاء العرض الخاص بنجاح",
          "password_updated": "تم تحديث كلمة المرور بنجاح",
          "password_error": "فشل تحديث كلمة المرور",
          "customer_not_found": "لم يتم العثور على العميل"
        }
      }
    }
  });

export default i18n;