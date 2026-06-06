'use client';

import { useEffect } from 'react';
import { type MarketingLang, useMarketingLanguage } from './language-selector';

type TranslationMap = Partial<Record<MarketingLang, string>>;

const translations: Record<string, TranslationMap> = {
  'Home': { de: 'Startseite', fr: 'Accueil', es: 'Inicio', zh: '首页', hi: 'होम', ar: 'الرئيسية' },
  'Platform': { de: 'Plattform', fr: 'Plateforme', es: 'Plataforma', zh: '平台', hi: 'प्लेटफ़ॉर्म', ar: 'المنصة' },
  'Solutions': { de: 'Lösungen', fr: 'Solutions', es: 'Soluciones', zh: '解决方案', hi: 'समाधान', ar: 'الحلول' },
  'Setu Guru AI': { de: 'Setu Guru KI', fr: 'IA Setu Guru', es: 'IA Setu Guru', zh: 'Setu Guru AI', hi: 'Setu Guru AI', ar: 'ذكاء Setu Guru' },
  'Mobile': { de: 'Mobil', fr: 'Mobile', es: 'Móvil', zh: '移动端', hi: 'मोबाइल', ar: 'الجوال' },
  'Pricing': { de: 'Preise', fr: 'Tarifs', es: 'Precios', zh: '价格', hi: 'मूल्य', ar: 'الأسعار' },
  'Compare': { de: 'Vergleichen', fr: 'Comparer', es: 'Comparar', zh: '对比', hi: 'तुलना', ar: 'قارن' },
  'Book Demo': { de: 'Demo buchen', fr: 'Réserver une démo', es: 'Reservar demo', zh: '预约演示', hi: 'डेमो बुक करें', ar: 'احجز عرضا' },
  'Book a Demo': { de: 'Demo buchen', fr: 'Réserver une démo', es: 'Reservar una demo', zh: '预约演示', hi: 'डेमो बुक करें', ar: 'احجز عرضا' },
  'Book a demo': { de: 'Demo buchen', fr: 'Réserver une démo', es: 'Reservar una demo', zh: '预约演示', hi: 'डेमो बुक करें', ar: 'احجز عرضا' },
  'Enter workspace': { de: 'Workspace öffnen', fr: 'Entrer dans l’espace', es: 'Entrar al espacio', zh: '进入工作区', hi: 'वर्कस्पेस खोलें', ar: 'ادخل مساحة العمل' },
  'Enter': { de: 'Öffnen', fr: 'Entrer', es: 'Entrar', zh: '进入', hi: 'खोलें', ar: 'دخول' },
  'Product Overview': { de: 'Produktübersicht', fr: 'Vue produit', es: 'Resumen del producto', zh: '产品概览', hi: 'उत्पाद अवलोकन', ar: 'نظرة على المنتج' },
  'Contact support': { de: 'Support kontaktieren', fr: 'Contacter le support', es: 'Contactar soporte', zh: '联系支持', hi: 'सहायता से संपर्क करें', ar: 'اتصل بالدعم' },
  'Sales & demos': { de: 'Vertrieb & Demos', fr: 'Ventes et démos', es: 'Ventas y demos', zh: '销售与演示', hi: 'सेल्स और डेमो', ar: 'المبيعات والعروض' },
  'Access': { de: 'Zugang', fr: 'Accès', es: 'Acceso', zh: '访问', hi: 'एक्सेस', ar: 'الوصول' },
  'Company': { de: 'Unternehmen', fr: 'Entreprise', es: 'Empresa', zh: '公司', hi: 'कंपनी', ar: 'الشركة' },
  'Trade execution software for import-export teams, built around leads, quotes, documents, orders and shipment readiness.': { de: 'Trade-Execution-Software für Import-Export-Teams, aufgebaut rund um Leads, Angebote, Dokumente, Aufträge und Versandbereitschaft.', fr: 'Logiciel d’exécution commerciale pour équipes import-export, centré sur les prospects, devis, documents, commandes et la préparation des expéditions.', es: 'Software de ejecución comercial para equipos de importación y exportación, basado en leads, cotizaciones, documentos, pedidos y preparación de envíos.', zh: '面向进出口团队的贸易执行软件，围绕线索、报价、文件、订单和发运准备构建。', hi: 'इंपोर्ट-एक्सपोर्ट टीमों के लिए ट्रेड एक्ज़ीक्यूशन सॉफ्टवेयर, जो लीड, कोटेशन, दस्तावेज़, ऑर्डर और शिपमेंट तैयारी पर आधारित है।', ar: 'برنامج تنفيذ تجاري لفرق الاستيراد والتصدير، مبني حول العملاء المحتملين والعروض والمستندات والطلبات وجاهزية الشحن.' },
  'Trade execution software for global import-export teams.': { de: 'Trade-Execution-Software für globale Import-Export-Teams.', fr: 'Logiciel d’exécution commerciale pour équipes import-export mondiales.', es: 'Software de ejecución comercial para equipos globales de importación y exportación.', zh: '面向全球进出口团队的贸易执行软件。', hi: 'वैश्विक इंपोर्ट-एक्सपोर्ट टीमों के लिए ट्रेड एक्ज़ीक्यूशन सॉफ्टवेयर।', ar: 'برنامج تنفيذ تجاري لفرق الاستيراد والتصدير العالمية.' },
  'All rights reserved.': { de: 'Alle Rechte vorbehalten.', fr: 'Tous droits réservés.', es: 'Todos los derechos reservados.', zh: '保留所有权利。', hi: 'सर्वाधिकार सुरक्षित।', ar: 'جميع الحقوق محفوظة.' },

  'Trade Execution CRM': { de: 'Trade Execution CRM', fr: 'CRM d’exécution commerciale', es: 'CRM de ejecución comercial', zh: '贸易执行 CRM', hi: 'ट्रेड एक्ज़ीक्यूशन CRM', ar: 'CRM لتنفيذ التجارة' },
  'From first contact to final dispatch.': { de: 'Vom ersten Kontakt bis zum finalen Versand.', fr: 'Du premier contact à l’expédition finale.', es: 'Del primer contacto al despacho final.', zh: '从首次联系到最终发运。', hi: 'पहले संपर्क से अंतिम डिस्पैच तक।', ar: 'من أول تواصل إلى آخر شحنة.' },
  'Most import-export teams carry deals across spreadsheets, email threads, and disconnected tools — until something falls between them. Setu Flow keeps the whole workflow connected.': { de: 'Die meisten Import-Export-Teams führen Geschäfte über Tabellen, E-Mail-Threads und getrennte Tools — bis etwas dazwischen verloren geht. Setu Flow hält den gesamten Workflow verbunden.', fr: 'La plupart des équipes import-export gèrent les affaires dans des tableurs, des fils d’e-mails et des outils séparés — jusqu’à ce qu’une étape se perde. Setu Flow garde tout le workflow connecté.', es: 'La mayoría de los equipos de importación y exportación gestionan acuerdos entre hojas de cálculo, correos y herramientas desconectadas, hasta que algo se pierde. Setu Flow mantiene todo el flujo conectado.', zh: '大多数进出口团队在表格、邮件和分散工具之间推进交易，直到关键事项被遗漏。Setu Flow 让整个流程保持连接。', hi: 'अधिकांश इंपोर्ट-एक्सपोर्ट टीमें डील को स्प्रेडशीट, ईमेल थ्रेड और अलग-अलग टूल्स में चलाती हैं — जब तक कोई चीज़ बीच में छूट न जाए। Setu Flow पूरे वर्कफ़्लो को जोड़कर रखता है।', ar: 'تدير معظم فرق الاستيراد والتصدير الصفقات عبر الجداول ورسائل البريد والأدوات المنفصلة، إلى أن تضيع خطوة مهمة. يحافظ Setu Flow على اتصال سير العمل بالكامل.' },
  'See how it works': { de: 'So funktioniert es', fr: 'Voir comment ça marche', es: 'Ver cómo funciona', zh: '了解如何运作', hi: 'कैसे काम करता है देखें', ar: 'شاهد كيف يعمل' },
  'vCard capture': { de: 'vCard-Erfassung', fr: 'Capture vCard', es: 'Captura vCard', zh: 'vCard 采集', hi: 'vCard कैप्चर', ar: 'التقاط vCard' },
  'Quote control': { de: 'Angebotskontrolle', fr: 'Contrôle des devis', es: 'Control de cotizaciones', zh: '报价控制', hi: 'कोट नियंत्रण', ar: 'التحكم بالعروض' },
  'Document readiness': { de: 'Dokumentenbereitschaft', fr: 'Préparation des documents', es: 'Preparación documental', zh: '文件准备', hi: 'दस्तावेज़ तैयारी', ar: 'جاهزية المستندات' },
  'Trusted by trade teams': { de: 'Vertraut von Handelsteams', fr: 'Approuvé par les équipes commerciales', es: 'Confiado por equipos de comercio', zh: '受贸易团队信任', hi: 'ट्रेड टीमों का भरोसा', ar: 'موثوق به من فرق التجارة' },
  'Product proof': { de: 'Produktbeweis', fr: 'Preuve produit', es: 'Prueba del producto', zh: '产品证明', hi: 'उत्पाद प्रमाण', ar: 'دليل المنتج' },
  'The moments where most teams lose deals.': { de: 'Die Momente, in denen die meisten Teams Geschäfte verlieren.', fr: 'Les moments où la plupart des équipes perdent des affaires.', es: 'Los momentos donde la mayoría de los equipos pierde acuerdos.', zh: '大多数团队丢失交易的关键时刻。', hi: 'वे पल जहाँ अधिकांश टीमें डील खो देती हैं।', ar: 'اللحظات التي تخسر فيها معظم الفرق الصفقات.' },
  'Not from lack of effort — from lack of system. Setu Flow is built around exactly these moments.': { de: 'Nicht wegen fehlender Mühe — sondern wegen fehlender Struktur. Setu Flow ist genau für diese Momente gebaut.', fr: 'Pas par manque d’effort — par manque de système. Setu Flow est conçu précisément pour ces moments.', es: 'No por falta de esfuerzo, sino por falta de sistema. Setu Flow está diseñado para esos momentos.', zh: '不是因为不努力，而是因为缺少系统。Setu Flow 正是围绕这些时刻构建。', hi: 'मेहनत की कमी से नहीं — सिस्टम की कमी से। Setu Flow इन्हीं पलों के लिए बना है।', ar: 'ليس بسبب قلة الجهد، بل بسبب غياب النظام. صُمم Setu Flow لهذه اللحظات تحديدا.' },

  'Product overview': { de: 'Produktübersicht', fr: 'Vue produit', es: 'Resumen del producto', zh: '产品概览', hi: 'उत्पाद अवलोकन', ar: 'نظرة على المنتج' },
  'Setu Flow - learn the system': { de: 'Setu Flow - das System lernen', fr: 'Setu Flow - apprendre le système', es: 'Setu Flow - aprender el sistema', zh: 'Setu Flow - 学习系统', hi: 'Setu Flow - सिस्टम सीखें', ar: 'Setu Flow - تعلّم النظام' },
  'SETU Workflow': { de: 'SETU Workflow', fr: 'Workflow SETU', es: 'Flujo SETU', zh: 'SETU 工作流', hi: 'SETU वर्कफ़्लो', ar: 'سير عمل SETU' },
  'Workflow Lessons': { de: 'Workflow-Lektionen', fr: 'Leçons du workflow', es: 'Lecciones del flujo', zh: '工作流课程', hi: 'वर्कफ़्लो पाठ', ar: 'دروس سير العمل' },
  'Video Walkthroughs': { de: 'Video-Durchgänge', fr: 'Parcours vidéo', es: 'Recorridos en video', zh: '视频演示', hi: 'वीडियो walkthrough', ar: 'جولات فيديو' },
  'My Progress': { de: 'Mein Fortschritt', fr: 'Ma progression', es: 'Mi progreso', zh: '我的进度', hi: 'मेरी प्रगति', ar: 'تقدمي' },
  'From inquiry to dispatch': { de: 'Von der Anfrage bis zum Versand', fr: 'De la demande à l’expédition', es: 'De la consulta al despacho', zh: '从询盘到发运', hi: 'पूछताछ से डिस्पैच तक', ar: 'من الاستفسار إلى الشحن' },
  'A clean operating map for Setu Flow. Short and simple here - detailed screenshots, practice steps, and questions live inside Workflow Lessons.': { de: 'Eine klare Betriebsübersicht für Setu Flow. Kurz und einfach hier - detaillierte Screenshots, Übungsschritte und Fragen finden Sie in den Workflow-Lektionen.', fr: 'Une carte opérationnelle claire pour Setu Flow. Ici, c’est court et simple - les captures, étapes pratiques et questions sont dans les leçons du workflow.', es: 'Un mapa operativo claro para Setu Flow. Aquí es breve y simple; las capturas, pasos prácticos y preguntas están en las lecciones del flujo.', zh: 'Setu Flow 的清晰操作地图。这里保持简洁；详细截图、练习步骤和问题在工作流课程中。', hi: 'Setu Flow के लिए साफ ऑपरेटिंग मैप। यहाँ संक्षिप्त और सरल है - विस्तृत स्क्रीनशॉट, अभ्यास चरण और प्रश्न वर्कफ़्लो पाठों में हैं।', ar: 'خريطة تشغيل واضحة لـ Setu Flow. هنا المحتوى مختصر وبسيط؛ أما اللقطات التفصيلية وخطوات التدريب والأسئلة فهي داخل دروس سير العمل.' },
  'What you will achieve': { de: 'Was Sie erreichen', fr: 'Ce que vous allez accomplir', es: 'Lo que logrará', zh: '你将实现', hi: 'आप क्या हासिल करेंगे', ar: 'ما ستحققه' },
  'View this path as': { de: 'Pfad anzeigen als', fr: 'Voir ce parcours comme', es: 'Ver este camino como', zh: '按角色查看路径', hi: 'इस पथ को देखें', ar: 'اعرض هذا المسار كـ' },
  'Filter the workflow by role.': { de: 'Workflow nach Rolle filtern.', fr: 'Filtrer le workflow par rôle.', es: 'Filtrar el flujo por rol.', zh: '按角色筛选工作流。', hi: 'भूमिका के अनुसार वर्कफ़्लो फ़िल्टर करें।', ar: 'صفّ سير العمل حسب الدور.' },
  'All Users': { de: 'Alle Nutzer', fr: 'Tous les utilisateurs', es: 'Todos los usuarios', zh: '所有用户', hi: 'सभी उपयोगकर्ता', ar: 'كل المستخدمين' },
  'Sales Owner': { de: 'Sales Owner', fr: 'Responsable commercial', es: 'Responsable de ventas', zh: '销售负责人', hi: 'सेल्स ओनर', ar: 'مسؤول المبيعات' },
  'Sales Executive': { de: 'Sales Executive', fr: 'Commercial terrain', es: 'Ejecutivo de ventas', zh: '销售专员', hi: 'सेल्स एग्जीक्यूटिव', ar: 'تنفيذي المبيعات' },
  'Operations': { de: 'Operations', fr: 'Opérations', es: 'Operaciones', zh: '运营', hi: 'ऑपरेशंस', ar: 'العمليات' },
  'Dispatch': { de: 'Versand', fr: 'Expédition', es: 'Despacho', zh: '发运', hi: 'डिस्पैच', ar: 'الشحن' },
  'Manager': { de: 'Manager', fr: 'Manager', es: 'Gerente', zh: '经理', hi: 'मैनेजर', ar: 'المدير' },
  'Capture': { de: 'Erfassen', fr: 'Capturer', es: 'Capturar', zh: '采集', hi: 'कैप्चर', ar: 'التقاط' },
  'Convert': { de: 'Konvertieren', fr: 'Convertir', es: 'Convertir', zh: '转化', hi: 'कन्वर्ट', ar: 'التحويل' },
  'Execute': { de: 'Ausführen', fr: 'Exécuter', es: 'Ejecutar', zh: '执行', hi: 'एक्ज़ीक्यूट', ar: 'التنفيذ' },
  'Find and qualify the right opportunities': { de: 'Die richtigen Chancen finden und qualifizieren', fr: 'Trouver et qualifier les bonnes opportunités', es: 'Encontrar y calificar las oportunidades correctas', zh: '发现并筛选正确机会', hi: 'सही अवसर ढूंढें और क्वालिफाई करें', ar: 'العثور على الفرص المناسبة وتأهيلها' },
  'Create winning offers and get ready': { de: 'Gewinnende Angebote erstellen und vorbereiten', fr: 'Créer des offres gagnantes et se préparer', es: 'Crear ofertas ganadoras y prepararse', zh: '创建有竞争力的报价并做好准备', hi: 'बेहतर ऑफर बनाएं और तैयार रहें', ar: 'إنشاء عروض رابحة والاستعداد' },
  'Deliver and track with confidence': { de: 'Sicher liefern und verfolgen', fr: 'Livrer et suivre en confiance', es: 'Entregar y rastrear con confianza', zh: '自信交付并跟踪', hi: 'विश्वास के साथ डिलीवर और ट्रैक करें', ar: 'التسليم والتتبع بثقة' },
  'Open lesson ->': { de: 'Lektion öffnen ->', fr: 'Ouvrir la leçon ->', es: 'Abrir lección ->', zh: '打开课程 ->', hi: 'पाठ खोलें ->', ar: 'افتح الدرس ->' },
  'One connected flow. One source of truth.': { de: 'Ein verbundener Ablauf. Eine verlässliche Quelle.', fr: 'Un flux connecté. Une seule source de vérité.', es: 'Un flujo conectado. Una sola fuente de verdad.', zh: '一个连接的流程。一个事实来源。', hi: 'एक जुड़ा हुआ फ्लो। एक ही सत्य स्रोत।', ar: 'تدفق واحد متصل. مصدر واحد للحقيقة.' },
};

