from __future__ import annotations

import io
from typing import Any

from google.oauth2.service_account import Credentials
from googleapiclient.discovery import build
from googleapiclient.http import MediaIoBaseUpload

from backend.sheets import WEEK_SHEET, _with_backoff, read_records

# Sheets + Drive
SCOPES = [
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/drive.file",
]


def extract_text_from_upload(uploaded_file) -> str:
    """PDF / Word 업로드에서 텍스트 추출."""
    name = (uploaded_file.name or "").lower()
    data = uploaded_file.read()

    if name.endswith(".docx"):
        from docx import Document

        doc = Document(io.BytesIO(data))
        parts = [p.text.strip() for p in doc.paragraphs if p.text.strip()]
        return "\n".join(parts)

    if name.endswith(".pdf"):
        from pypdf import PdfReader

        reader = PdfReader(io.BytesIO(data))
        parts = []
        for page in reader.pages:
            t = page.extract_text() or ""
            if t.strip():
                parts.append(t.strip())
        return "\n\n".join(parts)

    if name.endswith(".txt"):
        return data.decode("utf-8", errors="ignore")

    raise ValueError("지원 형식: .pdf, .docx, .txt")


def upsert_week_setting(
    sheets,
    week: int,
    learning_goal: str,
    activity_prompt: str,
    score: int = 10,
    published: str = "Y",
    material_url: str = "",
) -> None:
    """주차설정 시트에 해당 주차를 추가/수정."""
    if not (1 <= int(week) <= 17):
        raise ValueError("주차는 1~17만 가능합니다.")

    ws = sheets[WEEK_SHEET]
    values = _with_backoff(lambda: ws.get_all_values())
    headers = values[0] if values else ["주차", "학습목표", "활동지질문", "배점", "공개여부"]

    # 자료링크 열이 없으면 추가 (기존 시트 호환)
    if "자료링크" not in headers:
        headers = list(headers) + ["자료링크"]
        _with_backoff(lambda: ws.update("A1", [headers]))

    week_col = headers.index("주차")
    row_no = None
    for i, row in enumerate(values[1:], start=2):
        if week_col < len(row) and str(row[week_col]).strip() == str(week):
            row_no = i
            break

    record = {h: "" for h in headers}
    record["주차"] = str(week)
    record["학습목표"] = learning_goal
    record["활동지질문"] = activity_prompt
    record["배점"] = str(int(score))
    record["공개여부"] = published or "Y"
    if "자료링크" in record:
        record["자료링크"] = material_url

    row_values = [record.get(h, "") for h in headers]

    if row_no:
        end_col = chr(64 + len(headers)) if len(headers) <= 26 else "Z"
        _with_backoff(
            lambda: ws.update(
                f"A{row_no}:{end_col}{row_no}",
                [row_values],
                value_input_option="USER_ENTERED",
            )
        )
    else:
        _with_backoff(lambda: ws.append_row(row_values, value_input_option="USER_ENTERED"))


def upload_bytes_to_drive(
    secret_section,
    folder_id: str,
    filename: str,
    data: bytes,
    mime_type: str = "application/octet-stream",
) -> str:
    """파일을 Drive 폴더에 올리고 웹 링크 반환."""
    if not folder_id:
        return ""

    creds = Credentials.from_service_account_info(dict(secret_section), scopes=SCOPES)
    service = build("drive", "v3", credentials=creds, cache_discovery=False)

    meta = {"name": filename, "parents": [folder_id]}
    media = MediaIoBaseUpload(io.BytesIO(data), mimetype=mime_type, resumable=False)
    created = (
        service.files()
        .create(body=meta, media_body=media, fields="id, webViewLink", supportsAllDrives=True)
        .execute()
    )
    return created.get("webViewLink") or f"https://drive.google.com/file/d/{created['id']}/view"


def save_student_text_to_drive(
    secret_section,
    folder_id: str,
    student: dict[str, Any],
    week: int,
    content: str,
) -> str:
    """학생 제출 텍스트를 Drive에 .txt로 백업."""
    if not folder_id or not content.strip():
        return ""
    sid = str(student.get("학번", "unknown"))
    name = str(student.get("이름", ""))
    filename = f"{sid}_{name}_W{week}.txt"
    data = content.encode("utf-8")
    return upload_bytes_to_drive(
        secret_section,
        folder_id,
        filename,
        data,
        mime_type="text/plain",
    )
