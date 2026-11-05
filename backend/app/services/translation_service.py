"""
Translation and Multilingual Processing Service for AICTE Complaint Intelligence (Feature 3.6).
Provides deterministic, offline bidirectional language detection and grievance-domain translation for
English (en), हिन्दी (hi), and मराठी (mr).
"""

from datetime import datetime, timezone
import re
from typing import Dict, Optional, Tuple


class TranslationService:
    """
    Intelligent Indic and Multilingual Service for AICTE grievances.
    Detects language without network calls, normalizes grievances into
    standard English analysis tokens for AI modules, and provides on-demand
    translations to English, Hindi, and Marathi while strictly preserving original complaint text.
    """

    # Distinctive Marathi lexical markers and tokens
    MARATHI_MARKERS = {
        "आहे", "नाहीत", "नाही", "झाले", "झाली", "झाला", "करणे", "करावे",
        "कॉलेजने", "माझ्या", "माझे", "माझी", "परत", "केले", "केली", "केला",
        "विद्यार्थी", "विद्यार्थ्यांचे", "शुल्क", "तक्रार", "दिले", "दिली",
        "पावती", "शिक्षकांनी", "महाविद्यालयाने", "प्राध्यापक", "अभियांत्रिकी",
        "संस्थेने", "पाहिजे", "होते", "होती", "घेऊन", "आणखी", "येथे", "त्यामुळे",
        "कागदपत्रे", "गुणपत्रिका", "रद्द", "प्रवेश", "छळ", "मारहाण", "वसतिगृह",
        "पगार", "प्रयोगशाळा", "ग्रंथालय", "मान्यता", "संस्था", "विद्यार्थ्यांना",
        "पुस्तके", "पाणी", "अस्वच्छ", "सुविधा", "रोखून", "ठेवली", "देत", "नसून",
        "जास्त", "जादा", "आकारले", "आकारतात", "आकारते", "आकारणी", "आकारण्यात",
        "जात", "येत", "वसूली", "वसूल", "मागणी", "मागितले", "देणगी", "कॅपीटेशन", "कॅपिटेशन"
    }

    # Distinctive Hindi lexical markers and tokens
    HINDI_MARKERS = {
        "है", "नहीं", "किया", "किए", "कॉलेज", "मेरी", "मेरा", "मेरे", "वापस",
        "गया", "गई", "गए", "छात्र", "छात्रों", "शिकायत", "दिया", "दी", "रसीद",
        "शिक्षकों", "महाविद्यालय", "प्राध्यापकों", "इंजीनियरिंग", "संस्थान",
        "चाहिए", "था", "थी", "थे", "लेकर", "और", "यहाँ", "इसलिए", "हुए", "होगा",
        "दस्तावेज", "अंकतालिका", "दाखिला", "उत्पीड़न", "मारपीट", "हॉस्टल",
        "वेतन", "प्रयोगशाला", "पुस्तकालय", "प्रमाणपत्र", "पानी", "गंदा",
        "सुविधाएं", "रोक", "रखा", "देते", "बिना", "छात्रवृत्ति", "प्रशासन",
        "ज्यादा", "अतिरिक्त", "वसूला", "मांगा", "लिया", "ली"
    }

    # Educational Grievance Phrase Map (Indic -> English)
    GRIEVANCE_PHRASE_MAP: Dict[str, str] = {
        # Fee overcharging & Admission fee issues
        "जास्त प्रवेश शुल्क आकारले जात आहे": "Excess admission fee is being charged",
        "जास्त प्रवेश शुल्क आकारण्यात येत आहे": "Excess admission fee is being charged",
        "जास्त प्रवेश शुल्क आकारले": "Excess admission fee charged",
        "जास्त प्रवेश शुल्क आकारतात": "Excess admission fee is being charged",
        "जास्त प्रवेश शुल्क": "Excess admission fee",
        "अधिक प्रवेश शुल्क आकारले जात आहे": "Excess admission fee is being charged",
        "अधिक प्रवेश शुल्क": "Excess admission fee",
        "ज्यादा एडमिशन फीस ली जा रही है": "Excess admission fee is being charged",
        "ज्यादा प्रवेश शुल्क लिया जा रहा है": "Excess admission fee is being charged",
        "ज्यादा एडमिशन फीस": "Excess admission fee",
        "ज्यादा फीस वसूली जा रही है": "Excess fee is being charged",
        "अतिरिक्त फीस ली जा रही है": "Excess fee is being charged",
        "आकारले जात आहे": "is being charged",
        "आकारण्यात येत आहे": "is being levied",
        "आकारले जात": "is being charged",
        "घेतले जात आहे": "is being taken",
        "घेतली जात आहे": "is being taken",
        "ली जा रही है": "is being charged",
        "लिया जा रहा है": "is being charged",
        "वसूली जा रही है": "is being collected",
        "वसूला जा रहा है": "is being collected",
        "वसूल केले जात आहे": "is being collected",
        "वसूल केली जात आहे": "is being collected",
        "मागितले जात आहे": "is being demanded",
        "मांगा जा रहा है": "is being demanded",
        "मागणी केली जात आहे": "is being demanded",

        # Withholding certificates / marksheets
        "मूळ प्रमाणपत्रे रोखून ठेवली": "withheld original certificates",
        "मूल प्रमाण पत्र रोक लिए": "withheld original certificates",
        "कागदपत्रे परत देत नाहीत": "refusing to return original documents",
        "दस्तावेज वापस नहीं कर रहे": "refusing to return original documents",
        "टीसी आणि गुणपत्रिका": "transfer certificate and marksheets",
        "टीसी और अंकतालिका": "transfer certificate and marksheets",
        "गुणपत्रिका देत नाहीत": "not returning marksheets",
        "अंकतालिका नहीं दे रहे": "not returning marksheets",
        "स्थानांतरण प्रमाणपत्र": "transfer certificate",
        
        # Fee overcharging & Refund refusal
        "जादा फी आकारणी": "excess fee overcharging",
        "अतिरिक्त फीस वसूली": "excess fee overcharging",
        "फी परत करण्यास नकार": "refusal to refund fees",
        "फीस वापसी से इनकार": "refusal to refund fees",
        "पावती दिली नाही": "fee receipt not provided",
        "रसीद नहीं दी": "fee receipt not provided",
        "कॅपिटेशन फी": "illegal capitation fee",
        "कॅपीटेशन फी": "illegal capitation fee",
        "कैपिटेशन फीस": "illegal capitation fee",
        "कॉशन मनी परत नाही": "caution deposit refund refusal",
        "कॉशन मनी वापस नहीं": "caution deposit refund refusal",
        "अवैध दंड": "illegal fine penalties",
        "परीक्षा शुल्क घोटाळा": "examination fee scam",

        # Anti-Ragging & Mental Harassment
        "रॅगिंगची तक्रार": "ragging and bullying complaint",
        "रैगिंग की शिकायत": "ragging and bullying complaint",
        "मानसिक छळ": "severe mental harassment",
        "मानसिक प्रताड़ना": "severe mental harassment",
        "शारीरिक मारहाण": "physical assault violence",
        "शारीरिक मारपीट": "physical assault violence",
        "धमकी दिली": "threats and intimidation",
        "धमकी दी गई": "threats and intimidation",
        "वसतिगृहात रॅगिंग": "hostel ragging",
        "हॉस्टल में रैगिंग": "hostel ragging",
        "वरिष्ठ विद्यार्थ्यांकडून": "by senior students",
        "सीनियर छात्रों द्वारा": "by senior students",

        # Faculty Salary & Staff Exploitation
        "पगार दिला नाही": "unpaid delayed salary arrears",
        "वेतन नहीं मिला": "unpaid delayed salary arrears",
        "६ महिने पगार नाही": "salary unpaid for 6 months",
        "6 महीने से वेतन नहीं": "salary unpaid for 6 months",
        "७वा वेतन आयोग": "7th pay commission arrears",
        "7वां वेतन आयोग": "7th pay commission arrears",
        "शिक्षकांचे शोषण": "faculty exploitation and harassment",
        "शिक्षकों का शोषण": "faculty exploitation and harassment",
        "कमी पगार": "underpaid salary exploitation",
        "कम वेतन": "underpaid salary exploitation",

        # Infrastructure & Lab Deficits
        "प्रयोगशाळा उपकरणे नाहीत": "lack of lab equipment infrastructure deficit",
        "लैब उपकरण नहीं हैं": "lack of lab equipment infrastructure deficit",
        "पिण्याचे स्वच्छ पाणी नाही": "lack of clean drinking water hygiene deficit",
        "पीने का साफ पानी नहीं": "lack of clean drinking water hygiene deficit",
        "संगणक लॅब बंद": "computer laboratory non-functional",
        "कंप्यूटर लैब बंद": "computer laboratory non-functional",
        "ग्रंथालयात पुस्तके नाहीत": "library books and academic resource deficit",
        "लाइब्रेरी में किताबें नहीं": "library books and academic resource deficit",
        "अस्वच्छ वसतिगृह": "unhygienic hostel sanitary condition",
        "गंदा हॉस्टल": "unhygienic hostel sanitary condition",
        "अग्निसुरक्षा नाही": "fire safety violation non-compliance",
        "अग्निशमन सुरक्षा नहीं": "fire safety violation non-compliance",

        # Approvals & Accreditation
        "मान्यता नसलेला कोर्स": "unapproved course lacking AICTE affiliation",
        "बिना मान्यता प्राप्त कोर्स": "unapproved course lacking AICTE affiliation",
        "बनावट पदवी": "fake unaccredited degree",
        "फर्जी डिग्री": "fake unaccredited degree",
        "अतिरिक्त जागांवर प्रवेश": "seat quota intake violation",
        "अवैध दाखिला": "illegal admission process",
    }

    # Individual Token Translations (Indic -> English)
    GRIEVANCE_TOKEN_MAP: Dict[str, str] = {
        "कॉलेज": "college",
        "महाविद्यालय": "college",
        "महाविद्यालयाने": "college",
        "संस्था": "institution",
        "संस्थेने": "institution",
        "संस्थान": "institution",
        "विद्यार्थी": "student",
        "विद्यार्थ्यांचे": "students",
        "विद्यार्थ्यांना": "students",
        "छात्र": "student",
        "छात्रों": "students",
        "शिक्षक": "faculty teacher",
        "शिक्षकांनी": "faculty teachers",
        "शिक्षकों": "faculty teachers",
        "प्राध्यापक": "professor faculty",
        "प्राध्यापकांनी": "professors faculty",
        "प्राध्यापकों": "professors faculty",
        "तक्रार": "complaint grievance",
        "शिकायत": "complaint grievance",
        "शुल्क": "fee fees",
        "फी": "fee fees",
        "फीस": "fee fees",
        "पावती": "receipt payment proof",
        "रसीद": "receipt payment proof",
        "प्रमाणपत्र": "certificate",
        "प्रमाणपत्रे": "certificates",
        "कागदपत्रे": "documents certificates",
        "दस्तावेज": "documents certificates",
        "गुणपत्रिका": "marksheet score card",
        "अंकतालिका": "marksheet score card",
        "वसतिगृह": "hostel student accommodation",
        "हॉस्टल": "hostel student accommodation",
        "पगार": "salary compensation",
        "वेतन": "salary compensation",
        "प्रयोगशाळा": "laboratory research facility",
        "प्रयोगशाला": "laboratory research facility",
        "उपकरणे": "equipment apparatus",
        "उपकरण": "equipment apparatus",
        "ग्रंथालय": "library academic books",
        "पुस्तकालय": "library academic books",
        "पुस्तके": "books textbooks",
        "किताबें": "books textbooks",
        "पाणी": "water supply",
        "पानी": "water supply",
        "स्वच्छ": "clean hygienic",
        "साफ": "clean hygienic",
        "अस्वच्छ": "unhygienic unsanitary dirty",
        "गंदा": "unhygienic unsanitary dirty",
        "रॅगिंग": "ragging harassment bullying",
        "रैगिंग": "ragging harassment bullying",
        "छळ": "harassment abuse",
        "उत्पीड़न": "harassment exploitation abuse",
        "प्रताड़ना": "mental torture harassment",
        "मारहाण": "assault beating violence",
        "मारपीट": "assault beating physical violence",
        "धमकी": "threat intimidation coercion",
        "मान्यता": "approval accreditation affiliation",
        "रद्द": "cancelled refund",
        "अवैध": "illegal unauthorized non-sanctioned",
        "जास्त": "excessive high",
        "जादा": "excessive extra",
        "अधिक": "excessive excess",
        "ज्यादा": "excessive high",
        "अतिरिक्त": "excess additional",
        "कमी": "less deficient",
        "वसूली": "collection recovery",
        "मागणी": "demand",
        "देणगी": "donation capitation",
        "कॅपिटेशन": "capitation fee",
        "लाच": "bribe bribery",
        "रिश्वत": "bribe bribery",
        "भ्रष्टाचार": "corruption",
    }

    # English -> Hindi Grievance Phrase Map
    ENGLISH_TO_HINDI_PHRASES: Dict[str, str] = {
        "institute can get all fees but , not provide the expected outcomes .": "संस्थान पूरी फीस तो ले लेता है, लेकिन अपेक्षित परिणाम और सुविधाएं प्रदान नहीं करता है।",
        "institute can get all fees but, not provide the expected outcomes": "संस्थान पूरी फीस तो ले लेता है, लेकिन अपेक्षित परिणाम और सुविधाएं प्रदान नहीं करता है।",
        "institute can get all fees but not provide the expected outcomes": "संस्थान पूरी फीस ले लेता है लेकिन अपेक्षित परिणाम और सुविधाएं प्रदान नहीं करता है।",
        "can get all fees but not provide the expected outcomes": "पूरी फीस ले लेते हैं लेकिन अपेक्षित परिणाम और सुविधाएं नहीं देते",
        "not provide the expected outcomes": "अपेक्षित परिणाम और शैक्षणिक सुविधाएं प्रदान नहीं की जाती हैं",
        "refusal to refund fee": "फीस वापस करने से इनकार",
        "non refund of fee": "फीस वापस न करना",
        "excess fee overcharging": "अतिरिक्त फीस की अवैध वसूली",
        "excessive fee surcharges": "अत्यधिक गैर-स्वीकृत फीस अधिभार",
        "withholding original certificates": "मूल प्रमाण पत्र और दस्तावेज अवैध रूप से रोकना",
        "withholding of certificates": "मूल प्रमाण पत्रों को अवैध रूप से रोकना",
        "not returning marksheets": "अंकतालिका वापस नहीं दी जा रही है",
        "caution deposit refund refusal": "कॉशन मनी / सुरक्षा जमा वापस करने से इनकार",
        "hostel ragging and bullying": "हॉस्टल में रैगिंग और मानसिक प्रताड़ना",
        "physical assault and harassment": "शारीरिक मारपीट और मानसिक उत्पीड़न",
        "unpaid delayed salary arrears": "शिक्षकों का बकाया वेतन न मिलना",
        "lack of lab equipment infrastructure deficit": "प्रयोगशाला उपकरणों की कमी और ढांचागत खामी",
        "lack of clean drinking water": "पीने के साफ पानी की अनुपलब्धता",
        "unapproved course lacking aicte affiliation": "एआईसीटीई मान्यता के बिना अप्राधिकृत कोर्स",
        "seat quota intake violation": "स्वीकृत सीट कोटा नियमों का उल्लंघन",
        "fake unaccredited degree": "फर्जी और अमान्य डिग्री",
    }

    # English -> Hindi Token Map
    ENGLISH_TO_HINDI_TOKENS: Dict[str, str] = {
        "management": "प्रबंधन / प्रशासन",
        "institute": "संस्थान",
        "institution": "संस्थान",
        "college": "महाविद्यालय (कॉलेज)",
        "university": "विश्वविद्यालय",
        "student": "छात्र",
        "students": "छात्रों",
        "faculty": "शिक्षक / प्राध्यापक",
        "teacher": "शिक्षक",
        "teachers": "शिक्षकों",
        "professor": "प्राध्यापक",
        "complaint": "शिकायत",
        "grievance": "शिकायत / व्यथा",
        "fee": "शुल्क / फीस",
        "fees": "शुल्क / फीस",
        "refund": "वापसी (रिफंड)",
        "receipt": "भुगतान रसीद",
        "certificate": "प्रमाण पत्र",
        "certificates": "प्रमाण पत्र",
        "documents": "दस्तावेज",
        "marksheet": "अंकतालिका",
        "marksheets": "अंकतालिका",
        "admission": "दाखिला / प्रवेश",
        "cancelled": "रद्द",
        "hostel": "हॉस्टल",
        "salary": "वेतन",
        "salaries": "वेतन",
        "laboratory": "प्रयोगशाला",
        "lab": "प्रयोगशाला",
        "equipment": "उपकरण",
        "water": "पानी",
        "drinking": "पीने का",
        "ragging": "रैगिंग",
        "harassment": "उत्पीड़न / प्रताड़ना",
        "delay": "विलंब / देरी",
        "unauthorized": "अप्राधिकृत / अवैध",
        "illegal": "गैर-कानूनी / अवैध",
        "penalty": "जुर्माना",
        "fine": "जुर्माना",
        "caution": "कॉशन मनी",
        "deposit": "जमा राशि",
        "expected": "अपेक्षित",
        "outcomes": "परिणाम / सुविधाएं",
        "provide": "प्रदान करना",
        "provides": "प्रदान करता है",
        "outcome": "परिणाम",
        "get": "प्राप्त करना / लेना",
        "all": "सभी / पूरी",
        "not": "नहीं",
        "but": "लेकिन / परंतु",
        "can": "सकता है",
    }

    # English -> Marathi Grievance Phrase Map
    ENGLISH_TO_MARATHI_PHRASES: Dict[str, str] = {
        "institute can get all fees but , not provide the expected outcomes .": "संस्था पूर्ण फी आकारते, परंतु अपेक्षित निकाल आणि शैक्षणिक सुविधा पुरवत नाही.",
        "institute can get all fees but, not provide the expected outcomes": "संस्था पूर्ण फी आकारते, परंतु अपेक्षित निकाल आणि शैक्षणिक सुविधा पुरवत नाही.",
        "institute can get all fees but not provide the expected outcomes": "संस्था पूर्ण फी आकारते परंतु अपेक्षित निकाल आणि शैक्षणिक सुविधा पुरवत नाही.",
        "can get all fees but not provide the expected outcomes": "पूर्ण फी घेतात पण अपेक्षित निकाल आणि शैक्षणिक सुविधा देत नाहीत",
        "not provide the expected outcomes": "अपेक्षित निकाल आणि शैक्षणिक सुविधा पुरवल्या जात नाहीत",
        "refusal to refund fee": "फी परत करण्यास नकार",
        "non refund of fee": "फी परत न करणे",
        "excess fee overcharging": "जादा फीची बेकायदेशीर आकारणी",
        "excessive fee surcharges": "जादा फी अधिभार आकारणी",
        "withholding original certificates": "मूळ प्रमाणपत्रे आणि कागदपत्रे बेकायदेशीरपणे रोखून ठेवणे",
        "withholding of certificates": "मूळ प्रमाणपत्रे रोखून ठेवणे",
        "not returning marksheets": "गुणपत्रिका परत दिल्या जात नाहीत",
        "caution deposit refund refusal": "कॉशन मनी / अनामत रक्कम परत करण्यास नकार",
        "hostel ragging and bullying": "वसतिगृहात रॅगिंग आणि मानसिक छळ",
        "physical assault and harassment": "शारीरिक मारहाण आणि मानसिक छळ",
        "unpaid delayed salary arrears": "शिक्षकांचे थकीत वेतन / पगार न मिळणे",
        "lack of lab equipment infrastructure deficit": "प्रयोगशाळा उपकरणांची कमतरता आणि पायाभूत सुविधांचा अभाव",
        "lack of clean drinking water": "पिण्याचे स्वच्छ पाणी उपलब्ध नसणे",
        "unapproved course lacking aicte affiliation": "एआयसीटीई मान्यतेशिवाय अनधिकृत कोर्स",
        "seat quota intake violation": "मंजूर जागांच्या कोट्याचे उल्लंघन",
        "fake unaccredited degree": "बनावट आणि अमान्य पदवी",
    }

    # English -> Marathi Token Map
    ENGLISH_TO_MARATHI_TOKENS: Dict[str, str] = {
        "management": "व्यवस्थापन / प्रशासन",
        "institute": "संस्था",
        "institution": "संस्था",
        "college": "महाविद्यालय",
        "university": "विद्यापीठ",
        "student": "विद्यार्थी",
        "students": "विद्यार्थी",
        "faculty": "प्राध्यापक / शिक्षक",
        "teacher": "शिक्षक",
        "teachers": "शिक्षक",
        "professor": "प्राध्यापक",
        "complaint": "तक्रार",
        "grievance": "तक्रार",
        "fee": "शुल्क / फी",
        "fees": "शुल्क / फी",
        "refund": "परतावा (रिफंड)",
        "receipt": "पावती",
        "certificate": "प्रमाणपत्र",
        "certificates": "प्रमाणपत्रे",
        "documents": "कागदपत्रे",
        "marksheet": "गुणपत्रिका",
        "marksheets": "गुणपत्रिका",
        "admission": "प्रवेश",
        "cancelled": "रद्द",
        "hostel": "वसतिगृह",
        "salary": "पगार / वेतन",
        "salaries": "पगार / वेतन",
        "laboratory": "प्रयोगशाळा",
        "lab": "प्रयोगशाळा",
        "equipment": "उपकरणे",
        "water": "पाणी",
        "drinking": "पिण्याचे",
        "ragging": "रॅगिंग",
        "harassment": "छळवणूक",
        "delay": "विलंब / उशीर",
        "unauthorized": "अनधिकृत",
        "illegal": "बेकायदेशीर",
        "penalty": "दंड",
        "fine": "दंड",
        "caution": "कॉशन मनी",
        "deposit": "अनामत रक्कम",
        "expected": "अपेक्षित",
        "outcomes": "निकाल आणि सुविधा",
        "provide": "पुरवणे",
        "provides": "पुरवते",
        "outcome": "निकाल",
        "get": "घेणे / आकारणे",
        "all": "सर्व / पूर्ण",
        "not": "नाही",
        "but": "परंतु / पण",
        "can": "शकत आहे",
    }

    # Direct Hindi <-> Marathi Vocabulary Bridges
    HINDI_TO_MARATHI_MAP: Dict[str, str] = {
        "है": "आहे",
        "हैं": "आहेत",
        "नहीं": "नाही",
        "छात्र": "विद्यार्थी",
        "छात्रों": "विद्यार्थ्यांना",
        "कॉलेज": "महाविद्यालय",
        "संस्थान": "संस्था",
        "फीस": "शुल्क",
        "रसीद": "पावती",
        "दस्तावेज": "कागदपत्रे",
        "प्रमाण पत्र": "प्रमाणपत्रे",
        "अंकतालिका": "गुणपत्रिका",
        "हॉस्टल": "वसतिगृह",
        "वेतन": "पगार",
        "पानी": "पाणी",
        "रैगिंग": "रॅगिंग",
        "उत्पीड़न": "छळ",
        "प्रताड़ना": "मानसिक छळ",
        "मारपीट": "मारहाण",
        "दाखिला": "प्रवेश",
        "वापस": "परत",
        "वापसी": "परतावा",
        "शिकायत": "तक्रार",
        "किया": "केले",
        "दी": "दिली",
        "दिया": "दिले",
        "ज्यादा": "जास्त",
        "अतिरिक्त": "जादा",
    }

    MARATHI_TO_HINDI_MAP: Dict[str, str] = {
        "आहे": "है",
        "आहेत": "हैं",
        "नाही": "नहीं",
        "नाहीत": "नहीं हैं",
        "विद्यार्थी": "छात्र",
        "विद्यार्थ्यांना": "छात्रों को",
        "महाविद्यालय": "कॉलेज",
        "संस्था": "संस्थान",
        "शुल्क": "फीस",
        "पावती": "रसीद",
        "कागदपत्रे": "दस्तावेज",
        "प्रमाणपत्रे": "प्रमाण पत्र",
        "गुणपत्रिका": "अंकतालिका",
        "वसतिगृह": "हॉस्टल",
        "पगार": "वेतन",
        "पाणी": "पानी",
        "रॅगिंग": "रैगिंग",
        "छळ": "उत्पीड़न",
        "मारहाण": "मारपीट",
        "प्रवेश": "दाखिला",
        "परत": "वापस",
        "परतावा": "वापसी",
        "तक्रार": "शिकायत",
        "केले": "किया",
        "दिली": "दी",
        "दिले": "दिया",
        "जास्त": "ज्यादा",
        "जादा": "अतिरिक्त",
    }

    @classmethod
    def detect_language(cls, text: Optional[str]) -> str:
        """
        Detects whether the text is English ('en'), Hindi ('hi'), or Marathi ('mr').
        Deterministic, offline, and instant.
        """
        if not text or not text.strip():
            return "en"

        text_str = text.strip()
        devanagari_chars = re.findall(r"[\u0900-\u097F]", text_str)
        dev_count = len(devanagari_chars)

        total_letters = len(re.findall(r"[\w]", text_str))
        if total_letters == 0:
            return "en"

        # If less than 15% Devanagari characters, treat as English
        if (dev_count / total_letters) < 0.15:
            return "en"

        # Differentiate between Hindi and Marathi based on distinctive vocabulary
        words = re.findall(r"[\u0900-\u097F]+", text_str)
        marathi_hits = 0
        hindi_hits = 0

        for w in words:
            if w in cls.MARATHI_MARKERS:
                marathi_hits += 2
            elif w.endswith(("ावे", "ावेस", "तात", "तोस", "तात", "यांचे", "्यांनी")):
                marathi_hits += 1

            if w in cls.HINDI_MARKERS:
                hindi_hits += 2
            elif w.endswith(("ाएं", "ियों", "ताहूँ", "रहा", "रही", "रहे", "गया")):
                hindi_hits += 1

        if marathi_hits > hindi_hits:
            return "mr"
        if hindi_hits > marathi_hits:
            return "hi"

        # In tie-break, check common markers
        if any(marker in text_str for marker in ("आहे", "नाही", "केले", "दिली", "पावती", "गुणपत्रिका")):
            return "mr"
        if any(marker in text_str for marker in ("है", "नहीं", "किया", "दिया", "रसीद", "अंकतालिका")):
            return "hi"

        return "hi"

    @classmethod
    def translate_to_english(
        cls, text: Optional[str], source_lang: Optional[str] = None
    ) -> Tuple[str, str, str]:
        """
        Translate Indic text to normalized English representation suitable for AI analysis.
        Returns: (translated_text, detected_language, translation_status)
        """
        if not text or not text.strip():
            return "", source_lang or "en", "original"

        detected_lang = source_lang or cls.detect_language(text)

        if detected_lang == "en":
            return text.strip(), "en", "original"

        normalized = text.strip()

        # Step 1: Replace known multi-word domain grievance phrases
        for phrase, eng_phrase in cls.GRIEVANCE_PHRASE_MAP.items():
            if phrase in normalized:
                normalized = normalized.replace(phrase, f" {eng_phrase} ")

        # Step 2: Token-by-token grievance mapping for remaining Indic terms
        tokens = re.split(r"(\s+|[^\w\u0900-\u097F]+)", normalized)
        translated_tokens = []

        for token in tokens:
            if not token:
                continue
            token_clean = token.strip()
            if not token_clean:
                translated_tokens.append(token)
                continue

            if token_clean in cls.GRIEVANCE_TOKEN_MAP:
                translated_tokens.append(cls.GRIEVANCE_TOKEN_MAP[token_clean])
            elif re.search(r"[\u0900-\u097F]", token_clean):
                translated_tokens.append(token_clean)
            else:
                translated_tokens.append(token)

        result_text = "".join(translated_tokens)
        result_text = re.sub(r"\s+", " ", result_text).strip()
        result_text = re.sub(r"\s+([.,;:!?])", r"\1", result_text)
        if result_text:
            result_text = result_text[0].upper() + result_text[1:]

        return result_text, detected_lang, "translated"

    @classmethod
    def translate_to_hindi(
        cls, text: Optional[str], source_lang: Optional[str] = None
    ) -> Tuple[str, str, str]:
        """
        Translates English or Marathi grievance text into formal Hindi for official review.
        Returns: (translated_text, detected_language, translation_status)
        """
        if not text or not text.strip():
            return "", source_lang or "hi", "original"

        detected_lang = source_lang or cls.detect_language(text)

        if detected_lang == "hi":
            return text.strip(), "hi", "original"

        normalized = text.strip()

        # Case 1: Source is Marathi -> direct bridge to Hindi
        if detected_lang == "mr":
            for mr_term, hi_term in cls.MARATHI_TO_HINDI_MAP.items():
                pattern = re.compile(rf"\b{re.escape(mr_term)}\b", flags=re.IGNORECASE)
                normalized = pattern.sub(hi_term, normalized)
            # Finish punctuation
            if not normalized.endswith(("।", ".", "!")):
                normalized += "।"
            return normalized, "mr", "translated"

        # Case 2: Source is English -> replace known domain phrases first
        lower_input = normalized.lower().strip()
        for eng_phrase, hi_phrase in cls.ENGLISH_TO_HINDI_PHRASES.items():
            if eng_phrase in lower_input:
                pattern = re.compile(re.escape(eng_phrase), flags=re.IGNORECASE)
                normalized = pattern.sub(hi_phrase, normalized)

        # Replace remaining tokens
        tokens = re.split(r"(\s+|[^\w]+)", normalized)
        translated_tokens = []

        for token in tokens:
            if not token:
                continue
            token_clean = token.strip().lower()
            if not token_clean:
                translated_tokens.append(token)
                continue

            if token_clean in cls.ENGLISH_TO_HINDI_TOKENS:
                translated_tokens.append(cls.ENGLISH_TO_HINDI_TOKENS[token_clean])
            else:
                translated_tokens.append(token)

        result_text = "".join(translated_tokens)
        result_text = re.sub(r"\s+", " ", result_text).strip()
        result_text = re.sub(r"\s+([.,;:!?])", r"\1", result_text)
        # End with Hindi purna viram if sentence ends in period
        if result_text.endswith("."):
            result_text = result_text[:-1] + "।"

        return result_text, "en", "translated"

    @classmethod
    def translate_to_marathi(
        cls, text: Optional[str], source_lang: Optional[str] = None
    ) -> Tuple[str, str, str]:
        """
        Translates English or Hindi grievance text into formal Marathi for official review.
        Returns: (translated_text, detected_language, translation_status)
        """
        if not text or not text.strip():
            return "", source_lang or "mr", "original"

        detected_lang = source_lang or cls.detect_language(text)

        if detected_lang == "mr":
            return text.strip(), "mr", "original"

        normalized = text.strip()

        # Case 1: Source is Hindi -> direct bridge to Marathi
        if detected_lang == "hi":
            for hi_term, mr_term in cls.HINDI_TO_MARATHI_MAP.items():
                pattern = re.compile(rf"\b{re.escape(hi_term)}\b", flags=re.IGNORECASE)
                normalized = pattern.sub(mr_term, normalized)
            if not normalized.endswith((".", "।", "!")):
                normalized += "."
            return normalized, "hi", "translated"

        # Case 2: Source is English -> replace known domain phrases first
        lower_input = normalized.lower().strip()
        for eng_phrase, mr_phrase in cls.ENGLISH_TO_MARATHI_PHRASES.items():
            if eng_phrase in lower_input:
                pattern = re.compile(re.escape(eng_phrase), flags=re.IGNORECASE)
                normalized = pattern.sub(mr_phrase, normalized)

        # Replace remaining tokens
        tokens = re.split(r"(\s+|[^\w]+)", normalized)
        translated_tokens = []

        for token in tokens:
            if not token:
                continue
            token_clean = token.strip().lower()
            if not token_clean:
                translated_tokens.append(token)
                continue

            if token_clean in cls.ENGLISH_TO_MARATHI_TOKENS:
                translated_tokens.append(cls.ENGLISH_TO_MARATHI_TOKENS[token_clean])
            else:
                translated_tokens.append(token)

        result_text = "".join(translated_tokens)
        result_text = re.sub(r"\s+", " ", result_text).strip()
        result_text = re.sub(r"\s+([.,;:!?])", r"\1", result_text)

        return result_text, "en", "translated"

    @classmethod
    def translate_text(
        cls, text: Optional[str], target_lang: str = "en", source_lang: Optional[str] = None
    ) -> Tuple[str, str, str]:
        """
        Translates text to the specified target language ('en', 'hi', 'mr').
        Returns: (translated_text, detected_source_language, status)
        """
        if not text or not text.strip():
            return "", source_lang or "en", "original"

        detected_lang = source_lang or cls.detect_language(text)
        target = (target_lang or "en").lower().strip()
        if target in ("hindi", "hi-in"):
            target = "hi"
        elif target in ("marathi", "mr-in"):
            target = "mr"
        elif target in ("english", "en-us", "en-gb"):
            target = "en"

        if target == detected_lang:
            return text.strip(), detected_lang, "original"

        if target == "hi":
            return cls.translate_to_hindi(text, source_lang=detected_lang)
        elif target == "mr":
            return cls.translate_to_marathi(text, source_lang=detected_lang)
        else:
            return cls.translate_to_english(text, source_lang=detected_lang)

    @classmethod
    def process_complaint_multilingual(
        cls, subject: str, description: str, preferred_lang: Optional[str] = None
    ) -> Dict[str, Optional[object]]:
        """
        Processes complaint subject and description, generating translated analysis representations
        without modifying or corrupting the original user-submitted texts.
        """
        detected_sub_lang = cls.detect_language(subject)
        detected_desc_lang = cls.detect_language(description)

        if detected_desc_lang in ("hi", "mr"):
            detected_lang = detected_desc_lang
        elif detected_sub_lang in ("hi", "mr"):
            detected_lang = detected_sub_lang
        else:
            detected_lang = preferred_lang or "en"

        now_utc = datetime.now(timezone.utc)

        if detected_lang == "en":
            return {
                "detected_language": "en",
                "translated_subject": subject,
                "translated_description": description,
                "translation_status": "original",
                "translation_provider": "internal_indic",
                "translated_at": now_utc,
            }

        trans_subject, _, _ = cls.translate_to_english(subject, source_lang=detected_lang)
        trans_desc, _, _ = cls.translate_to_english(description, source_lang=detected_lang)

        return {
            "detected_language": detected_lang,
            "translated_subject": trans_subject,
            "translated_description": trans_desc,
            "translation_status": "translated",
            "translation_provider": "internal_indic",
            "translated_at": now_utc,
        }