const allTranslations = new Map<string, string>();
Object.entries(translations).forEach(([english, byLang]) => {
  allTranslations.set(english, english);
  Object.values(byLang).forEach((value) => {
    if (value) allTranslations.set(value, english);
  });
});

function translateText(text: string, language: MarketingLang) {
  const prefix = text.match(/^\s*/)?.[0] ?? '';
  const suffix = text.match(/\s*$/)?.[0] ?? '';
  const trimmed = text.trim();
  const key = allTranslations.get(trimmed);
  if (!key) return text;
  const replacement = language === 'en' ? key : translations[key]?.[language] || key;
  return `${prefix}${replacement}${suffix}`;
}

function shouldSkip(node: Node) {
  const parent = node.parentElement;
  if (!parent) return true;
  if (parent.closest('[data-no-translate]')) return true;
  const tag = parent.tagName;
  return ['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEXTAREA', 'INPUT', 'SELECT', 'OPTION', 'SVG'].includes(tag);
}

function applyTranslations(language: MarketingLang) {
  if (typeof document === 'undefined') return;
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const nodes: Text[] = [];
  while (walker.nextNode()) {
    const node = walker.currentNode as Text;
    if (!shouldSkip(node) && node.textContent?.trim()) nodes.push(node);
  }
  nodes.forEach((node) => {
    const next = translateText(node.textContent || '', language);
    if (next !== node.textContent) node.textContent = next;
  });
}

export function GlobalTranslator() {
  const language = useMarketingLanguage();

  useEffect(() => {
    const run = () => applyTranslations(language);
    run();
    const timeout = window.setTimeout(run, 80);
    return () => window.clearTimeout(timeout);
  }, [language]);

  return null;
}
