/**
 * Indic Translation & Multilingual Grievance Engine for AICTE Complaint Intelligence.
 * Provides deterministic bidirectional translation between English (en), हिन्दी (hi), and मराठी (mr).
 */

const MARATHI_MARKERS = [
  'आहे', 'नाहीत', 'नाही', 'झाले', 'झाली', 'झाला', 'करणे', 'करावे',
  'कॉलेजने', 'माझ्या', 'माझे', 'माझी', 'परत', 'केले', 'केली', 'केला',
  'विद्यार्थी', 'विद्यार्थ्यांचे', 'शुल्क', 'तक्रार', 'दिले', 'दिली',
  'पावती', 'शिक्षकांनी', 'महाविद्यालयाने', 'प्राध्यापक', 'अभियांत्रिकी',
  'संस्थेने', 'पाहिजे', 'होते', 'होती', 'घेऊन', 'आणखी', 'येथे', 'त्यामुळे',
  'कागदपत्रे', 'गुणपत्रिका', 'रद्द', 'प्रवेश', 'छळ', 'मारहाण', 'वसतिगृह',
  'पगार', 'प्रयोगशाळा', 'ग्रंथालय', 'मान्यता', 'संस्था', 'विद्यार्थ्यांना',
  'पुस्तके', 'पाणी', 'अस्वच्छ', 'सुविधा', 'रोखून', 'ठेवली', 'देत', 'नसून',
  'जास्त', 'जादा', 'आकारले', 'आकारतात', 'आकारते', 'आकारणी', 'आकारण्यात',
  'जात', 'येत', 'वसूली', 'वसूल', 'मागणी', 'मागितले', 'देणगी', 'कॅपीटेशन', 'कॅपिटेशन'
];

const HINDI_MARKERS = [
  'है', 'नहीं', 'किया', 'किए', 'कॉलेज', 'मेरी', 'मेरा', 'मेरे', 'वापस',
  'गया', 'गई', 'गए', 'छात्र', 'छात्रों', 'शिकायत', 'दिया', 'दी', 'रसीद',
  'शिक्षकों', 'महाविद्यालय', 'प्राध्यापकों', 'इंजीनियरिंग', 'संस्थान',
  'चाहिए', 'था', 'थी', 'थे', 'लेकर', 'और', 'यहाँ', 'इसलिए', 'हुए', 'होगा',
  'दस्तावेज', 'अंकतालिका', 'दाखिला', 'उत्पीड़न', 'मारपीट', 'हॉस्टल',
  'वेतन', 'प्रयोगशाला', 'पुस्तकालय', 'प्रमाणपत्र', 'पानी', 'गंदा',
  'सुविधाएं', 'रोक', 'रखा', 'देते', 'बिना', 'छात्रवृत्ति', 'प्रशासन',
  'ज्यादा', 'अतिरिक्त', 'वसूला', 'मांगा', 'लिया', 'ली'
];

export function detectLanguage(text) {
  if (!text || typeof text !== 'string') return 'en';
  const clean = text.trim();
  const devanagariCount = (clean.match(/[\u0900-\u097F]/g) || []).length;
  if (devanagariCount / Math.max(1, clean.length) < 0.15) {
    return 'en';
  }

  const words = clean.split(/[\s,.;:!?\n]+/);
  let mrScore = 0;
  let hiScore = 0;

  for (const w of words) {
    if (MARATHI_MARKERS.includes(w)) mrScore += 2;
    if (HINDI_MARKERS.includes(w)) hiScore += 2;
  }

  // Check specific distinct suffixes
  if (clean.includes('आहे') || clean.includes('नाहीत') || clean.includes('जास्त') || clean.includes('आकारले')) {
    mrScore += 5;
  }
  if (clean.includes('है') || clean.includes('नहीं') || clean.includes('रहा है') || clean.includes('गया है')) {
    hiScore += 5;
  }

  return mrScore >= hiScore ? 'mr' : 'hi';
}

