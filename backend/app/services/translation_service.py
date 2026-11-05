"""
Translation and Multilingual Processing Service for AICTE Complaint Intelligence (Feature 3.6).
Provides deterministic, offline language detection and grievance-domain translation for
English (en), हिन्दी (hi), and मराठी (mr).
"""

from datetime import datetime, timezone
import re
from typing import Dict, Optional, Tuple


class TranslationService:
    """
    Intelligent Indic and Multilingual Service for AICTE grievances.
    Detects language without network calls and normalizes grievances into
    standard English analysis tokens while strictly preserving original complaint text.
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

    # Educational Grievance Phrase Map (Multi-word matches handled first)
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

    # Individual Token Translations
    GRIEVANCE_TOKEN_MAP: Dict[str, str] = {
        # General & Institutional
        "कॉलेज": "college",
        "महाविद्यालय": "college",
        "महाविद्यालयाने": "college",
        "संस्था": "institution",
        "संस्थेने": "institution",
        "संस्थान": "institution",
        "विद्यार्थी": "student",
        "विद्यार्थ्यांचे": "students",
        "छात्र": "student",
        "छात्रों": "students",
        "शिक्षक": "faculty teacher",
        "शिक्षकांनी": "faculty teachers",
        "शिक्षकों": "faculty teachers",
        "प्राध्यापक": "professor faculty",
        "अभियांत्रिकी": "engineering",
        "इंजीनियरिंग": "engineering",
        "तक्रार": "complaint grievance",
        "शिकायत": "complaint grievance",
        "प्रशासन": "administration",
        "व्यवस्थापन": "management",
        "प्राचार्य": "principal",
        "संचालक": "director",
        "विद्यापीठ": "university",
        "बोर्ड": "board",
        "महाविद्यालयात": "in college",
        "कॉलेजमध्ये": "in college",
        "संस्थेमध्ये": "in institution",
        "संस्थेत": "in institution",
        "के लिए": "for",
        "साठी": "for",
        "कडून": "by from",
        "द्वारा": "by",
        "मध्ये": "in",
        
        # Action & Conditions
        "फीस": "fee",
        "शुल्क": "fee",
        "पैसे": "money funds",
        "रुपये": "rupees",
        "परत": "refund return",
        "वापस": "refund return",
        "दिले": "given paid",
        "दिला": "given paid",
        "दिली": "given paid",
        "पावती": "receipt",
        "रसीद": "receipt",
        "कागदपत्रे": "documents certificates",
        "दस्तावेज": "documents certificates",
        "प्रमाणपत्र": "certificates",
        "गुणपत्रिका": "marksheets",
        "अंकतालिका": "marksheets",
        "रोखून": "withheld detained",
        "रोक": "withheld detained",
        "छळ": "harassment",
        "प्रताड़ना": "harassment",
        "मारहाण": "assault beating",
        "मारपीट": "assault beating",
        "धमकी": "threat intimidation",
        "रॅगिंग": "ragging bullying",
        "रैगिंग": "ragging bullying",
        "पगार": "salary",
        "वेतन": "salary",
        "वसतिगृह": "hostel",
        "हॉस्टल": "hostel",
        "प्रयोगशाळा": "laboratory lab",
        "लैब": "laboratory lab",
        "ग्रंथालय": "library",
        "पुस्तकालय": "library",
        "मान्यता": "AICTE approval affiliation",
        "उपकरणे": "equipment facilities",
        "सुविधा": "facilities amenities",
        "नाही": "not no",
        "नाहीत": "not no",
        "नहीं": "not no",
        "झाले": "occurred happened",
        "झाला": "occurred happened",
        "केले": "done committed",
        "किया": "done committed",
        "आहे": "is",
        "आहेत": "are",
        "है": "is",
        "हैं": "are",
        "माझे": "my",
        "माझ्या": "my",
        "माझी": "my",
        "मेरा": "my",
        "मेरी": "my",
        "मेरे": "my",
        "प्रवेश": "admission",
        "दाखिला": "admission",
        "रद्द": "cancelled refund",
        "अवैध": "illegal unauthorized",
        "तातडीने": "urgently immediate",
        "त्वरित": "urgently immediate",
        "कारवाई": "action investigation",
        "करावी": "should take",
        "पाहिजे": "required needed",
        "चाहिए": "required needed",
        
        # Overcharging & Demand Tokens
        "जास्त": "excessive high",
        "जादा": "excessive extra",
        "अधिक": "excessive excess",
        "ज्यादा": "excessive high",
        "अतिरिक्त": "excess additional",
        "कमी": "less deficient",
        "आकारले": "charged levied",
        "आकारणी": "charging levy",
        "आकारण्यात": "charging",
        "आकारतात": "charge",
        "आकारते": "charges",
        "जात": "being",
        "येत": "being",
        "रहा": "being",
        "रही": "being",
        "रहे": "being",
        "वसूल": "collected recovered",
        "वसूली": "collection recovery",
        "मागणी": "demand",
        "मागितले": "demanded",
        "मांग": "demand",
        "मांगा": "demanded",
        "देणगी": "donation capitation",
        "डोनेशन": "donation capitation",
        "कॅपिटेशन": "capitation fee",
        "कॅपीटेशन": "capitation fee",
        "लाच": "bribe bribery",
        "रिश्वत": "bribe bribery",
        "भ्रष्टाचार": "corruption",
    }

    @classmethod
    def detect_language(cls, text: Optional[str]) -> str:
        """
        Detects whether the text is English ('en'), Hindi ('hi'), or Marathi ('mr').
        Deterministic and fast.
        """
        if not text or not text.strip():
            return "en"

        text_str = text.strip()
        # Find all Devanagari characters (range U+0900 to U+097F)
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

        # In tie-break, check common words like 'आहे' (mr) vs 'है' (hi)
        if "आहे" in text_str or "नाही" in text_str or "केले" in text_str:
            return "mr"
        if "है" in text_str or "नहीं" in text_str or "किया" in text_str:
            return "hi"

        # Default Devanagari fallback
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

        # If text is already English, return as-is
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
                # If an Indic token has no direct match, retain phonetic or context hints
                translated_tokens.append(token_clean)
            else:
                # Keep Latin words, numbers, and symbols intact
                translated_tokens.append(token)

        result_text = "".join(translated_tokens)
        # Clean up double spaces and spaces before punctuation
        result_text = re.sub(r"\s+", " ", result_text).strip()
        result_text = re.sub(r"\s+([.,;:!?])", r"\1", result_text)
        if result_text:
            result_text = result_text[0].upper() + result_text[1:]

        return result_text, detected_lang, "translated"

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

        # Overall detected language
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

