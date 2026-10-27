"""FastAPI routes for data ingestion endpoints."""
import json
from typing import Optional

from fastapi import (
    APIRouter,
    Depends,
    File,
    Form,
    Header,
    Request,
    UploadFile,
    status,
)
from pydantic import ValidationError

from app.core.config import Settings, get_settings
from app.core.errors import (
    EmptyPayloadError,
    InvalidProviderError,
    MalformedPayloadError,
    PayloadTooLargeError,
    UnsupportedMediaTypeError,
)
from app.schemas.ingestion import (
    IngestionResponse,
    JsonIngestionRequest,
)
from app.services.ingestion_service import IngestionService

router = APIRouter(prefix="/ingestion", tags=["Ingestion"])


@router.post(
    "/csv",
    response_model=IngestionResponse,
    status_code=status.HTTP_200_OK,
    summary="Ingest CSV Healthcare Records",
    description="Accepts a CSV file via multipart/form-data, parses clinical records, and returns standardized internal representation.",
)
async def ingest_csv(
    file: UploadFile = File(..., description="CSV file containing tabular clinical records"),
    x_provider_id: Optional[str] = Header(
        None,
        alias="X-Provider-ID",
        description="Source healthcare provider identifier (e.g. HOSPITAL_A)",
    ),
    provider_id: Optional[str] = Form(
        None,
        description="Alternative form parameter for provider ID",
    ),
    settings: Settings = Depends(get_settings),
) -> IngestionResponse:
    """Ingest and validate clinical data from an uploaded CSV file."""
    # 1. Determine and validate provider ID (rejecting conflicts between header and form)
    header_provider = x_provider_id.strip() if x_provider_id else None
    form_provider = provider_id.strip() if provider_id else None

    if header_provider and form_provider:
        if header_provider != form_provider:
            raise InvalidProviderError(
                message=f"Conflicting provider IDs supplied: header '{header_provider}' does not match form '{form_provider}'."
            )
        chosen_provider = header_provider
    elif header_provider:
        chosen_provider = header_provider
    elif form_provider:
        chosen_provider = form_provider
    else:
        chosen_provider = None

    valid_provider = IngestionService.validate_provider(chosen_provider, settings)

    # 2. Basic content type / filename validation
    filename = file.filename or ""
    if not filename.lower().endswith(".csv"):
        raise UnsupportedMediaTypeError(
            f"Unsupported file format '{filename}'. Only .csv files are supported."
        )

    # 3. Stream upload safely without reading unbounded content into memory.
    # Note on Framework Storage Behavior: Starlette's UploadFile uses SpooledTemporaryFile(max_size=1MB).
    # Files <= 1MB remain strictly in-memory (BytesIO). Files approaching or exceeding the threshold
    # may be temporarily spooled by the framework to the OS temp directory.
    # Explicitly closing the file in a finally block guarantees immediate purge of any spooled OS descriptor.
    content = bytearray()
    chunk_size = 64 * 1024  # 64 KB chunks
    total_bytes = 0

    try:
        while True:
            chunk = await file.read(chunk_size)
            if not chunk:
                break
            total_bytes += len(chunk)
            if total_bytes > settings.MAX_UPLOAD_SIZE_BYTES:
                raise PayloadTooLargeError(settings.MAX_UPLOAD_SIZE_BYTES)
            content.extend(chunk)
    finally:
        await file.close()

    # 4. Parse CSV records
    records = IngestionService.parse_csv(
        content=bytes(content),
        filename=filename,
        settings=settings,
    )

    # 5. Build and return standardized ingestion response
    return IngestionService.create_ingestion_response(
        provider_id=valid_provider,
        source_format="csv",
        records=records,
    )


@router.post(
    "/json",
    response_model=IngestionResponse,
    status_code=status.HTTP_200_OK,
    summary="Ingest JSON Healthcare Records",
    description="Accepts a structured JSON payload containing single or multiple clinical records and returns standardized internal representation.",
)
async def ingest_json(
    request: Request,
    x_provider_id: Optional[str] = Header(
        None,
        alias="X-Provider-ID",
        description="Source healthcare provider identifier (e.g. HOSPITAL_B)",
    ),
    settings: Settings = Depends(get_settings),
) -> IngestionResponse:
    """Ingest and validate clinical data from a structured JSON payload."""
    # 1. Validate Content-Type
    content_type = request.headers.get("content-type", "").lower()
    if "application/json" not in content_type:
        raise UnsupportedMediaTypeError("Content-Type must be 'application/json'.")

    # 2. Check Content-Length if present for early rejection
    content_length = request.headers.get("content-length")
    if content_length and content_length.isdigit():
        if int(content_length) > settings.MAX_UPLOAD_SIZE_BYTES:
            raise PayloadTooLargeError(settings.MAX_UPLOAD_SIZE_BYTES)

    # 3. Stream body incrementally before unbounded buffering.
    # Checks accumulated byte count chunk-by-chunk to prevent memory exhaustion attacks
    # via chunked transfer encoding or fraudulent Content-Length headers.
    content = bytearray()
    total_bytes = 0

    async for chunk in request.stream():
        total_bytes += len(chunk)
        if total_bytes > settings.MAX_UPLOAD_SIZE_BYTES:
            raise PayloadTooLargeError(settings.MAX_UPLOAD_SIZE_BYTES)
        content.extend(chunk)

    if not content:
        raise EmptyPayloadError("The JSON request body is empty.")

    # 4. Parse JSON bytes
    try:
        raw_json = json.loads(content.decode("utf-8"))
    except UnicodeDecodeError:
        raise MalformedPayloadError("Invalid text encoding: JSON payload must be UTF-8 encoded text.")
    except (json.JSONDecodeError, ValueError) as e:
        raise MalformedPayloadError(f"Malformed JSON syntax: {e.msg if hasattr(e, 'msg') else 'Unable to parse JSON'}.")

    if not isinstance(raw_json, dict):
        raise MalformedPayloadError("JSON payload must be a JSON object.")

    # 5. Validate against Pydantic schema
    try:
        parsed_request = JsonIngestionRequest.model_validate(raw_json)
    except ValidationError as e:
        # Extract a clean, safe error message without leaking sensitive data
        errors = e.errors()
        msg = errors[0].get("msg", "Invalid JSON payload structure.") if errors else "Invalid JSON payload structure."
        raise MalformedPayloadError(f"Schema validation error: {msg}")

    # 6. Resolve and validate provider ID
    # Security Rule: If both header and body supply provider IDs, reject conflicting values.
    header_provider = x_provider_id.strip() if x_provider_id else None
    body_provider = parsed_request.source_provider_id.strip() if parsed_request.source_provider_id else None

    if header_provider and body_provider:
        if header_provider != body_provider:
            raise InvalidProviderError(
                message=f"Conflicting provider IDs supplied: header '{header_provider}' does not match body '{body_provider}'."
            )
        chosen_provider = header_provider
    elif header_provider:
        chosen_provider = header_provider
    elif body_provider:
        chosen_provider = body_provider
    else:
        chosen_provider = None

    valid_provider = IngestionService.validate_provider(chosen_provider, settings)

    # 7. Extract records
    records = IngestionService.parse_json(parsed_request, settings)

    # 8. Build and return standardized response
    return IngestionService.create_ingestion_response(
        provider_id=valid_provider,
        source_format="json",
        records=records,
    )
