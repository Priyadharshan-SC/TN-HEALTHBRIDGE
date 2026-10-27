"""Ingestion service handling safe parsing, validation, and metadata generation."""
import csv
import io
import logging
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from app.core.config import Settings
from app.core.errors import (
    EmptyPayloadError,
    InvalidProviderError,
    MalformedPayloadError,
    PayloadTooLargeError,
    RecordLimitExceededError,
    UnsupportedMediaTypeError,
)
from app.schemas.ingestion import (
    IngestionRecord,
    IngestionResponse,
    JsonIngestionRequest,
)

logger = logging.getLogger("tn_healthbridge.ingestion")


class IngestionService:
    """Modular service handling parsing, validation, and standardizing of ingestion batches."""

    @staticmethod
    def validate_provider(provider_id: Optional[str], settings: Settings) -> str:
        """Validate that the provider ID is present and belongs to the configured allowlist."""
        if not provider_id or not provider_id.strip():
            raise InvalidProviderError(provider_id)
        
        normalized_id = provider_id.strip()
        if normalized_id not in settings.ALLOWED_PROVIDERS:
            raise InvalidProviderError(normalized_id)
            
        return normalized_id

    @staticmethod
    def parse_csv(
        content: bytes,
        filename: Optional[str],
        settings: Settings,
    ) -> List[Dict[str, str]]:
        """Safely parse CSV bytes into a list of field dictionaries.
        
        Preserves original field names and string values without type conversion.
        """
        # 1. Enforce filename extension if provided
        if filename:
            clean_name = filename.strip().lower()
            if not clean_name.endswith(".csv"):
                raise UnsupportedMediaTypeError("Invalid file extension. Only .csv files are supported.")

        # 2. Check for empty payload
        if not content or len(content) == 0:
            raise EmptyPayloadError("The uploaded CSV file is empty.")

        # 3. Check upload size limit
        if len(content) > settings.MAX_UPLOAD_SIZE_BYTES:
            raise PayloadTooLargeError(settings.MAX_UPLOAD_SIZE_BYTES)

        # 4. Decode text safely
        try:
            # utf-8-sig handles standard UTF-8 and UTF-8 with BOM
            text = content.decode("utf-8-sig")
        except UnicodeDecodeError:
            raise MalformedPayloadError("Invalid text encoding: CSV file must be UTF-8 encoded text.")

        if not text.strip():
            raise EmptyPayloadError("The CSV file contains only whitespace.")

        # 5. Parse rows
        stream = io.StringIO(text)
        try:
            # Enable strict=True to reject malformed quoting and CSV syntax errors
            reader = csv.reader(stream, strict=True)
            try:
                headers = next(reader)
            except StopIteration:
                raise EmptyPayloadError("The CSV file contains no content.")

            # Validate headers
            if not headers or all(not h.strip() for h in headers):
                raise MalformedPayloadError("CSV file is missing a valid header row.")

            clean_headers = [h.strip() for h in headers]
            if any(not h for h in clean_headers):
                raise MalformedPayloadError("CSV header row contains empty column names.")

            # Comparison Rule: CSV headers are stripped of whitespace and compared case-insensitively.
            # Duplicate column names are rejected to prevent ambiguity and loss of clinical field data.
            seen_headers = set()
            duplicate_headers = []
            for h in clean_headers:
                h_norm = h.lower()
                if h_norm in seen_headers:
                    duplicate_headers.append(h)
                seen_headers.add(h_norm)

            if duplicate_headers:
                raise MalformedPayloadError(
                    f"Duplicate CSV header detected: '{duplicate_headers[0]}'. "
                    "All column headers must be unique (compared case-insensitively after trimming whitespace)."
                )

            records: List[Dict[str, str]] = []
            line_num = 1  # Header is line 1

            for row in reader:
                line_num += 1
                # Skip blank lines at the end or within file
                if not row or (len(row) == 1 and not row[0].strip()):
                    continue

                if len(row) != len(clean_headers):
                    raise MalformedPayloadError(
                        f"Malformed CSV row at line {line_num}: expected {len(clean_headers)} columns, got {len(row)}."
                    )

                # Preserve all values as original strings
                row_dict = {clean_headers[i]: row[i] for i in range(len(clean_headers))}
                records.append(row_dict)

        except csv.Error as e:
            raise MalformedPayloadError(f"CSV format parsing error: {str(e)}")

        # 6. Validate record count
        if not records:
            raise EmptyPayloadError("CSV file contains headers but no data records.")

        if len(records) > settings.MAX_RECORD_COUNT:
            raise RecordLimitExceededError(len(records), settings.MAX_RECORD_COUNT)

        return records

    @staticmethod
    def parse_json(
        payload: JsonIngestionRequest,
        settings: Settings,
    ) -> List[Dict[str, Any]]:
        """Validate and extract clinical records from a structured JSON ingestion request.
        
        Preserves original field names and data types.
        """
        records: List[Dict[str, Any]] = []

        if payload.records is not None:
            records = payload.records
        elif payload.record is not None:
            records = [payload.record]

        if not records:
            raise EmptyPayloadError("JSON payload contains no clinical records.")

        if len(records) > settings.MAX_RECORD_COUNT:
            raise RecordLimitExceededError(len(records), settings.MAX_RECORD_COUNT)

        return records

    @staticmethod
    def create_ingestion_response(
        provider_id: str,
        source_format: str,
        records: List[Dict[str, Any]],
    ) -> IngestionResponse:
        """Construct the standardized internal ingestion response with server metadata.
        
        Logs only operational metadata, strictly preserving clinical confidentiality.
        """
        ingestion_id = str(uuid.uuid4())
        ingested_at = datetime.now(timezone.utc).isoformat()
        
        formatted_records = [
            IngestionRecord(source_fields=record)
            for record in records
        ]

        response = IngestionResponse(
            ingestion_id=ingestion_id,
            source_provider_id=provider_id,
            source_format=source_format,
            ingested_at=ingested_at,
            record_count=len(formatted_records),
            status="accepted",
            records=formatted_records,
        )

        # Log ONLY operational metadata — never log patient clinical data
        logger.info(
            "Ingestion accepted: ingestion_id=%s, provider=%s, format=%s, records=%d",
            ingestion_id,
            provider_id,
            source_format,
            len(formatted_records),
        )

        return response
