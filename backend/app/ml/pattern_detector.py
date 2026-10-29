"""
Feature 2: Multi-Institution Problem Pattern Detector.
Identifies recurring complaint themes across multiple distinct institutions using
scikit-learn TF-IDF vectorization, pairwise cosine similarity, and hierarchical clustering.

Design guarantees:
1. Cross-institution validation: Groups containing complaints from only one institution
   are strictly excluded.
2. Configurable similarity thresholds (default: 0.40) and minimum institution requirements (default: 2).
3. Graceful handling of empty datasets, short texts, and missing metadata.
4. Comprehensive pattern outputs: theme/title, complaint count, affected institutions count,
   institution details, linked complaint IDs, and time-trend distributions.
"""

from collections import Counter, defaultdict
from datetime import date, datetime
import logging
from typing import Any, Dict, List, Optional, Set, Tuple
import numpy as np
from sklearn.cluster import AgglomerativeClustering
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

from app.ml.text_preprocessing import DOMAIN_STOPWORDS, ComplaintTextPreprocessor

logger = logging.getLogger(__name__)


def _extract_val(obj: Any, key: str, default: Any = None) -> Any:
    """Safely extracts an attribute from either a dictionary or an ORM model."""
    if isinstance(obj, dict):
        return obj.get(key, default)
    return getattr(obj, key, default)