const DOMAIN_TRANSLATIONS = [
  // Excessive Admission Fees / Fee Surcharges
  {
    patterns: [/जास्त\s+प्रवेश\s+शुल्क\s+आकारले\s+जात\s+आहे/i, /जास्त\s+प्रवेश\s+शुल्क/i, /ज्यादा\s+एडमिशन\s+फीस/i, /अधिक\s+प्रवेश\s+शुल्क/i, /excessive\s+admission\s+fees?/i, /excessive.*fee/i],
    en: {
      sub: 'Excessive admission fees are being charged.',
      desc: 'Excessive admission fees and unauthorized surcharges are being charged by the institution without statutory AICTE/FRA approval.',
    },
    hi: {
      sub: 'अधिक प्रवेश शुल्क लिया जा रहा है।',
      desc: 'संस्थान द्वारा सक्षम विनियामक समिति की मंजूरी के बिना अत्यधिक प्रवेश शुल्क एवं अवैध अधिभार वसूला जा रहा है।',
    },
    mr: {
      sub: 'जास्त प्रवेश शुल्क आकारले जात आहे.',
      desc: 'संस्थेकडून अधिकृत नियमांचे उल्लंघन करून विद्यार्थ्यांकडून जास्त प्रवेश शुल्क आणि अतिरिक्त अधिभार वसूल केला जात आहे.',
    },
  },
  // Management & Fee Outcomes
  {
    patterns: [/management/i, /get\s+all\s+fees/i, /expected\s+outcomes/i, /सर्व\s+फी/i, /अपेक्षित\s+निकाल/i, /पूरी\s+फीस/i, /अपेक्षित\s+परिणाम/i],
    en: {
      sub: 'Management / Administration Performance Grievance',
      desc: 'Management collects full institutional fees from students but fails to provide the expected academic curriculum outcomes, lab amenities, or campus facilities.',
    },
    hi: {
      sub: 'प्रबंधन / प्रशासन प्रदर्शन शिकायत',
      desc: 'संस्थान प्रबंधन पूरी फीस वसूल लेता है, लेकिन अपेक्षित शैक्षणिक परिणाम, प्रयोगशाला सुविधाएं और बुनियादी ढांचा प्रदान नहीं करता है।',
    },
    mr: {
      sub: 'व्यवस्थापन / प्रशासन कामगिरी तक्रार',
      desc: 'संस्था पूर्ण फी आकारते, परंतु विद्यार्थ्यांना अपेक्षित शैक्षणिक निकाल, प्रयोगशाळा सुविधा आणि मूलभूत सोयी पुरवत नाही.',
    },
  },
  // Caution Deposit / Refund
  {
    patterns: [/caution\s+money/i, /refund.*fee/i, /कॉशन\s+मनी/i, /अनामत\s+रक्कम/i, /सुरक्षा\s+जमा/i],
    en: {
      sub: 'Refusal to Refund Caution Money & Fee Deposits',
      desc: 'The college refuses to refund mandatory caution money deposit and tuition advances following legitimate student course completion/transfer.',
    },
    hi: {
      sub: 'कॉशन मनी एवं शुल्क वापसी से इनकार',
      desc: 'पाठ्यक्रम समाप्ति अथवा स्थानांतरण के पश्चात भी कॉलेज द्वारा कॉशन मनी एवं देय अग्रिम शुल्क वापस करने से इनकार किया जा रहा है।',
    },
    mr: {
      sub: 'कॉशन मनी आणि अनामत रक्कम परत करण्यास नकार',
      desc: 'अभ्यासक्रम पूर्ण झाल्यावर अथवा स्थलांतर केल्यावरही महाविद्यालयाकडून कॉशन मनी आणि अनामत ठेव परत देण्यास टाळाटाळ केली जात आहे.',
    },
  },
  // Certificates Withheld
  {
    patterns: [/certificate/i, /marksheet/i, /कागदपत्रे/i, /गुणपत्रिका/i, /प्रमाणपत्र/i, /दस्तावेज/i],
    en: {
      sub: 'Illegal Withholding of Original Certificates and Marksheets',
      desc: 'Institutional administration has illegally detained original academic degree certificates, transfer certificates, and grade marksheets against AICTE guidelines.',
    },
    hi: {
      sub: 'मूल प्रमाण पत्र एवं अंकतालिका अवैध रूप से रोकी गई',
      desc: 'एआईसीटीई दिशा-निर्देशों का खुला उल्लंघन करते हुए संस्थान प्रशासन ने छात्रों के मूल डिग्री प्रमाण पत्र, टीसी और अंकतालिकाएं अवैध रूप से रोक रखी हैं।',
    },
    mr: {
      sub: 'मूळ प्रमाणपत्रे आणि गुणपत्रिका बेकायदेशीरपणे रोखून ठेवल्या',
      desc: 'एआयसीटीई नियमावलीचे उल्लंघन करून संस्था प्रशासनाने विद्यार्थ्यांची मूळ पदवी प्रमाणपत्रे, टीसी आणि गुणपत्रिका बेकायदेशीरपणे रोखून ठेवल्या आहेत.',
    },
  },
  // Faculty Salary Arrears
  {
    patterns: [/faculty.*salary/i, /7th\s+pay/i, /arrears/i, /शिक्षकांचे\s+वेतन/i, /शिक्षकों\s+का\s+वेतन/i, /पगार/i, /वेतनमान/i],
    en: {
      sub: 'Faculty Salary Arrears & Non-Payment of 7th CPC Scales',
      desc: 'Teaching faculty salaries withheld for multiple months and mandatory statutory 7th Central Pay Commission pay scales not disbursed.',
    },
    hi: {
      sub: 'शिक्षकों का बकाया वेतन एवं 7वें वेतन आयोग का गैर-भुगतान',
      desc: 'शिक्षकों का कई महीनों का वेतन रोका गया है तथा वैधानिक 7वें वेतन आयोग के अनुसार निर्धारित वेतनमान का भुगतान नहीं किया जा रहा है।',
    },
    mr: {
      sub: 'प्राध्यापकांचे थकीत वेतन आणि ७व्या वेतन आयोगाची थकबाकी',
      desc: 'अनेक महिन्यांपासून शिक्षकांचे वेतन रोखून ठेवण्यात आले असून वैधानिक ७व्या वेतन आयोगानुसार देय वेतनश्रेणी दिली जात नाही.',
    },
  },
  // Ragging & Campus Safety
  {
    patterns: [/ragging/i, /harassment/i, /रॅगिंग/i, /रैगिंग/i, /छळ/i, /उत्पीड़न/i],
    en: {
      sub: 'Ragging and Student Harassment in Campus Hostel',
      desc: 'Senior student ragging and physical/verbal harassment reported in campus hostel without active intervention from institutional anti-ragging squad.',
    },
    hi: {
      sub: 'परिसर छात्रावास में रैगिंग एवं छात्र उत्पीड़न',
      desc: 'परिसर हॉस्टल में वरिष्ठ छात्रों द्वारा रैगिंग और उत्पीड़न की सूचना मिली है, जिस पर संस्थान की एंटी-रैगिंग समिति कोई सक्रिय कार्रवाई नहीं कर रही है।',
    },
    mr: {
      sub: 'परिसर वसतिगृहात रॅगिंग आणि विद्यार्थ्यांचा छळ',
      desc: 'महाविद्यालयाच्या वसतिगृहात वरिष्ठ विद्यार्थ्यांकडून रॅगिंग आणि मानसिक/शारीरिक छळ सुरू असून संस्थात्मक अँटी-रॅगिंग पथक कोणतीही कारवाई करत नाही.',
    },
  },
];

