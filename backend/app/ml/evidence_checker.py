"""
Feature 3: Resolution Evidence Checker
Extracts text from supported uploaded documents (PDF, DOCX, TXT) using PyMuPDF and assesses
whether an institution has genuinely resolved a complaint.
Supports human review rather than automatic approval to prevent false complaint closures.
"""

from collections import Counter
from datetime import datetime
import io
import logging
from pathlib import Path
import re
from typing import Any, Dict, List, Optional, Set, Tuple
import xml.etree.ElementTree as ET
import zipfile
import fitz  # PyMuPDF
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

from app.ml.text_preprocessing import ComplaintTextPreprocessor

logger = logging.getLogger(__name__)


def _extract_amounts(text: str) -> List[float]:
    """
    Extracts monetary numbers/amounts from text, handling INR, Rs, and currency commas.
    e.g. 'Rs. 15,000', 'INR 25000', '15000.00'
    """
    amounts: List[float] = []
    # Pattern matching currency prefix or explicit amounts
    patterns = [
        r"(?:rs\.?|inr|₹)\s*([\d,]+(?:\.\d{2})?)",
        r"\b(?:amount|sum|fee|deposit|refund|paid|caution)\s*(?:of)?\s*(?:rs\.?|inr|₹)?\s*([\d,]+(?:\.\d{2})?)",
        r"\b([\d,]{4,}(?:\.\d{2})?)\b",  # 4+ digit numbers like 15000, 25,000
    ]
    for p in patterns:
        matches = re.findall(p, text, flags=re.IGNORECASE)
        for m in matches:
            clean_str = m.replace(",", "").strip()
            try:
                val = float(clean_str)
                # Filter out obvious years like 2024, 2025, 2026, 2027
                if val not in [2023.0, 2024.0, 2025.0, 2026.0, 2027.0] and val > 10.0:
                    amounts.append(val)
            except ValueError:
                continue
    return list(dict.fromkeys(amounts))


def _extract_dates(text: str) -> List[str]:
    """Extracts date strings like 12/10/2026, 2026-10-12, or 12 October 2026."""
    date_patterns = [
        r"\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b",
        r"\b\d{4}[/-]\d{1,2}[/-]\d{1,2}\b",
        r"\b\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{2,4}\b",
    ]
    found: List[str] = []
    for dp in date_patterns:
        m = re.findall(dp, text, flags=re.IGNORECASE)
        found.extend(m)
    return list(dict.fromkeys(found))


