"""
Text Preprocessing Pipeline for AICTE Complaint Intelligence.
Provides text cleaning, tokenization, stopword filtering, boilerplate stripping,
and feature extraction for similarity and clustering pipelines.
"""

import re
from typing import Any, List, Set

# Standard institutional and boilerplate stop words to filter out
DOMAIN_STOPWORDS: Set[str] = {
    "aicte",
    "institution",
    "institute",
    "college",
    "campus",
    "complaint",
    "complainant",
    "grievance",
    "case",
    "allegation",
    "allegations",
    "official",
    "matter",
    "regarding",
    "submitted",
    "filed",
    "student",
    "students",
    "disclaimer",
    "synthetic",
    "test",
    "evaluation",
    "support",
    "decision",
}


class ComplaintTextPreprocessor:
    """
    Handles cleaning, boilerplate removal, stopword filtering, and normalization
    of complaint texts, bureau subjects, and evidence representations.
    """

    def __init__(self, language: str = "english"):
        self.language = language

    def clean_text(self, text: str) -> str:
        """
        Normalize whitespace, lower-case, strip synthetic test disclaimers,
        and remove excessive punctuation.
        """
        if not text:
            return ""

        # Remove bracketed disclaimers or synthetic tags like [DISCLAIMER: ...] or [SYNTHETIC TEST]
        cleaned = re.sub(r"\[.*?\]", " ", text)

        # Replace non-alphanumeric characters with spaces (preserve basic words)
        cleaned = re.sub(r"[^a-zA-Z0-9\s]", " ", cleaned)

        # Collapse whitespace and convert to lowercase
        cleaned = re.sub(r"\s+", " ", cleaned).strip().lower()
        return cleaned

    def tokenize_and_filter(self, text: str) -> List[str]:
        """
        Extract meaningful word tokens, excluding standard short tokens and domain stopwords.
        """
        cleaned = self.clean_text(text)
        if not cleaned:
            return []

        tokens = cleaned.split()
        filtered = [
            t
            for t in tokens
            if len(t) > 2 and t not in DOMAIN_STOPWORDS
        ]
        return filtered

    def build_composite_text(self, item: Any) -> str:
        """
        Combines subject, category, and narrative description into a single
        normalized representation weighted toward subject and allegations.
        """
        # Supports dict, Pydantic model, or SQLAlchemy ORM model
        if isinstance(item, dict):
            subject = item.get("subject", "") or ""
            category = item.get("category", "") or ""
            description = item.get("description", "") or ""
        else:
            subject = getattr(item, "subject", "") or ""
            category = getattr(item, "category", "") or ""
            description = getattr(item, "description", "") or ""

        # Double-weight subject and category for stronger semantic matching
        raw_combined = f"{subject} {subject} {category} {description}"
        return self.clean_text(raw_combined)

    def stem_word(self, word: str) -> str:
        """
        Lightweight morphological normalization for grievance terms
        (handles common English plurals, gerunds, past tenses).
        """
        w = word.lower().strip()
        if len(w) <= 3:
            return w

        # Common grievance term special cases
        irregulars = {
            "salaries": "salary",
            "irregularities": "irregular",
            "amenities": "amenity",
            "deficiencies": "deficiency",
            "unpaid": "pay",
            "nonpayment": "pay",
            "refusal": "refuse",
            "admissions": "admission",
            "examinations": "exam",
            "certificates": "certificate",
            "marksheets": "marksheet",
            "fees": "fee",
            "fined": "fine",
            "fines": "fine",
            "charges": "charge",
            "charged": "charge",
            "charging": "charge",
            "donations": "donation",
            "receipts": "receipt",
            "demanded": "demand",
            "demanding": "demand",
            "demands": "demand",
            "professors": "professor",
            "teachers": "teacher",
            "shortages": "shortage",
            "withholding": "withhold",
            "withheld": "withhold",
            "extortion": "extort",
            "extorting": "extort",
        }
        if w in irregulars:
            return irregulars[w]

        # Rule-based stripping
        for suffix in ("ing", "ies", "es", "ed", "s"):
            if w.endswith(suffix) and len(w) > len(suffix) + 2:
                if suffix == "ies":
                    return w[:-3] + "y"
                return w[:-len(suffix)]

        return w

    def normalize_text_for_clustering(self, text: str) -> str:
        """
        Cleans and morphologically stems text tokens for topic and pattern clustering.
        """
        cleaned = self.clean_text(text)
        if not cleaned:
            return ""
        tokens = cleaned.split()
        stemmed = [self.stem_word(t) for t in tokens if t not in DOMAIN_STOPWORDS]
        return " ".join(stemmed)