class ProblemPatternDetector:
    """
    Clusters grievances across multiple technical institutions to uncover systemic,
    recurring regulatory violations and administrative anomalies.
    """

    def __init__(
        self,
        default_threshold: float = 0.25,
        min_institutions: int = 2,
        min_complaints: int = 2,
    ):
        self.default_threshold = max(0.10, min(0.95, default_threshold))
        self.min_institutions = max(2, min_institutions)
        self.min_complaints = max(2, min_complaints)
        self.preprocessor = ComplaintTextPreprocessor()

    def discover_patterns(
        self,
        complaints: List[Any],
        institutions_map: Optional[Dict[int, Any]] = None,
        threshold: Optional[float] = None,
        min_institutions: Optional[int] = None,
        min_complaints: Optional[int] = None,
        category_filter: Optional[str] = None,
        bureau_filter: Optional[str] = None,
        state_filter: Optional[str] = None,
        limit: int = 50,
    ) -> List[Dict[str, Any]]:
        """
        Discovers systemic multi-institution problem patterns across complaints.

        Args:
            complaints: List of complaint records (ORM models or dictionaries).
            institutions_map: Optional mapping of institution_id -> Institution object/dict.
            threshold: Cosine similarity threshold (defaults to self.default_threshold).
            min_institutions: Minimum distinct institutions (defaults to self.min_institutions).
            min_complaints: Minimum complaints in pattern (defaults to self.min_complaints).
            category_filter: Optional category constraint.
            bureau_filter: Optional bureau constraint.
            state_filter: Optional institution state constraint.
            limit: Maximum patterns to return.

        Returns:
            List of structured problem pattern dictionaries sorted by severity.
        """
        active_threshold = threshold if threshold is not None else self.default_threshold
        active_min_inst = min_institutions if min_institutions is not None else self.min_institutions
        active_min_comp = min_complaints if min_complaints is not None else self.min_complaints
        inst_map = institutions_map or {}

        # 1. Edge case: Empty or insufficient dataset
        if not complaints or len(complaints) < active_min_inst:
            return []

        # 2. Apply initial filters
        filtered_complaints: List[Any] = []
        for c in complaints:
            c_cat = (_extract_val(c, "category") or "").strip()
            c_bur = (_extract_val(c, "bureau") or "").strip()
            inst_id = _extract_val(c, "institution_id")

            if category_filter and c_cat.lower() != category_filter.strip().lower():
                continue
            if bureau_filter and c_bur.lower() != bureau_filter.strip().lower():
                continue

            if state_filter and inst_id:
                inst_obj = inst_map.get(inst_id) or _extract_val(c, "institution")
                inst_state = (_extract_val(inst_obj, "state") or "").strip()
                if inst_state.lower() != state_filter.strip().lower():
                    continue

            filtered_complaints.append(c)

        if len(filtered_complaints) < active_min_inst:
            return []

        # 3. Partition complaints by Category to guarantee topical coherence
        # AICTE grievances are categorized (Fee, Faculty, Infrastructure, Ragging, etc.)
        category_buckets: Dict[str, List[Any]] = defaultdict(list)
        for c in filtered_complaints:
            cat = (_extract_val(c, "category") or "General Grievance").strip()
            category_buckets[cat].append(c)

        discovered_patterns: List[Dict[str, Any]] = []

        # 4. Perform clustering within each category bucket
        for cat_name, bucket in category_buckets.items():
            # Quick check: distinct institutions in bucket must be >= min_institutions
            distinct_inst_in_bucket = {
                _extract_val(c, "institution_id")
                for c in bucket
                if _extract_val(c, "institution_id") is not None
            }
            if len(distinct_inst_in_bucket) < active_min_inst or len(bucket) < active_min_comp:
                continue

            bucket_patterns = self._cluster_category_bucket(
                category_name=cat_name,
                bucket_complaints=bucket,
                threshold=active_threshold,
                min_institutions=active_min_inst,
                min_complaints=active_min_comp,
                institutions_map=inst_map,
            )
            discovered_patterns.extend(bucket_patterns)

        # 5. Remove highly redundant/overlapping patterns if any
        deduplicated = self._deduplicate_patterns(discovered_patterns)

        # 6. Rank patterns by severity and assign clean pattern codes
        ranked = self.rank_patterns_by_severity(deduplicated)
        for idx, p in enumerate(ranked, start=1):
            p["pattern_code"] = f"PAT-{idx:03d}"

        return ranked[:limit]

    def _cluster_category_bucket(
        self,
        category_name: str,
        bucket_complaints: List[Any],
        threshold: float,
        min_institutions: int,
        min_complaints: int,
        institutions_map: Dict[int, Any],
    ) -> List[Dict[str, Any]]:
        """
        Executes TF-IDF vectorization and agglomerative clustering for a single category bucket.
        """
        n_items = len(bucket_complaints)
        if n_items < min_complaints:
            return []

        # Build composite normalized texts (category + 2x subject + description)
        valid_complaints: List[Any] = []
        composite_texts: List[str] = []
        for c in bucket_complaints:
            subj = (_extract_val(c, "subject") or "").strip()
            desc = (_extract_val(c, "description") or "").strip()
            # Skip complaints with no substantive subject or description
            if not subj and not desc:
                continue

            cat = (_extract_val(c, "category") or category_name).strip()
            raw = f"{subj} {subj} {cat} {desc}"
            normalized = self.preprocessor.normalize_text_for_clustering(raw)
            if not normalized.strip():
                continue

            valid_complaints.append(c)
            composite_texts.append(normalized)

        if len(valid_complaints) < min_complaints:
            return []

        try:
            vectorizer = TfidfVectorizer(
                ngram_range=(1, 1),
                stop_words="english",
                sublinear_tf=True,
                min_df=1,
            )
            tfidf_matrix = vectorizer.fit_transform(composite_texts)
        except ValueError:
            # Vocabulary empty (e.g. only stopwords)
            return []

        sim_matrix = cosine_similarity(tfidf_matrix)

        # If similarity matrix is too sparse or all zeros, return empty
        if sim_matrix.size == 0 or np.isnan(sim_matrix).any():
            return []

        # Convert similarity to distance matrix: distance = 1.0 - similarity
        distance_matrix = np.clip(1.0 - sim_matrix, 0.0, 1.0)
        # Ensure exact zeros on the diagonal
        np.fill_diagonal(distance_matrix, 0.0)

        # Agglomerative clustering with distance threshold = 1.0 - threshold
        distance_threshold = max(0.01, min(0.95, 1.0 - threshold))
        try:
            clustering = AgglomerativeClustering(
                metric="precomputed",
                linkage="average",
                distance_threshold=distance_threshold,
                n_clusters=None,
            )
            cluster_labels = clustering.fit_predict(distance_matrix)
        except Exception as exc:
            logger.warning("Clustering error in category %s: %s", category_name, exc)
            return []

        # Group complaint indices by cluster label
        clusters: Dict[int, List[int]] = defaultdict(list)
        for idx, lbl in enumerate(cluster_labels):
            clusters[lbl].append(idx)

        feature_names = vectorizer.get_feature_names_out()
        patterns: List[Dict[str, Any]] = []

        for lbl, member_indices in clusters.items():
            if len(member_indices) < min_complaints:
                continue

            cluster_complaints = [valid_complaints[i] for i in member_indices]

            # Rule 1: Distinct institutions check
            distinct_institutions_set: Set[int] = {
                _extract_val(c, "institution_id")
                for c in cluster_complaints
                if _extract_val(c, "institution_id") is not None
            }

            # STRICT FILTER: Must affect multiple distinct institutions
            if len(distinct_institutions_set) < min_institutions:
                continue

            # Sub-similarity matrix for this cluster
            sub_sim = sim_matrix[np.ix_(member_indices, member_indices)]
            avg_cohesion = float(np.mean(sub_sim))

            # Identify medoid complaint (highest average similarity to other cluster members)
            if len(member_indices) > 1:
                member_mean_sims = np.mean(sub_sim, axis=1)
                medoid_pos = int(np.argmax(member_mean_sims))
                medoid_complaint = cluster_complaints[medoid_pos]
            else:
                medoid_complaint = cluster_complaints[0]

            # Extract top descriptive keywords across the cluster members
            cluster_tfidf_sum = np.asarray(tfidf_matrix[member_indices].sum(axis=0)).flatten()
            top_kw_indices = cluster_tfidf_sum.argsort()[::-1]
            keywords: List[str] = []
            for kw_idx in top_kw_indices:
                word = feature_names[kw_idx]
                if word not in DOMAIN_STOPWORDS and len(word) > 2 and word not in keywords:
                    keywords.append(word)
                if len(keywords) >= 6:
                    break

            # Collect affected institutions breakdown
            affected_institutions: List[Dict[str, Any]] = []
            inst_counts: Counter = Counter()
            for c in cluster_complaints:
                iid = _extract_val(c, "institution_id")
                if iid is not None:
                    inst_counts[iid] += 1

            for iid, c_count in inst_counts.most_common():
                inst_obj = institutions_map.get(iid)
                if not inst_obj:
                    # Check if complaint has institution relationship loaded
                    for c in cluster_complaints:
                        if _extract_val(c, "institution_id") == iid:
                            inst_obj = _extract_val(c, "institution")
                            if inst_obj:
                                break

                affected_institutions.append({
                    "id": iid,
                    "aicte_id": _extract_val(inst_obj, "aicte_id") or f"INST-{iid}",
                    "name": _extract_val(inst_obj, "name") or f"Technical Institution #{iid}",
                    "state": _extract_val(inst_obj, "state"),
                    "city": _extract_val(inst_obj, "city"),
                    "bureau_jurisdiction": _extract_val(inst_obj, "bureau_jurisdiction"),
                    "complaint_count": c_count,
                })

            # Time-trend analysis
            trend_distribution, trend_direction, earliest_date, latest_date = (
                self._compute_time_trends(cluster_complaints)
            )

            # Linked complaints brief
            linked_complaints: List[Dict[str, Any]] = []
            urgent_count = 0
            for c in cluster_complaints:
                prio = (_extract_val(c, "priority") or "Medium").capitalize()
                if prio in ("High", "Urgent", "Critical"):
                    urgent_count += 1

                iid = _extract_val(c, "institution_id")
                inst_name = None
                inst_aicte = None
                if iid:
                    matched_inst = next((ai for ai in affected_institutions if ai["id"] == iid), None)
                    if matched_inst:
                        inst_name = matched_inst["name"]
                        inst_aicte = matched_inst["aicte_id"]

                f_date = _extract_val(c, "filing_date")
                if isinstance(f_date, str):
                    try:
                        f_date = date.fromisoformat(f_date)
                    except ValueError:
                        f_date = None

                linked_complaints.append({
                    "id": _extract_val(c, "id"),
                    "complaint_no": _extract_val(c, "complaint_no") or f"CMP-{_extract_val(c, 'id')}",
                    "institution_id": iid,
                    "institution_name": inst_name,
                    "institution_aicte_id": inst_aicte,
                    "category": _extract_val(c, "category") or category_name,
                    "bureau": _extract_val(c, "bureau") or "General",
                    "subject": _extract_val(c, "subject") or "Grievance Record",
                    "status": _extract_val(c, "status") or "New",
                    "priority": prio,
                    "filing_date": f_date,
                })

            # Determine bureau: if all share the same bureau, use it; otherwise "Cross-Bureau"
            bureaus_in_pattern = {
                _extract_val(c, "bureau") for c in cluster_complaints if _extract_val(c, "bureau")
            }
            primary_bureau = (
                list(bureaus_in_pattern)[0] if len(bureaus_in_pattern) == 1 else "Cross-Bureau Pattern"
            )

            # Determine dominant state if concentrated
            states_in_pattern = [
                ai["state"] for ai in affected_institutions if ai.get("state")
            ]
            dominant_state = (
                Counter(states_in_pattern).most_common(1)[0][0]
                if states_in_pattern
                else None
            )

            # Title & Description
            medoid_subject = _extract_val(medoid_complaint, "subject") or category_name
            # Clean headline title
            title = f"{category_name}: {medoid_subject}"
            if len(title) > 200:
                title = title[:197] + "..."

            description = (
                f"Systemic grievance pattern identified across {len(distinct_institutions_set)} technical institutions "
                f"with {len(cluster_complaints)} related complaints. Primary issues cite {', '.join(keywords[:4])}."
            )
            representative_text = (
                _extract_val(medoid_complaint, "description")
                or _extract_val(medoid_complaint, "subject")
                or "Grievance text recorded across multiple technical institutions."
            )

            # Calculate composite severity score
            # Higher weight for number of institutions (broad systemic spread), total volume, and priority
            severity_score = round(
                (len(distinct_institutions_set) * 3.0)
                + (len(cluster_complaints) * 1.0)
                + (urgent_count * 1.5),
                2,
            )

            patterns.append({
                "id": None,
                "pattern_code": "",  # Assigned after ranking
                "title": title,
                "category": category_name,
                "bureau": primary_bureau,
                "state": dominant_state,
                "affected_institutions_count": len(distinct_institutions_set),
                "complaint_count": len(cluster_complaints),
                "cluster_score": round(max(0.0, min(1.0, avg_cohesion)), 4),
                "severity_score": severity_score,
                "description": description,
                "representative_text": representative_text,
                "keywords": keywords,
                "affected_institutions": affected_institutions,
                "sample_complaint_ids": [_extract_val(c, "id") for c in cluster_complaints if _extract_val(c, "id") is not None],
                "complaints": linked_complaints,
                "trend_distribution": trend_distribution,
                "trend_direction": trend_direction,
                "earliest_filing_date": earliest_date,
                "latest_filing_date": latest_date,
                "status": "Active",
                "created_at": datetime.now(),
            })

        return patterns

    def _compute_time_trends(
        self, complaints: List[Any]
    ) -> Tuple[List[Dict[str, Any]], str, Optional[date], Optional[date]]:
        """
        Computes monthly distribution, trend velocity direction, and date bounds.
        """
        dates: List[date] = []
        for c in complaints:
            f_date = _extract_val(c, "filing_date") or _extract_val(c, "incident_date")
            if isinstance(f_date, str):
                try:
                    f_date = date.fromisoformat(f_date)
                except ValueError:
                    f_date = None
            elif isinstance(f_date, datetime):
                f_date = f_date.date()

            if isinstance(f_date, date):
                dates.append(f_date)

        if not dates:
            return [], "Stable", None, None

        dates.sort()
        earliest_date = dates[0]
        latest_date = dates[-1]

        # Monthly aggregation
        month_counts: Counter = Counter()
        for d in dates:
            month_key = d.strftime("%Y-%m")
            month_counts[month_key] += 1

        trend_distribution = [
            {"month": m, "count": count}
            for m, count in sorted(month_counts.items())
        ]

        # Trend direction heuristic
        if len(trend_distribution) >= 2:
            recent_count = trend_distribution[-1]["count"]
            prev_count = trend_distribution[-2]["count"]
            if recent_count >= prev_count * 1.5 and recent_count >= 2:
                trend_direction = "Surging"
            elif prev_count > 0 and recent_count < prev_count * 0.7:
                trend_direction = "Declining"
            else:
                trend_direction = "Stable"
        elif len(trend_distribution) == 1:
            trend_direction = "Emerging"
        else:
            trend_direction = "Stable"

        return trend_distribution, trend_direction, earliest_date, latest_date

    def _deduplicate_patterns(
        self, patterns: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """
        Removes heavily overlapping pattern clusters (Jaccard similarity >= 0.75 in complaint IDs).
        """
        if len(patterns) <= 1:
            return patterns

        unique_patterns: List[Dict[str, Any]] = []
        for p in patterns:
            p_ids = set(p.get("sample_complaint_ids", []))
            if not p_ids:
                unique_patterns.append(p)
                continue

            is_redundant = False
            for existing in unique_patterns:
                e_ids = set(existing.get("sample_complaint_ids", []))
                if not e_ids:
                    continue
                intersection = p_ids.intersection(e_ids)
                union = p_ids.union(e_ids)
                jaccard = len(intersection) / len(union) if union else 0.0
                if jaccard >= 0.75:
                    is_redundant = True
                    break

            if not is_redundant:
                unique_patterns.append(p)

        return unique_patterns

    def rank_patterns_by_severity(
        self,
        patterns: List[Dict[str, Any]],
    ) -> List[Dict[str, Any]]:
        """
        Sorts patterns by severity_score descending, then affected_institutions_count descending.
        """
        return sorted(
            patterns,
            key=lambda p: (
                p.get("severity_score", 0.0),
                p.get("affected_institutions_count", 0),
                p.get("complaint_count", 0),
                p.get("cluster_score", 0.0),
            ),
            reverse=True,
        )