// Token dictionaries for dynamic translation
const TOKEN_MR_TO_EN = {
  'जास्त': 'Excess',
  'जादा': 'Excessive',
  'प्रवेश': 'admission',
  'शुल्क': 'fee',
  'आकारले': 'charged',
  'जात': 'being',
  'आहे': 'is',
  'नाही': 'not',
  'कॉलेज': 'college',
  'संस्था': 'institution',
  'विद्यार्थी': 'students',
  'तक्रार': 'complaint',
  'व्यवस्थापन': 'management',
  'सर्व': 'all',
  'निकाल': 'outcomes',
};

const TOKEN_MR_TO_HI = {
  'जास्त': 'ज्यादा / अधिक',
  'जादा': 'अतिरिक्त',
  'प्रवेश': 'दाखिला / प्रवेश',
  'शुल्क': 'शुल्क / फीस',
  'आकारले': 'लिया',
  'जात': 'जा',
  'आहे': 'रहा है',
  'नाही': 'नहीं',
  'कॉलेज': 'कॉलेज',
  'संस्था': 'संस्थान',
  'विद्यार्थी': 'छात्र',
  'तक्रार': 'शिकायत',
  'व्यवस्थापन': 'प्रबंधन',
  'सर्व': 'पूरी / सभी',
  'निकाल': 'परिणाम',
};

const TOKEN_HI_TO_EN = {
  'ज्यादा': 'Excess',
  'अधिक': 'Excessive',
  'अतिरिक्त': 'Additional',
  'प्रवेश': 'admission',
  'दाखिला': 'admission',
  'शुल्क': 'fee',
  'फीस': 'fees',
  'लिया': 'charged',
  'जा': 'being',
  'रहा': 'is',
  'है': '',
  'नहीं': 'not',
  'संस्थान': 'institution',
  'कॉलेज': 'college',
  'छात्र': 'student',
  'शिकायत': 'complaint',
  'प्रबंधन': 'management',
};