class ResolutionEvidenceChecker:
    """
    Parses compliance PDFs and documents using PyMuPDF and computes transparent,
    explainable relevance metrics against complaint grievances and claimed resolutions.
    """

    def __init__(self):
        self.preprocessor = ComplaintTextPreprocessor()

    def extract_text_from_document(
        self,
        file_bytes: bytes,
        filename: str,
    ) -> Dict[str, Any]:
        """
        Extracts clean text and document metadata from uploaded bytes.
        Supports PDF (via PyMuPDF), DOCX (via XML text parser), and TXT.
        Handles encrypted, corrupted, and scanned documents gracefully.
        """
        fn_lower = filename.lower()
        full_text = ""
        page_count = 1
        doc_format = "UNKNOWN"
        is_scanned = False
        requires_ocr = False

        # 1. Validation: Magic bytes & size
        if len(file_bytes) == 0:
            raise ValueError("Uploaded document is completely empty (0 bytes).")

        if len(file_bytes) > 25 * 1024 * 1024:
            raise ValueError("Document exceeds the maximum allowable limit of 25MB.")

        # PDF processing
        if fn_lower.endswith(".pdf"):
            doc_format = "PDF"
            if not file_bytes.startswith(b"%PDF"):
                raise ValueError("Corrupted or invalid PDF header. File is not a valid PDF document.")

            try:
                doc = fitz.open(stream=file_bytes, filetype="pdf")
            except Exception as e:
                raise ValueError(f"Unable to read or parse PDF document: {e}")

            if doc.is_encrypted:
                doc.close()
                raise ValueError("The uploaded PDF is password-protected. Please provide an unlocked document.")

            page_count = len(doc)
            chunks: List[str] = []
            for page in doc:
                txt = page.get_text("text")
                if txt:
                    chunks.append(txt.strip())
            doc.close()
            full_text = "\n\n".join(chunks)

            # Detect scanned image PDF without text layer
            words_extracted = full_text.split()
            if len(words_extracted) < 10 and page_count >= 1:
                is_scanned = True
                requires_ocr = True

        # DOCX processing
        elif fn_lower.endswith(".docx"):
            doc_format = "DOCX"
            if not file_bytes.startswith(b"PK\x03\x04"):
                raise ValueError("Corrupted or invalid DOCX document. File does not match Zip container signature.")

            try:
                with zipfile.ZipFile(io.BytesIO(file_bytes)) as z:
                    if "word/document.xml" not in z.namelist():
                        raise ValueError("Invalid DOCX structure: missing word/document.xml.")
                    xml_data = z.read("word/document.xml")
                    tree = ET.fromstring(xml_data)
                    namespace = {"w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main"}
                    text_nodes = [
                        node.text for node in tree.iter(f"{{{namespace['w']}}}t") if node.text
                    ]
                    full_text = " ".join(text_nodes)
            except zipfile.BadZipFile:
                raise ValueError("Corrupted Word (.docx) archive. File cannot be decompressed.")
            except Exception as e:
                raise ValueError(f"Failed to extract text from DOCX document: {e}")

        # Legacy DOC / RTF / TXT processing
        elif fn_lower.endswith(".doc"):
            doc_format = "DOC"
            try:
                ascii_strings = re.findall(b"[\x20-\x7E]{4,}", file_bytes)
                full_text = " ".join([s.decode("latin-1", errors="ignore") for s in ascii_strings])
            except Exception as e:
                raise ValueError(f"Failed to parse legacy DOC document: {e}")

        elif fn_lower.endswith((".txt", ".rtf", ".csv", ".md")):
            doc_format = "TXT"
            try:
                full_text = file_bytes.decode("utf-8", errors="replace")
            except Exception:
                full_text = file_bytes.decode("latin-1", errors="replace")
        else:
            raise ValueError(f"Unsupported document format '{fn_lower}'. Allowed formats: PDF, DOCX, TXT.")

        clean_text = full_text.strip()
        words = clean_text.split()
        word_count = len(words)

        return {
            "text": clean_text,
            "page_count": page_count,
            "word_count": word_count,
            "doc_format": doc_format,
            "is_empty": (word_count < 5),
            "is_scanned": is_scanned,
            "requires_ocr": requires_ocr,
        }

    def extract_text_from_pdf(self, file_path: str) -> str:
        """
        Extract raw text content from uploaded evidence PDF using PyMuPDF (backward-compatible signature).
        """
        path = Path(file_path)
        if not path.exists():
            raise FileNotFoundError(f"Evidence document not found at {file_path}")
        with open(path, "rb") as f:
            data = f.read()
        res = self.extract_text_from_document(data, path.name)
        return res["text"]

    def evaluate_relevance(
        self,
        complaint_details: Dict[str, Any],
        extracted_evidence_text: str,
        is_scanned: bool = False,
        requires_ocr: bool = False,
    ) -> Dict[str, Any]:
        """
        Calculates explainable contextual relevance score using the 6-component formula:
        | Factor | Weight |
        |---|---:|
        | Semantic relevance | 30 |
        | Keyword relevance | 20 |
        | Complaint / student reference match | 15 |
        | Resolution action relevance | 15 |
        | Entity and transaction consistency | 10 |
        | Document completeness | 10 |
        | Total | 100 |

        Evaluates 4-state verification criteria:
        - Present
        - Missing
        - Not Applicable
        - Unable to Verify

        Detects entity and financial amount mismatches (e.g. claimed 25k vs document 10k).
        """
        evidence_text = (extracted_evidence_text or "").strip()
        words = evidence_text.split()
        word_count = len(words)

        # Handle empty or scanned document without extractable text
        if word_count < 5 or is_scanned:
            warnings_list = [
                {
                    "severity": "Critical",
                    "message": "Scanned document or unreadable image detected with no embedded text layer. OCR or manual physical review is required.",
                }
            ]
            empty_components = [
                {
                    "factor": "Semantic relevance",
                    "weight": 30.0,
                    "raw_value": 0.0,
                    "score": 0.0,
                    "explanation": "No extractable text available in document to compare against complaint statement.",
                    "evidence": None,
                },
                {
                    "factor": "Keyword relevance",
                    "weight": 20.0,
                    "raw_value": 0.0,
                    "score": 0.0,
                    "explanation": "No resolution keywords could be parsed.",
                    "evidence": None,
                },
                {
                    "factor": "Complaint / student reference match",
                    "weight": 15.0,
                    "raw_value": 0.0,
                    "score": 0.0,
                    "explanation": "No reference identifiers detected.",
                    "evidence": None,
                },
                {
                    "factor": "Resolution action relevance",
                    "weight": 15.0,
                    "raw_value": 0.0,
                    "score": 0.0,
                    "explanation": "No action clause detected.",
                    "evidence": None,
                },
                {
                    "factor": "Entity and transaction consistency",
                    "weight": 10.0,
                    "raw_value": 0.0,
                    "score": 0.0,
                    "explanation": "Unable to verify transaction values in unreadable document.",
                    "evidence": None,
                },
                {
                    "factor": "Document completeness",
                    "weight": 10.0,
                    "raw_value": 0.0,
                    "score": 0.0,
                    "explanation": "Document contains 0 extractable words.",
                    "evidence": "Word count: 0",
                },
            ]
            empty_checklist = [
                {"key": "letterhead", "label": "Institutional Letterhead / Header", "status": "Missing", "reason": "No text detected"},
                {"key": "student_ref", "label": "Student / Complainant Reference", "status": "Missing", "reason": "No text detected"},
                {"key": "complaint_ref", "label": "Complaint Tracking Reference", "status": "Missing", "reason": "No text detected"},
                {"key": "action_stmt", "label": "Specific Redressal Action Statement", "status": "Missing", "reason": "No text detected"},
                {"key": "financial_proof", "label": "Transaction / Financial Proof", "status": "Missing", "reason": "No text detected"},
                {"key": "dates_amounts", "label": "Relevant Dates and Amounts", "status": "Missing", "reason": "No text detected"},
                {"key": "authority_name", "label": "Official Authority Name & Designation", "status": "Missing", "reason": "No text detected"},
                {"key": "signature_seal", "label": "Official Signature / Institutional Seal", "status": "Unable to Verify", "reason": "Visual signature verification requires human inspection"},
            ]
            return {
                "total_score": 0.0,
                "percentage": 0,
                "risk_level": "High",
                "recommendation": "Weak / Unreadable Evidence – Potential False Complaint Closure",
                "recommendation_code": "REJECT_RECOMMENDED",
                "score_components": empty_components,
                "checklist": empty_checklist,
                "entity_matches": [],
                "warnings": warnings_list,
                "matched_keywords": [],
                "missing_elements": ["Document contains no extractable text layer or is a scanned image."],
                "all_elements_present": False,
                "is_scanned_pdf": True,
                "requires_ocr": True,
                "word_count": word_count,
                "page_count": 1,
                "summary": "Document extraction yielded insufficient text. Scanned PDFs without an optical character layer cannot be verified automatically.",
            }

        # ----------------------------------------------------------------------
        # Target Complaint Details
        # ----------------------------------------------------------------------
        subj = (
            complaint_details.get("translated_subject")
            or complaint_details.get("subject")
            or ""
        ).strip()
        desc = (
            complaint_details.get("translated_description")
            or complaint_details.get("description")
            or ""
        ).strip()
        cat = (complaint_details.get("category") or "General").strip()
        bur = (complaint_details.get("bureau") or "").strip()
        complaint_no = (complaint_details.get("complaint_no") or "").strip()
        inst_name = (complaint_details.get("institution_name") or "").strip()
        res_summary = (complaint_details.get("resolution_summary") or "").strip()

        cat_lower = cat.lower()
        is_financial_cat = any(k in cat_lower for k in ["fee", "salary", "surcharge", "caution", "deposit", "finance", "money"])

        # ----------------------------------------------------------------------
        # 1. SEMANTIC RELEVANCE (Weight: 30)
        # ----------------------------------------------------------------------
        comp_raw = f"{subj} {subj} {cat} {desc} {res_summary}"
        comp_norm = self.preprocessor.normalize_text_for_clustering(comp_raw)
        evid_norm = self.preprocessor.normalize_text_for_clustering(evidence_text)

        raw_cosine_sim = 0.0
        try:
            vectorizer = TfidfVectorizer(
                ngram_range=(1, 2),
                stop_words="english",
                sublinear_tf=True,
                min_df=1,
            )
            tfidf_matrix = vectorizer.fit_transform([comp_norm, evid_norm])
            sim = cosine_similarity(tfidf_matrix[0:1], tfidf_matrix[1:2])[0][0]
            raw_cosine_sim = float(np.clip(sim, 0.0, 1.0))
        except Exception as e:
            logger.warning("Error computing TF-IDF similarity for evidence: %s", e)
            raw_cosine_sim = 0.05

        # Normalization: Cosine similarity on cross-document lengths typically spans 0.05 to 0.50
        # A raw similarity >= 0.40 indicates high thematic alignment
        normalized_semantic_ratio = min(1.0, raw_cosine_sim * 2.2)
        semantic_score = round(normalized_semantic_ratio * 30.0, 1)

        semantic_component = {
            "factor": "Semantic relevance",
            "weight": 30.0,
            "raw_value": round(raw_cosine_sim * 100.0, 1),
            "score": semantic_score,
            "explanation": f"Raw TF-IDF cosine similarity of {int(raw_cosine_sim * 100)}% between complaint grievance narrative and resolution document.",
            "evidence": f"Normalized semantic alignment: {int(normalized_semantic_ratio * 100)}% (Score: {semantic_score}/30)",
        }

        # ----------------------------------------------------------------------
        # 2. KEYWORD RELEVANCE (Weight: 20)
        # ----------------------------------------------------------------------
        category_keyword_map: Dict[str, List[str]] = {
            "fee": ["refund", "caution", "deposit", "receipt", "bank", "utr", "challan", "credited", "reimbursed", "waiver", "surcharge", "account"],
            "faculty": ["salary", "arrears", "disbursement", "pf", "epf", "appointment", "scale", "credited", "statement", "pay"],
            "infrastructure": ["repaired", "restored", "procured", "inspection", "sanitation", "clean", "water", "hostel", "renovation", "installed"],
            "ragging": ["committee", "inquiry", "disciplinary", "anti-ragging", "affidavit", "undertaking", "action", "suspended", "apology"],
            "admission": ["approval", "intake", "affiliation", "original", "returned", "cancelled", "certificates", "transfer"],
        }

        expected_action_terms = ["resolved", "resolution", "compliance", "settled", "addressed", "verified", "directive", "redressed", "affidavit", "office order"]
        for k, kw_list in category_keyword_map.items():
            if k in cat_lower:
                expected_action_terms.extend(kw_list)

        matched_action_terms = [
            term for term in expected_action_terms if re.search(r"\b" + re.escape(term) + r"\b", evidence_text, re.IGNORECASE)
        ]

        comp_words = set(re.findall(r"\b[a-zA-Z]{4,}\b", comp_norm.lower()))
        evid_words = set(re.findall(r"\b[a-zA-Z]{4,}\b", evid_norm.lower()))
        matched_comp_words = sorted(list(comp_words.intersection(evid_words)))

        all_matched_keywords = list(dict.fromkeys(matched_action_terms + matched_comp_words))
        raw_keyword_pct = min(1.0, len(all_matched_keywords) / max(4, len(expected_action_terms) * 0.40))
        keyword_score = round(raw_keyword_pct * 20.0, 1)

        keyword_component = {
            "factor": "Keyword relevance",
            "weight": 20.0,
            "raw_value": round(raw_keyword_pct * 100.0, 1),
            "score": keyword_score,
            "explanation": f"Matched {len(all_matched_keywords)} category-aware problem terms and resolution keywords.",
            "evidence": ", ".join(all_matched_keywords[:8]) if all_matched_keywords else "No keywords matched",
        }

        # ----------------------------------------------------------------------
        # 3. COMPLAINT / STUDENT REFERENCE MATCH (Weight: 15)
        # ----------------------------------------------------------------------
        ref_matches = []
        ref_score = 0.0

        ev_lower = evidence_text.lower()

        # Complaint ID match
        clean_comp_no = re.sub(r"[^a-zA-Z0-9]", "", complaint_no).lower()
        clean_ev_text = re.sub(r"[^a-zA-Z0-9]", "", ev_lower)

        has_complaint_id_match = (
            complaint_no.lower() in ev_lower
            or (clean_comp_no and clean_comp_no in clean_ev_text)
            or bool(re.search(r"\b(?:cmp|aicte)[-_]?\d+\b", ev_lower))
        )
        if has_complaint_id_match:
            ref_score += 8.0
            ref_matches.append(f"Complaint Tracking Reference ({complaint_no})")

        # Student / Complainant identifier match
        has_student_match = bool(
            re.search(r"\b(student|complainant|candidate|roll no|enrollment|registration no|scholar)\b", ev_lower)
        )
        if has_student_match:
            ref_score += 4.0
            ref_matches.append("Student/Complainant designation")

        # Institution name match
        inst_words = [w for w in re.findall(r"\b[a-zA-Z]{4,}\b", inst_name.lower()) if w not in ["college", "institute", "technology", "engineering", "approved"]]
        has_inst_match = any(w in ev_lower for w in inst_words) if inst_words else ("college" in ev_lower or "institute" in ev_lower)
        if has_inst_match:
            ref_score += 3.0
            ref_matches.append("Institution Identity")

        ref_score = min(15.0, ref_score)
        reference_component = {
            "factor": "Complaint / student reference match",
            "weight": 15.0,
            "raw_value": round((ref_score / 15.0) * 100.0, 1),
            "score": ref_score,
            "explanation": f"Validated {len(ref_matches)} grievance identifier reference(s) in document.",
            "evidence": ", ".join(ref_matches) if ref_matches else "No complaint tracking identifiers found",
        }

        # ----------------------------------------------------------------------
        # 4. RESOLUTION ACTION RELEVANCE (Weight: 15)
        # ----------------------------------------------------------------------
        action_score = 0.0
        action_evidence_clauses = []

        action_patterns = [
            (r"\b(?:has been refunded|refunded to|refund transferred|deposit credited|amount credited)\b", 15.0, "Direct refund execution confirmed"),
            (r"\b(?:original certificates? (?:returned|handed over|dispatched)|documents? returned)\b", 15.0, "Certificate return execution confirmed"),
            (r"\b(?:salary arrears? (?:disbursed|credited|transferred)|payment released)\b", 15.0, "Salary disbursement confirmed"),
            (r"\b(?:repaired|inspection completed|restored|rectified|sanitation cleaned)\b", 15.0, "Physical repair/restoration confirmed"),
            (r"\b(?:disciplinary action taken|inquiry (?:concluded|committee)|warning issued|suspended)\b", 15.0, "Disciplinary action confirmed"),
            (r"\b(?:grievance (?:has been )?resolved|action taken|matter (?:is )?settled|redressed)\b", 10.0, "Formal resolution statement present"),
            (r"\b(?:compliance report|office order|undertaking submitted)\b", 7.0, "Institutional administrative compliance statement"),
        ]

        for pat, pts, desc_label in action_patterns:
            if re.search(pat, ev_lower):
                if pts > action_score:
                    action_score = pts
                    action_evidence_clauses = [desc_label]

        action_component = {
            "factor": "Resolution action relevance",
            "weight": 15.0,
            "raw_value": round((action_score / 15.0) * 100.0, 1),
            "score": action_score,
            "explanation": "Evaluates whether document records completed redressal rather than generic correspondence.",
            "evidence": action_evidence_clauses[0] if action_evidence_clauses else "No explicit resolution action clause detected",
        }

        # ----------------------------------------------------------------------
        # 5. ENTITY & TRANSACTION CONSISTENCY (Weight: 10)
        # ----------------------------------------------------------------------
        entity_score = 10.0
        entity_matches: List[Dict[str, Any]] = []
        warnings: List[Dict[str, str]] = []

        comp_amounts = _extract_amounts(f"{subj} {desc}")
        evid_amounts = _extract_amounts(evidence_text)

        amount_mismatch_detected = False

        if is_financial_cat:
            if comp_amounts and evid_amounts:
                # Check for overlap or mismatch
                matching_amount = any(
                    any(abs(ca - ea) < 1.0 for ea in evid_amounts)
                    for ca in comp_amounts
                )
                if matching_amount:
                    matched_val = next(ca for ca in comp_amounts if any(abs(ca - ea) < 1.0 for ea in evid_amounts))
                    entity_matches.append({
                        "field": "Financial Amount",
                        "complaint_value": f"INR {matched_val:,.2f}",
                        "document_value": f"INR {matched_val:,.2f}",
                        "status": "MATCH",
                        "details": f"Disputed amount of Rs {matched_val:,.0f} matches resolution document exactly.",
                    })
                else:
                    amount_mismatch_detected = True
                    entity_score = 0.0
                    comp_amt_str = f"INR {comp_amounts[0]:,.0f}"
                    ev_amt_str = f"INR {evid_amounts[0]:,.0f}"
                    entity_matches.append({
                        "field": "Financial Amount",
                        "complaint_value": comp_amt_str,
                        "document_value": ev_amt_str,
                        "status": "MISMATCH",
                        "details": f"Amount mismatch: Complaint claimed {comp_amt_str} but document specifies {ev_amt_str}.",
                    })
                    warnings.append({
                        "severity": "Critical",
                        "message": f"Financial Amount Mismatch: Complaint claims {comp_amt_str} but submitted evidence only accounts for {ev_amt_str}!",
                    })
            elif comp_amounts and not evid_amounts:
                entity_score -= 5.0
                entity_matches.append({
                    "field": "Financial Amount",
                    "complaint_value": f"INR {comp_amounts[0]:,.0f}",
                    "document_value": "None detected",
                    "status": "MISSING",
                    "details": "Complaint references monetary claim, but evidence document specifies no numerical amount.",
                })
                warnings.append({
                    "severity": "Warning",
                    "message": "Missing financial amount: Resolution document does not state the exact refund/payment amount.",
                })
            else:
                entity_matches.append({
                    "field": "Financial Amount",
                    "complaint_value": "Not specified in complaint",
                    "document_value": f"INR {evid_amounts[0]:,.0f}" if evid_amounts else "None",
                    "status": "MATCH" if evid_amounts else "NOT_APPLICABLE",
                    "details": "General financial reference.",
                })
        else:
            entity_matches.append({
                "field": "Financial Amount",
                "complaint_value": "N/A",
                "document_value": "N/A",
                "status": "NOT_APPLICABLE",
                "details": f"Non-monetary grievance category ({cat}). Financial amount check is not applicable.",
            })

        # Transaction reference check (UTR, receipt, cheque)
        has_utr = bool(re.search(r"\b(utr\s*(?:#|no\.?|id)?\s*[:\s]?[a-zA-Z0-9]{8,}|cheque\s*(?:no\.?|#)?\s*\d{6}|receipt\s*(?:no\.?|#)?\s*[a-zA-Z0-9]+)\b", ev_lower))
        if is_financial_cat:
            if has_utr:
                utr_match = re.search(r"\b(utr\s*(?:#|no\.?|id)?\s*[:\s]?[a-zA-Z0-9]{8,}|receipt\s*(?:no\.?|#)?\s*[a-zA-Z0-9]+)\b", ev_lower)
                entity_matches.append({
                    "field": "Transaction Proof",
                    "complaint_value": "Payment expected",
                    "document_value": utr_match.group(0).upper() if utr_match else "Verified",
                    "status": "MATCH",
                    "details": "Verifiable banking transaction reference or receipt number detected.",
                })
            else:
                entity_score = max(0.0, entity_score - 4.0)
                entity_matches.append({
                    "field": "Transaction Proof",
                    "complaint_value": "Payment expected",
                    "document_value": "None detected",
                    "status": "MISSING",
                    "details": "No bank UTR, RTGS/NEFT transaction ID, or formal receipt number found.",
                })
                warnings.append({
                    "severity": "Critical",
                    "message": "Missing transaction proof: Evidence lacks bank UTR or voucher reference for claimed refund.",
                })
        else:
            entity_matches.append({
                "field": "Transaction Proof",
                "complaint_value": "N/A",
                "document_value": "N/A",
                "status": "NOT_APPLICABLE",
                "details": "Non-financial grievance category.",
            })

        entity_score = max(0.0, min(10.0, entity_score))
        entity_component = {
            "factor": "Entity and transaction consistency",
            "weight": 10.0,
            "raw_value": round((entity_score / 10.0) * 100.0, 1),
            "score": entity_score,
            "explanation": "Validates consistency between claimed amounts, dates, and bank transaction references.",
            "evidence": "Amounts and identifiers consistent" if not amount_mismatch_detected else "Amount mismatch detected",
        }

        # ----------------------------------------------------------------------
        # 6. DOCUMENT COMPLETENESS & STRUCTURE (Weight: 10)
        # ----------------------------------------------------------------------
        doc_score = 0.0
        doc_signals = []

        if word_count >= 25:
            doc_score += 3.0
            doc_signals.append(f"Substantive text ({word_count} words)")
        elif word_count >= 15:
            doc_score += 1.5

        has_header = bool(re.search(r"\b(college|institute|university|ref|date|office of|affidavit|department)\b", ev_lower))
        if has_header:
            doc_score += 3.5
            doc_signals.append("Formal institutional letterhead/header")

        has_sign_ref = bool(re.search(r"\b(principal|director|registrar|authorized signatory|dean|head)\b", ev_lower))
        if has_sign_ref:
            doc_score += 3.5
            doc_signals.append("Authority signatory block")

        doc_score = min(10.0, doc_score)
        completeness_component = {
            "factor": "Document completeness",
            "weight": 10.0,
            "raw_value": round((doc_score / 10.0) * 100.0, 1),
            "score": doc_score,
            "explanation": "Structural assessment of institutional letterhead, paragraph body, and signatory blocks.",
            "evidence": ", ".join(doc_signals) if doc_signals else "Minimal document structure",
        }

        # ----------------------------------------------------------------------
        # TOTAL SCORE & ASSESSMENT BANDS
        # ----------------------------------------------------------------------
        score_components = [
            semantic_component,
            keyword_component,
            reference_component,
            action_component,
            entity_component,
            completeness_component,
        ]

        total_score = round(sum(c["score"] for c in score_components), 1)
        total_score = min(100.0, max(0.0, total_score))
        percentage = int(round(total_score))

        # Assessment bands
        if total_score >= 80.0 and not amount_mismatch_detected:
            risk_level = "Low"
            recommendation = "High Relevance – Officer Verification Required"
            recommendation_code = "APPROVE_RECOMMENDED"
        elif total_score >= 60.0 and not amount_mismatch_detected:
            risk_level = "Medium"
            recommendation = "Moderate Relevance – Additional Review Required"
            recommendation_code = "SCRUTINIZE_RECOMMENDED"
        else:
            risk_level = "High"
            recommendation = "Low Relevance – Insufficient or Weak Supporting Evidence"
            recommendation_code = "REJECT_RECOMMENDED"

        # ----------------------------------------------------------------------
        # INSTITUTIONAL VERIFICATION CHECKLIST (4 States)
        # ----------------------------------------------------------------------
        checklist: List[Dict[str, Any]] = []

        # 1. Institutional Letterhead / Header
        has_letterhead = bool(re.search(r"\b(college|institute|university|institution|academy|polytechnic)\b", ev_lower))
        checklist.append({
            "key": "letterhead",
            "label": "Institutional Letterhead / Header",
            "status": "Present" if has_letterhead else "Missing",
            "reason": "Institutional identity header identified in document." if has_letterhead else "Document lacks formal institutional header or letterhead.",
        })

        # 2. Student / Complainant Reference
        checklist.append({
            "key": "student_ref",
            "label": "Student / Complainant Reference",
            "status": "Present" if has_student_match else "Missing",
            "reason": "Complainant / student designation reference identified." if has_student_match else "No student name, roll number, or complainant reference found.",
        })

        # 3. Complaint Tracking Reference
        checklist.append({
            "key": "complaint_ref",
            "label": "Complaint Tracking Reference",
            "status": "Present" if has_complaint_id_match else "Missing",
            "reason": f"Complaint reference {complaint_no} verified in text." if has_complaint_id_match else f"Document does not mention complaint reference number ({complaint_no}).",
        })

        # 4. Specific Redressal Action Statement
        has_action_stmt = action_score >= 10.0
        checklist.append({
            "key": "action_stmt",
            "label": "Specific Redressal Action Statement",
            "status": "Present" if has_action_stmt else "Missing",
            "reason": "Explicit corrective/resolution action clause verified." if has_action_stmt else "Lacks specific statement confirming completion of redressal action.",
        })

        # 5. Transaction / Financial Proof
        if is_financial_cat:
            checklist.append({
                "key": "financial_proof",
                "label": "Transaction / Financial Proof",
                "status": "Present" if has_utr else "Missing",
                "reason": "Bank UTR, transaction code, or receipt number detected." if has_utr else "Missing banking UTR or monetary receipt reference for fee grievance.",
            })
        else:
            checklist.append({
                "key": "financial_proof",
                "label": "Transaction / Financial Proof",
                "status": "Not Applicable",
                "reason": f"Non-financial grievance category ({cat}); monetary transaction proof is not applicable.",
            })

        # 6. Relevant Dates and Amounts
        dates_found = _extract_dates(evidence_text)
        if is_financial_cat:
            dates_amounts_ok = bool(dates_found and evid_amounts and not amount_mismatch_detected)
            checklist.append({
                "key": "dates_amounts",
                "label": "Relevant Dates and Amounts",
                "status": "Present" if dates_amounts_ok else "Missing",
                "reason": f"Found date ({dates_found[0] if dates_found else 'none'}) and amount consistent." if dates_amounts_ok else "Missing payment date or amount information.",
            })
        else:
            checklist.append({
                "key": "dates_amounts",
                "label": "Relevant Dates and Amounts",
                "status": "Present" if dates_found else "Missing",
                "reason": f"Inspection/incident date {dates_found[0]} identified." if dates_found else "No relevant dates identified in report.",
            })

        # 7. Official Authority Name & Designation
        has_auth = bool(re.search(r"\b(principal|director|dean|registrar|head of institution|provost|chairman)\b", ev_lower))
        checklist.append({
            "key": "authority_name",
            "label": "Official Authority Name & Designation",
            "status": "Present" if has_auth else "Missing",
            "reason": "Institutional authority signatory designation present." if has_auth else "Missing designation of issuing authority.",
        })

        # 8. Official Signature / Seal (ALWAYS marked Unable to Verify for text parser)
        checklist.append({
            "key": "signature_seal",
            "label": "Official Signature / Institutional Seal",
            "status": "Unable to Verify",
            "reason": "PyMuPDF text extraction cannot authenticate physical wet-ink signatures or rubber stamps. Manual visual verification by AICTE officer is mandatory.",
        })

        # ----------------------------------------------------------------------
        # MISSING ELEMENTS & WARNINGS
        # ----------------------------------------------------------------------
        missing_elements = [
            item["label"] for item in checklist if item["status"] == "Missing"
        ]

        if not has_complaint_id_match:
            warnings.append({
                "severity": "Warning",
                "message": f"Document does not explicitly mention the complaint tracking ID ({complaint_no}).",
            })

        if raw_cosine_sim < 0.10:
            warnings.append({
                "severity": "Warning",
                "message": "Low semantic overlap: The textual wording of the document has minimal similarity to the student grievance.",
            })

        # Add mandatory visual inspection warning for signature/seal
        warnings.append({
            "severity": "Information",
            "message": "Physical signature and official institute stamp require visual inspection on the original document.",
        })

        # Crucial bug fix: all_elements_present must strictly be False if any item is Missing or Unable to Verify
        all_elements_present = (
            len(missing_elements) == 0
            and not any(item["status"] == "Unable to Verify" for item in checklist if item["key"] != "signature_seal")
            and not amount_mismatch_detected
            and total_score >= 80.0
        )

        summary_parts = [
            f"Document analyzed by PyMuPDF ({word_count} words).",
            f"Contextual Relevance Score: {percentage}/100 ({recommendation}).",
            f"Component breakdown: Semantic {semantic_score}/30, Keywords {keyword_score}/20, References {ref_score}/15, Action {action_score}/15, Consistency {entity_score}/10, Completeness {doc_score}/10.",
        ]
        if amount_mismatch_detected:
            summary_parts.append("CRITICAL: Financial amount mismatch detected.")

        return {
            "total_score": total_score,
            "percentage": percentage,
            "risk_level": risk_level,
            "recommendation": recommendation,
            "recommendation_code": recommendation_code,
            "score_components": score_components,
            "checklist": checklist,
            "entity_matches": entity_matches,
            "warnings": warnings,
            "matched_keywords": all_matched_keywords[:15],
            "missing_elements": missing_elements,
            "all_elements_present": all_elements_present,
            "is_scanned_pdf": is_scanned,
            "requires_ocr": requires_ocr,
            "word_count": word_count,
            "page_count": 1,
            "summary": " ".join(summary_parts),
            "authenticity_disclaimer": (
                "Verification Intelligence Notice: Document text analysis provides decision support. "
                "It does not legally certify financial transaction execution, document authenticity, "
                "or banking settlement. Official AICTE officer review is mandatory before complaint closure."
            ),
        }
