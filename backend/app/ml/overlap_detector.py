"""
Feature 1: Smart Case Relationship & Overlap Detection.
Compares complaint text, institution identifiers, categories, and bureau information
using scikit-learn TF-IDF and Cosine Similarity to detect duplicates and cross-bureau cases.
"""

from decimal import Decimal
import logging
import re
from typing import Any, Dict, List, Optional, Set, Tuple
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

from app.ml.text_preprocessing import ComplaintTextPreprocessor

logger = logging.getLogger(__name__)


class ComplaintOverlapDetector:
    """
    Identifies duplicate complaints or cross-bureau related cases using hybrid
    TF-IDF text vectorization, cosine similarity, and institution metadata matching.
    """

    def __init__(self, default_threshold: float = 0.60):
        self.default_threshold = default_threshold
        self.preprocessor = ComplaintTextPreprocessor()

    def compute_pairwise_text_similarity(
        self, text_a: str, text_b: str
    ) -> Tuple[float, List[str]]:
        """
        Compute TF-IDF cosine similarity between two complaint texts and extract
        overlapping keywords.
        """
        cleaned_a = self.preprocessor.clean_text(text_a)
        cleaned_b = self.preprocessor.clean_text(text_b)

        if not cleaned_a or not cleaned_b:
            return 0.0, []

        tokens_a = set(self.preprocessor.tokenize_and_filter(cleaned_a))
        tokens_b = set(self.preprocessor.tokenize_and_filter(cleaned_b))
        common_tokens = sorted(
            list(tokens_a.intersection(tokens_b)),
            key=lambda w: (-len(w), w),
        )

        try:
            vectorizer = TfidfVectorizer(
                ngram_range=(1, 1),
                stop_words="english",
                sublinear_tf=True,
            )
            tfidf_matrix = vectorizer.fit_transform([cleaned_a, cleaned_b])
            sim = float(cosine_similarity(tfidf_matrix[0:1], tfidf_matrix[1:2])[0][0])
            return round(max(0.0, min(1.0, sim)), 4), common_tokens[:8]
        except Exception as exc:
            logger.warning("Error computing TF-IDF similarity: %s", exc)
            return 0.0, common_tokens[:8]

    def compare_pair(
        self,
        complaint_a: Any,
        complaint_b: Any,
        threshold: Optional[float] = None,
    ) -> Optional[Dict[str, Any]]:
        """
        Compare two complaint instances and return overlap analysis if similarity
        meets or exceeds threshold. Guarantees exclusion of self-matches.
        """
        active_threshold = threshold if threshold is not None else self.default_threshold

        # Helper getters for dict vs ORM object
        def get_attr(obj: Any, key: str, default: Any = None) -> Any:
            if isinstance(obj, dict):
                return obj.get(key, default)
            return getattr(obj, key, default)

        id_a = get_attr(complaint_a, "id")
        id_b = get_attr(complaint_b, "id")
        no_a = get_attr(complaint_a, "complaint_no")
        no_b = get_attr(complaint_b, "complaint_no")

        # Exclude self-matches
        if id_a is not None and id_b is not None and id_a == id_b:
            return None
        if no_a is not None and no_b is not None and no_a == no_b:
            return None

        # Build composite text (subject + category + description)
        text_a = self.preprocessor.build_composite_text(complaint_a)
        text_b = self.preprocessor.build_composite_text(complaint_b)

        raw_sim, matching_keywords = self.compute_pairwise_text_similarity(text_a, text_b)

        inst_a = get_attr(complaint_a, "institution_id")
        inst_b = get_attr(complaint_b, "institution_id")
        bureau_a = (get_attr(complaint_a, "bureau") or "").strip()
        bureau_b = (get_attr(complaint_b, "bureau") or "").strip()
        cat_a = (get_attr(complaint_a, "category") or "").strip()
        cat_b = (get_attr(complaint_b, "category") or "").strip()

        same_institution = (inst_a is not None and inst_b is not None and inst_a == inst_b)
        same_category = (cat_a.lower() == cat_b.lower()) if cat_a and cat_b else False
        cross_bureau = (bureau_a.lower() != bureau_b.lower()) if bureau_a and bureau_b else False

        # Metadata-weighted composite scoring:
        # If there is real textual overlap (raw_sim >= 0.05) and complaints share institution/category,
        # adjust composite confidence. If text is completely dissimilar (raw_sim < 0.05), no boost.
        composite_score = raw_sim
        if raw_sim >= 0.05:
            if same_institution:
                composite_score += 0.15
            if same_category:
                composite_score += 0.08
        composite_score = round(min(1.0, max(0.0, composite_score)), 4)

        if composite_score < active_threshold:
            return None

        # Determine overlap classification
        if same_institution and cross_bureau:
            overlap_type = "Cross-Bureau Related"
        elif same_institution and composite_score >= 0.85:
            overlap_type = "Exact Duplicate" if composite_score >= 0.95 else "Semantic Duplicate"
        elif same_institution and same_category:
            overlap_type = "Multiple Complainant Same Incident"
        else:
            overlap_type = "Semantic Duplicate"

        # Generate understandable natural language reason
        reasons = [
            f"Semantic text similarity of {composite_score * 100:.1f}% identified in reported allegations.",
        ]
        if same_institution:
            reasons.append(f"Both grievances reference the same institution (ID #{inst_a}).")
        if cross_bureau:
            reasons.append(f"Cross-bureau filing between '{bureau_a}' and '{bureau_b}'.")
        elif same_category:
            reasons.append(f"Identical grievance category: '{cat_a}'.")
        if matching_keywords:
            reasons.append(f"Key overlapping terms: {', '.join(matching_keywords[:6])}.")

        return {
            "primary_complaint_id": id_a,
            "related_complaint_id": id_b,
            "similarity_score": Decimal(str(composite_score)),
            "raw_text_similarity": raw_sim,
            "overlap_type": overlap_type,
            "reason": " ".join(reasons),
            "matching_keywords": matching_keywords,
            "status": "Flagged",
        }

    def detect_all_overlaps(
        self,
        complaints: List[Any],
        threshold: Optional[float] = None,
        limit: int = 100,
    ) -> List[Dict[str, Any]]:
        """
        Scan a candidate pool of complaints and return non-redundant pairs meeting threshold.
        Guarantees self-matches and duplicate inverted pairs (b, a) are excluded.
        """
        if len(complaints) < 2:
            return []

        active_threshold = threshold if threshold is not None else self.default_threshold
        results: List[Dict[str, Any]] = []
        n = len(complaints)

        # Precompute composite texts for efficiency
        composite_texts = [
            self.preprocessor.build_composite_text(c) for c in complaints
        ]

        try:
            vectorizer = TfidfVectorizer(
                ngram_range=(1, 1),
                stop_words="english",
                sublinear_tf=True,
            )
            tfidf_matrix = vectorizer.fit_transform(composite_texts)
            sim_matrix = cosine_similarity(tfidf_matrix)
        except Exception as exc:
            logger.warning("Batch vectorization error: %s", exc)
            return []

        for i in range(n):
            for j in range(i + 1, n):
                c_a = complaints[i]
                c_b = complaints[j]

                raw_sim = float(sim_matrix[i, j])

                def get_attr(obj: Any, key: str, default: Any = None) -> Any:
                    if isinstance(obj, dict):
                        return obj.get(key, default)
                    return getattr(obj, key, default)

                id_a = get_attr(c_a, "id")
                id_b = get_attr(c_b, "id")
                if id_a == id_b:
                    continue

                inst_a = get_attr(c_a, "institution_id")
                inst_b = get_attr(c_b, "institution_id")
                bureau_a = (get_attr(c_a, "bureau") or "").strip()
                bureau_b = (get_attr(c_b, "bureau") or "").strip()
                cat_a = (get_attr(c_a, "category") or "").strip()
                cat_b = (get_attr(c_b, "category") or "").strip()

                same_institution = (inst_a is not None and inst_b is not None and inst_a == inst_b)
                same_category = (cat_a.lower() == cat_b.lower()) if cat_a and cat_b else False
                cross_bureau = (bureau_a.lower() != bureau_b.lower()) if bureau_a and bureau_b else False

                composite_score = raw_sim
                if raw_sim >= 0.05:
                    if same_institution:
                        composite_score += 0.15
                    if same_category:
                        composite_score += 0.08
                composite_score = round(min(1.0, max(0.0, composite_score)), 4)

                if composite_score >= active_threshold:
                    tokens_a = set(self.preprocessor.tokenize_and_filter(composite_texts[i]))
                    tokens_b = set(self.preprocessor.tokenize_and_filter(composite_texts[j]))
                    common_tokens = sorted(
                        list(tokens_a.intersection(tokens_b)),
                        key=lambda w: (-len(w), w),
                    )

                    if same_institution and cross_bureau:
                        overlap_type = "Cross-Bureau Related"
                    elif same_institution and composite_score >= 0.85:
                        overlap_type = "Exact Duplicate" if composite_score >= 0.95 else "Semantic Duplicate"
                    elif same_institution and same_category:
                        overlap_type = "Multiple Complainant Same Incident"
                    else:
                        overlap_type = "Semantic Duplicate"

                    reasons = [
                        f"Semantic text similarity of {composite_score * 100:.1f}% identified in reported allegations.",
                    ]
                    if same_institution:
                        reasons.append(f"Both grievances reference the same institution (ID #{inst_a}).")
                    if cross_bureau:
                        reasons.append(f"Cross-bureau filing between '{bureau_a}' and '{bureau_b}'.")
                    elif same_category:
                        reasons.append(f"Identical grievance category: '{cat_a}'.")
                    if common_tokens:
                        reasons.append(f"Key overlapping terms: {', '.join(common_tokens[:6])}.")

                    results.append({
                        "primary_complaint_id": id_a,
                        "related_complaint_id": id_b,
                        "similarity_score": Decimal(str(composite_score)),
                        "raw_text_similarity": raw_sim,
                        "overlap_type": overlap_type,
                        "reason": " ".join(reasons),
                        "matching_keywords": common_tokens[:8],
                        "status": "Flagged",
                    })

                    if len(results) >= limit:
                        break
            if len(results) >= limit:
                break

        # Sort descending by similarity score
        results.sort(key=lambda x: x["similarity_score"], reverse=True)
        return results
