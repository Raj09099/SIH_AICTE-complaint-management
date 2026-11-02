"""
Attachment Pydantic schemas for SIH26264 AICTE Complaint Intelligence.
"""

from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict


class AttachmentOut(BaseModel):
    id: int
    complaint_id: int
    file_name: str
    file_type: str
    file_size: int
    storage_path: str
    label: Optional[str] = "Supporting Evidence"
    uploaded_by: Optional[int] = None
    uploaded_at: Optional[datetime] = None
    download_url: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

