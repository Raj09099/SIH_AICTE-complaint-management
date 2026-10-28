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