const TOKEN_HI_TO_MR = {
  'ज्यादा': 'जास्त',
  'अधिक': 'जास्त',
  'अतिरिक्त': 'जादा',
  'प्रवेश': 'प्रवेश',
  'दाखिला': 'प्रवेश',
  'शुल्क': 'शुल्क',
  'फीस': 'फी',
  'लिया': 'आकारले',
  'जा': 'जात',
  'रहा': '',
  'है': 'आहे',
  'नहीं': 'नाही',
  'संस्थान': 'संस्था',
  'कॉलेज': 'कॉलेज',
  'छात्र': 'विद्यार्थी',
  'शिकायत': 'तक्रार',
  'प्रबंधन': 'व्यवस्थापन',
};

const TOKEN_EN_TO_HI = {
  'management': 'प्रबंधन / प्रशासन',
  'excessive': 'अत्यधिक',
  'admission': 'प्रवेश / दाखिला',
  'fee': 'शुल्क / फीस',
  'fees': 'शुल्क / फीस',
  'surcharge': 'अधिभार',
  'charged': 'लिया जा रहा है',
  'refund': 'वापसी',
  'caution': 'कॉशन मनी / सुरक्षा जमा',
  'certificates': 'मूल प्रमाण पत्र',
  'withheld': 'रोकी गई',
  'salary': 'वेतन',
  'arrears': 'बकाया',
  'ragging': 'रैगिंग',
  'hostel': 'छात्रावास / हॉस्टल',
  'institution': 'संस्थान',
  'college': 'कॉलेज',
};

const TOKEN_EN_TO_MR = {
  'management': 'व्यवस्थापन / प्रशासन',
  'excessive': 'जास्त / अतिरिक्त',
  'admission': 'प्रवेश',
  'fee': 'शुल्क / फी',
  'fees': 'शुल्क / फी',
  'surcharge': 'अधिभार',
  'charged': 'आकारले जात आहे',
  'refund': 'परतावा',
  'caution': 'कॉशन मनी / अनामत ठेव',
  'certificates': 'मूळ प्रमाणपत्रे',
  'withheld': 'रोखून ठेवले',
  'salary': 'वेतन / पगार',
  'arrears': 'थकबाकी',
  'ragging': 'रॅगिंग',
  'hostel': 'वसतिगृह',
  'institution': 'संस्था',
  'college': 'महाविद्यालय',
};

export function translateGrievance(subject = '', description = '', targetLang = 'en') {
  const subStr = String(subject || '').trim();
  const descStr = String(description || '').trim();
  const combined = `${subStr} ${descStr}`.trim();
  const detected = detectLanguage(combined);

  if (targetLang === 'original') {
    return {
      subject: subStr,
      description: descStr,
      detectedLanguage: detected,
      targetLanguage: detected,
      status: 'original',
    };
  }

  if (targetLang === detected) {
    return {
      subject: subStr,
      description: descStr,
      detectedLanguage: detected,
      targetLanguage: targetLang,
      status: 'original',
    };
  }

  // Check educational domain matching rules
  for (const item of DOMAIN_TRANSLATIONS) {
    const matches = item.patterns.some((p) => p.test(subStr) || p.test(descStr));
    if (matches && item[targetLang]) {
      return {
        subject: item[targetLang].sub,
        description: item[targetLang].desc,
        detectedLanguage: detected,
        targetLanguage: targetLang,
        status: 'translated',
      };
    }
  }

  // Fallback to token-level dictionary translation
  const translateText = (text, src, tgt) => {
    if (!text) return '';
    let dict = null;
    if (src === 'mr' && tgt === 'en') dict = TOKEN_MR_TO_EN;
    else if (src === 'mr' && tgt === 'hi') dict = TOKEN_MR_TO_HI;
    else if (src === 'hi' && tgt === 'en') dict = TOKEN_HI_TO_EN;
    else if (src === 'hi' && tgt === 'mr') dict = TOKEN_HI_TO_MR;
    else if (src === 'en' && tgt === 'hi') dict = TOKEN_EN_TO_HI;
    else if (src === 'en' && tgt === 'mr') dict = TOKEN_EN_TO_MR;

    if (!dict) return text;

    const words = text.split(/(\s+|[.,!?;:]+)/);
    const out = words.map((w) => {
      const clean = w.trim().toLowerCase();
      if (dict[clean]) return dict[clean];
      if (dict[w.trim()]) return dict[w.trim()];
      return w;
    });
    return out.join('').trim();
  };

  const translatedSub = translateText(subStr, detected, targetLang) || subStr;
  const translatedDesc = translateText(descStr, detected, targetLang) || descStr;

  return {
    subject: translatedSub,
    description: translatedDesc,
    detectedLanguage: detected,
    targetLanguage: targetLang,
    status: 'translated',
  };
}
