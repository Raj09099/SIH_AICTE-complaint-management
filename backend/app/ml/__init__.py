"""
Machine Learning and Natural Language Processing package for AICTE Complaint Intelligence.
"""

from app.ml.text_preprocessing import ComplaintTextPreprocessor
from app.ml.overlap_detector import ComplaintOverlapDetector
from app.ml.pattern_detector import ProblemPatternDetector
from app.ml.evidence_checker import ResolutionEvidenceChecker

__all__ = [
    "ComplaintTextPreprocessor",
    "ComplaintOverlapDetector",
    "ProblemPatternDetector",
    "ResolutionEvidenceChecker",
]
