import type { MarketingLang } from './language-selector';

type TranslationMap = Partial<Record<MarketingLang, string>>;

export const additionalTranslations: Record<string, TranslationMap> = {
  // Homepage proof cards and workflow
  'Trade Command Center — lead pressure, pipeline value and Guru actions in one view': { de: 'Trade Command Center — Lead-Druck, Pipeline-Wert und Guru-Aktionen in einer Ansicht', fr: 'Centre de commande — pression des leads, valeur du pipeline et actions Guru en une vue', es: 'Centro de comando — presión de leads, valor del pipeline y acciones de Guru en una vista', zh: '贸易指挥中心 — 线索压力、管道价值和 Guru 操作一览', hi: 'ट्रेड कमांड सेंटर — लीड प्रेशर, पाइपलाइन वैल्यू और Guru एक ही दृश्य में', ar: 'مركز قيادة التجارة — ضغط العملاء المحتملين وقيمة المسار وإجراءات Guru في عرض واحد' },
  'Trade events': { de: 'Messen', fr: 'Salons professionnels', es: 'Eventos comerciales', zh: '贸易活动', hi: 'ट्रेड इवेंट्स', ar: 'المعارض التجارية' },
  'Leads captured at the show, lost after it.': { de: 'Leads auf der Messe erfasst, danach verloren.', fr: 'Des leads capturés sur le salon, perdus ensuite.', es: 'Leads capturados en la feria, perdidos después.', zh: '展会上获取的线索，展后却丢失。', hi: 'शो में कैप्चर हुई लीड्स, बाद में खो जाती हैं।', ar: 'عملاء محتملون يتم التقاطهم في المعرض ثم يضيعون بعده.' },
  'Setu Flow keeps event source, ownership and follow-up in one place — not a CSV export you import a week later.': { de: 'Setu Flow hält Event-Quelle, Verantwortung und Follow-up an einem Ort — nicht in einem CSV-Export, der erst eine Woche später importiert wird.', fr: 'Setu Flow garde la source de l’événement, le responsable et le suivi au même endroit — pas dans un CSV importé une semaine plus tard.', es: 'Setu Flow mantiene la fuente del evento, el responsable y el seguimiento en un solo lugar, no en un CSV importado una semana después.', zh: 'Setu Flow 将活动来源、负责人和跟进放在同一处，而不是一周后才导入的 CSV。', hi: 'Setu Flow इवेंट स्रोत, ओनरशिप और फॉलो-अप को एक जगह रखता है — एक हफ्ते बाद आयात होने वाली CSV में नहीं।', ar: 'يحافظ Setu Flow على مصدر الحدث والملكية والمتابعة في مكان واحد، وليس في ملف CSV يتم استيراده بعد أسبوع.' },
  'Quote workflow': { de: 'Angebotsworkflow', fr: 'Workflow de devis', es: 'Flujo de cotización', zh: '报价流程', hi: 'कोट वर्कफ़्लो', ar: 'سير عمل العروض' },
  'Documents': { de: 'Dokumente', fr: 'Documents', es: 'Documentos', zh: '文件', hi: 'दस्तावेज़', ar: 'المستندات' },
  'Workflow': { de: 'Workflow', fr: 'Workflow', es: 'Flujo de trabajo', zh: '工作流', hi: 'वर्कफ़्लो', ar: 'سير العمل' },
  'From first share to final dispatch.': { de: 'Vom ersten Teilen bis zum finalen Versand.', fr: 'Du premier partage à l’expédition finale.', es: 'Del primer intercambio al despacho final.', zh: '从首次分享，到最终发运。', hi: 'पहली शेयरिंग से अंतिम डिस्पैच तक।', ar: 'من أول مشاركة إلى آخر شحنة.' },
  'Every step stays connected — source context, ownership, terms, compliance and dispatch status move with the deal instead of getting lost between tools.': { de: 'Jeder Schritt bleibt verbunden — Quelle, Verantwortung, Konditionen, Compliance und Versandstatus bewegen sich mit dem Deal, statt zwischen Tools verloren zu gehen.', fr: 'Chaque étape reste connectée — contexte source, responsable, conditions, conformité et statut d’expédition avancent avec l’affaire au lieu de se perdre entre les outils.', es: 'Cada paso queda conectado: contexto de origen, responsable, términos, cumplimiento y estado de despacho avanzan con el acuerdo en lugar de perderse entre herramientas.', zh: '每一步都保持连接——来源背景、负责人、条款、合规和发运状态随交易一起推进，而不是在工具之间丢失。', hi: 'हर चरण जुड़ा रहता है — स्रोत संदर्भ, ओनरशिप, शर्तें, अनुपालन और डिस्पैच स्थिति डील के साथ चलती है।', ar: 'تبقى كل خطوة متصلة — سياق المصدر والملكية والشروط والامتثال وحالة الشحن تتحرك مع الصفقة بدلا من الضياع بين الأدوات.' },
  'vCard': { de: 'vCard', fr: 'vCard', es: 'vCard', zh: 'vCard', hi: 'vCard', ar: 'vCard' },
  'Event': { de: 'Event', fr: 'Événement', es: 'Evento', zh: '活动', hi: 'इवेंट', ar: 'حدث' },
  'Lead': { de: 'Lead', fr: 'Lead', es: 'Lead', zh: '线索', hi: 'लीड', ar: 'عميل محتمل' },
  'Quote': { de: 'Angebot', fr: 'Devis', es: 'Cotización', zh: '报价', hi: 'कोट', ar: 'عرض' },

  // Shared page titles / CTAs
  'Product walkthrough': { de: 'Produkt-Walkthrough', fr: 'Visite produit', es: 'Recorrido del producto', zh: '产品演示', hi: 'उत्पाद walkthrough', ar: 'جولة المنتج' },
  'See Setu Flow mapped to your trade workflow.': { de: 'Sehen Sie Setu Flow auf Ihren Handelsworkflow abgebildet.', fr: 'Découvrez Setu Flow appliqué à votre workflow commercial.', es: 'Vea Setu Flow aplicado a su flujo comercial.', zh: '查看 Setu Flow 如何映射到您的贸易流程。', hi: 'देखें Setu Flow आपके ट्रेड वर्कफ़्लो से कैसे मेल खाता है।', ar: 'شاهد كيف يتوافق Setu Flow مع سير عمل تجارتك.' },
  'A focused walkthrough for your vCard, event capture, quote management, documents, dispatch, integrations and Setu Guru needs.': { de: 'Ein fokussierter Walkthrough für vCard, Event-Erfassung, Angebotsmanagement, Dokumente, Versand, Integrationen und Setu Guru.', fr: 'Une visite ciblée pour vos besoins vCard, capture d’événements, devis, documents, expédition, intégrations et Setu Guru.', es: 'Un recorrido enfocado para vCard, captura de eventos, cotizaciones, documentos, despacho, integraciones y Setu Guru.', zh: '围绕 vCard、活动采集、报价管理、文件、发运、集成和 Setu Guru 的重点演示。', hi: 'vCard, इवेंट कैप्चर, कोट मैनेजमेंट, दस्तावेज़, डिस्पैच, इंटीग्रेशन और Setu Guru जरूरतों के लिए केंद्रित walkthrough।', ar: 'جولة مركزة لاحتياجات vCard والتقاط الأحداث وإدارة العروض والمستندات والشحن والتكاملات وSetu Guru.' },
  'Explore Platform': { de: 'Plattform ansehen', fr: 'Explorer la plateforme', es: 'Explorar plataforma', zh: '探索平台', hi: 'प्लेटफ़ॉर्म देखें', ar: 'استكشف المنصة' },
  'Book walkthrough': { de: 'Walkthrough buchen', fr: 'Réserver une visite', es: 'Reservar recorrido', zh: '预约演示', hi: 'walkthrough बुक करें', ar: 'احجز جولة' },

  // Platform and solutions
  'Built for the teams that carry trade from conversation to shipment.': { de: 'Gebaut für Teams, die Handel vom Gespräch bis zur Lieferung tragen.', fr: 'Conçu pour les équipes qui mènent le commerce de la conversation à l’expédition.', es: 'Creado para equipos que llevan el comercio desde la conversación hasta el envío.', zh: '为从沟通到发运推进贸易的团队而构建。', hi: 'उन टीमों के लिए बनाया गया जो बातचीत से शिपमेंट तक व्यापार चलाती हैं।', ar: 'مصمم للفرق التي تنقل التجارة من المحادثة إلى الشحن.' },
  'Setu Flow is strongest when commercial and operations teams work from the same system instead of passing spreadsheets and emails back and forth.': { de: 'Setu Flow ist am stärksten, wenn Vertrieb und Operations im selben System arbeiten, statt Tabellen und E-Mails hin und her zu senden.', fr: 'Setu Flow est plus puissant quand les équipes commerciales et opérationnelles travaillent dans le même système au lieu d’échanger tableurs et e-mails.', es: 'Setu Flow funciona mejor cuando los equipos comerciales y operativos trabajan en el mismo sistema, no enviando hojas y correos.', zh: '当商务和运营团队在同一系统中工作，而不是来回传表格和邮件时，Setu Flow 最强。', hi: 'Setu Flow तब सबसे मजबूत है जब कमर्शियल और ऑपरेशंस टीमें एक ही सिस्टम में काम करती हैं।', ar: 'يكون Setu Flow أقوى عندما تعمل فرق المبيعات والعمليات من نفس النظام بدلا من تبادل الجداول والبريد.' },
  'See the platform': { de: 'Plattform ansehen', fr: 'Voir la plateforme', es: 'Ver la plataforma', zh: '查看平台', hi: 'प्लेटफ़ॉर्म देखें', ar: 'شاهد المنصة' },
  'Who it is built for': { de: 'Für wen es gebaut ist', fr: 'Pour qui c’est conçu', es: 'Para quién está creado', zh: '适用对象', hi: 'किसके लिए बनाया गया', ar: 'لمن صُمم' },
  'Every team in the trade chain.': { de: 'Jedes Team in der Handelskette.', fr: 'Chaque équipe de la chaîne commerciale.', es: 'Cada equipo en la cadena comercial.', zh: '贸易链中的每个团队。', hi: 'ट्रेड चेन की हर टीम।', ar: 'كل فريق في سلسلة التجارة.' },
  'The product maps to how import-export teams actually divide work — commercial, operations, field and leadership.': { de: 'Das Produkt bildet ab, wie Import-Export-Teams Arbeit wirklich aufteilen — Vertrieb, Operations, Außendienst und Führung.', fr: 'Le produit correspond à la vraie répartition du travail import-export — commercial, opérations, terrain et direction.', es: 'El producto refleja cómo los equipos de importación y exportación dividen realmente el trabajo: comercial, operaciones, campo y dirección.', zh: '产品映射进出口团队实际分工：商务、运营、现场和管理层。', hi: 'यह उत्पाद दिखाता है कि इंपोर्ट-एक्सपोर्ट टीमें काम कैसे बांटती हैं — कमर्शियल, ऑपरेशंस, फील्ड और लीडरशिप।', ar: 'يعكس المنتج كيفية تقسيم فرق الاستيراد والتصدير للعمل فعليا — تجاري، عمليات، ميداني وقيادة.' },
  'Exporters': { de: 'Exporteure', fr: 'Exportateurs', es: 'Exportadores', zh: '出口商', hi: 'निर्यातक', ar: 'المصدرون' },
  'Importers': { de: 'Importeure', fr: 'Importateurs', es: 'Importadores', zh: '进口商', hi: 'आयातक', ar: 'المستوردون' },
  'Commercial teams': { de: 'Kommerzielle Teams', fr: 'Équipes commerciales', es: 'Equipos comerciales', zh: '商务团队', hi: 'कमर्शियल टीमें', ar: 'الفرق التجارية' },
  'Operations teams': { de: 'Operations-Teams', fr: 'Équipes opérations', es: 'Equipos de operaciones', zh: '运营团队', hi: 'ऑपरेशंस टीमें', ar: 'فرق العمليات' },
  'Markets': { de: 'Märkte', fr: 'Marchés', es: 'Mercados', zh: '市场', hi: 'बाज़ार', ar: 'الأسواق' },
  'Active in India, Ireland, UK, Germany and the US.': { de: 'Aktiv in Indien, Irland, UK, Deutschland und den USA.', fr: 'Actif en Inde, Irlande, Royaume-Uni, Allemagne et aux États-Unis.', es: 'Activo en India, Irlanda, Reino Unido, Alemania y EE. UU.', zh: '活跃于印度、爱尔兰、英国、德国和美国。', hi: 'भारत, आयरलैंड, UK, जर्मनी और US में सक्रिय।', ar: 'نشط في الهند وأيرلندا والمملكة المتحدة وألمانيا والولايات المتحدة.' },
  'Book a solution-specific walkthrough': { de: 'Lösungsspezifischen Walkthrough buchen', fr: 'Réserver une visite adaptée', es: 'Reservar recorrido específico', zh: '预约针对方案的演示', hi: 'समाधान-विशेष walkthrough बुक करें', ar: 'احجز جولة مخصصة للحل' },

  // Guru page
  'AI that knows your trade workflow.': { de: 'KI, die Ihren Handelsworkflow kennt.', fr: 'Une IA qui connaît votre workflow commercial.', es: 'IA que entiende su flujo comercial.', zh: '懂您贸易流程的 AI。', hi: 'AI जो आपके ट्रेड वर्कफ़्लो को समझता है।', ar: 'ذكاء اصطناعي يعرف سير عمل تجارتك.' },
  'Setu Guru is not a generic chatbot. It works inside the context of your actual contacts, quotes, documents and orders — and always waits for operator approval before anything happens.': { de: 'Setu Guru ist kein generischer Chatbot. Er arbeitet im Kontext Ihrer echten Kontakte, Angebote, Dokumente und Aufträge — und wartet immer auf Operator-Freigabe.', fr: 'Setu Guru n’est pas un chatbot générique. Il travaille dans le contexte de vos contacts, devis, documents et commandes — avec validation opérateur avant toute action.', es: 'Setu Guru no es un chatbot genérico. Trabaja con el contexto real de contactos, cotizaciones, documentos y pedidos, y espera aprobación del operador.', zh: 'Setu Guru 不是通用聊天机器人。它基于真实联系人、报价、文件和订单工作，并始终等待操作员批准。', hi: 'Setu Guru कोई सामान्य चैटबॉट नहीं है। यह आपके वास्तविक संपर्क, कोट, दस्तावेज़ और ऑर्डर के संदर्भ में काम करता है और हमेशा ऑपरेटर अनुमति का इंतज़ार करता है।', ar: 'Setu Guru ليس روبوت دردشة عاما. يعمل داخل سياق جهات الاتصال والعروض والمستندات والطلبات الفعلية، وينتظر دائما موافقة المشغل قبل أي إجراء.' },
  'See Guru in a walkthrough': { de: 'Guru im Walkthrough sehen', fr: 'Voir Guru en démonstration', es: 'Ver Guru en un recorrido', zh: '观看 Guru 演示', hi: 'Guru walkthrough देखें', ar: 'شاهد Guru في جولة' },
  'Explore platform': { de: 'Plattform ansehen', fr: 'Explorer la plateforme', es: 'Explorar plataforma', zh: '探索平台', hi: 'प्लेटफ़ॉर्म देखें', ar: 'استكشف المنصة' },
  'Operator-approved': { de: 'Operator-freigegeben', fr: 'Validé par opérateur', es: 'Aprobado por operador', zh: '操作员批准', hi: 'ऑपरेटर-अनुमोदित', ar: 'بموافقة المشغل' },
  'Where Guru helps': { de: 'Wo Guru hilft', fr: 'Où Guru aide', es: 'Dónde ayuda Guru', zh: 'Guru 如何帮助', hi: 'Guru कहाँ मदद करता है', ar: 'أين يساعد Guru' },
  'A trade intelligence layer across every stage.': { de: 'Eine Trade-Intelligence-Schicht über jede Phase.', fr: 'Une couche d’intelligence commerciale à chaque étape.', es: 'Una capa de inteligencia comercial en cada etapa.', zh: '贯穿每个阶段的贸易智能层。', hi: 'हर चरण में ट्रेड इंटेलिजेंस लेयर।', ar: 'طبقة ذكاء تجاري عبر كل مرحلة.' },
  'Guru suggests. Your team approves. Nothing is sent automatically.': { de: 'Guru schlägt vor. Ihr Team genehmigt. Nichts wird automatisch gesendet.', fr: 'Guru suggère. Votre équipe approuve. Rien n’est envoyé automatiquement.', es: 'Guru sugiere. Su equipo aprueba. Nada se envía automáticamente.', zh: 'Guru 提建议。团队批准。不会自动发送。', hi: 'Guru सुझाव देता है। आपकी टीम मंज़ूरी देती है। कुछ भी अपने-आप नहीं भेजा जाता।', ar: 'يقترح Guru. يوافق فريقك. لا يتم إرسال أي شيء تلقائيا.' },

  // Mobile / pricing / compare
  'Field Mobile': { de: 'Field Mobile', fr: 'Mobile terrain', es: 'Móvil de campo', zh: '现场移动端', hi: 'फील्ड मोबाइल', ar: 'الجوال الميداني' },
  'The full CRM in your pocket. Not a viewer.': { de: 'Das volle CRM in der Tasche. Kein Viewer.', fr: 'Le CRM complet dans votre poche. Pas un simple lecteur.', es: 'El CRM completo en su bolsillo. No solo un visor.', zh: '口袋里的完整 CRM，不只是查看器。', hi: 'पूरा CRM आपकी जेब में। सिर्फ व्यूअर नहीं।', ar: 'CRM كامل في جيبك. ليس مجرد عارض.' },
  'Plans built around workflow maturity.': { de: 'Pläne rund um Workflow-Reife.', fr: 'Des offres selon la maturité du workflow.', es: 'Planes según la madurez del flujo.', zh: '围绕流程成熟度设计的方案。', hi: 'वर्कफ़्लो परिपक्वता के अनुसार प्लान।', ar: 'خطط مبنية حول نضج سير العمل.' },
  'Starter': { de: 'Starter', fr: 'Starter', es: 'Inicial', zh: '入门版', hi: 'स्टार्टर', ar: 'البداية' },
  'Growth': { de: 'Growth', fr: 'Croissance', es: 'Crecimiento', zh: '成长版', hi: 'ग्रोथ', ar: 'النمو' },
  'Enterprise': { de: 'Enterprise', fr: 'Entreprise', es: 'Empresa', zh: '企业版', hi: 'एंटरप्राइज', ar: 'المؤسسات' },
  'Custom': { de: 'Individuell', fr: 'Sur mesure', es: 'Personalizado', zh: '定制', hi: 'कस्टम', ar: 'مخصص' },
  'Capability': { de: 'Fähigkeit', fr: 'Capacité', es: 'Capacidad', zh: '能力', hi: 'क्षमता', ar: 'القدرة' },
  'Excel + Email': { de: 'Excel + E-Mail', fr: 'Excel + e-mail', es: 'Excel + correo', zh: 'Excel + 邮件', hi: 'Excel + ईमेल', ar: 'Excel + البريد' },
  'Generic CRM': { de: 'Generisches CRM', fr: 'CRM générique', es: 'CRM genérico', zh: '通用 CRM', hi: 'जेनेरिक CRM', ar: 'CRM عام' },

  // Training lessons deeper labels
  'All lessons': { de: 'Alle Lektionen', fr: 'Toutes les leçons', es: 'Todas las lecciones', zh: '所有课程', hi: 'सभी पाठ', ar: 'كل الدروس' },
  'screens': { de: 'Screens', fr: 'écrans', es: 'pantallas', zh: '屏幕', hi: 'स्क्रीन', ar: 'شاشات' },
  'Mark complete': { de: 'Als erledigt markieren', fr: 'Marquer comme terminé', es: 'Marcar completo', zh: '标记完成', hi: 'पूर्ण मार्क करें', ar: 'وضع علامة مكتمل' },
  'Completed': { de: 'Erledigt', fr: 'Terminé', es: 'Completado', zh: '已完成', hi: 'पूर्ण', ar: 'مكتمل' },
  'Screen': { de: 'Screen', fr: 'Écran', es: 'Pantalla', zh: '屏幕', hi: 'स्क्रीन', ar: 'الشاشة' },
  'of': { de: 'von', fr: 'sur', es: 'de', zh: '共', hi: 'में से', ar: 'من' },
  'What you are looking at': { de: 'Was Sie sehen', fr: 'Ce que vous voyez', es: 'Lo que está viendo', zh: '您正在查看', hi: 'आप क्या देख रहे हैं', ar: 'ما الذي تراه' },
  'Click / tap this first': { de: 'Zuerst klicken / tippen', fr: 'Cliquez / touchez ceci en premier', es: 'Haga clic / toque esto primero', zh: '首先点击这里', hi: 'पहले यहाँ क्लिक / टैप करें', ar: 'انقر / اضغط هذا أولا' },
  'Check before saving': { de: 'Vor dem Speichern prüfen', fr: 'Vérifier avant d’enregistrer', es: 'Verificar antes de guardar', zh: '保存前检查', hi: 'सेव करने से पहले जांचें', ar: 'تحقق قبل الحفظ' },
  'Done when': { de: 'Fertig, wenn', fr: 'Terminé quand', es: 'Listo cuando', zh: '完成条件', hi: 'कब पूरा माना जाए', ar: 'يكتمل عندما' },
  'Tip:': { de: 'Tipp:', fr: 'Conseil :', es: 'Consejo:', zh: '提示：', hi: 'टिप:', ar: 'نصيحة:' },
  'Click to zoom': { de: 'Zum Vergrößern klicken', fr: 'Cliquer pour zoomer', es: 'Clic para ampliar', zh: '点击放大', hi: 'ज़ूम के लिए क्लिक करें', ar: 'انقر للتكبير' },
  'Screenshot preview': { de: 'Screenshot-Vorschau', fr: 'Aperçu de capture', es: 'Vista previa', zh: '截图预览', hi: 'स्क्रीनशॉट प्रीव्यू', ar: 'معاينة لقطة الشاشة' },
  'Close': { de: 'Schließen', fr: 'Fermer', es: 'Cerrar', zh: '关闭', hi: 'बंद करें', ar: 'إغلاق' },
  'Knowledge check': { de: 'Wissenscheck', fr: 'Contrôle des connaissances', es: 'Comprobación de conocimiento', zh: '知识检查', hi: 'नॉलेज चेक', ar: 'اختبار المعرفة' },
  'Correct': { de: 'Richtig', fr: 'Correct', es: 'Correcto', zh: '正确', hi: 'सही', ar: 'صحيح' },
  'Review': { de: 'Überprüfen', fr: 'À revoir', es: 'Revisar', zh: '复习', hi: 'रिव्यू', ar: 'راجع' },
  'Back to top': { de: 'Nach oben', fr: 'Retour en haut', es: 'Volver arriba', zh: '返回顶部', hi: 'ऊपर जाएं', ar: 'العودة للأعلى' },
  'Your training status': { de: 'Ihr Trainingsstatus', fr: 'Votre statut de formation', es: 'Su estado de formación', zh: '您的培训状态', hi: 'आपकी ट्रेनिंग स्थिति', ar: 'حالة تدريبك' },
  'Modules done': { de: 'Module erledigt', fr: 'Modules terminés', es: 'Módulos completados', zh: '已完成模块', hi: 'पूर्ण मॉड्यूल', ar: 'الوحدات المكتملة' },
  'Reset all progress': { de: 'Fortschritt zurücksetzen', fr: 'Réinitialiser la progression', es: 'Restablecer progreso', zh: '重置进度', hi: 'प्रगति रीसेट करें', ar: 'إعادة ضبط التقدم' },
};
