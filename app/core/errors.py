"""Custom exceptions and error response representations for M1 Ingestion."""
from typing import Optional


class IngestionException(Exception):
    """Base exception for all ingestion layer errors."""

    def __init__(
        self,
        message: str,
        error_code: str = "INGESTION_ERROR",
        status_code: int = 400,
        details: Optional[str] = None,
    ):
        super().__init__(message)
        self.message = message
        self.error_code = error_code
        self.status_code = status_code
        self.details = details


class InvalidProviderError(IngestionException):
    """Raised when an unauthenticated, unknown, or conflicting provider ID is supplied."""

    def __init__(self, provider_id: Optional[str] = None, message: Optional[str] = None):
        if message is None:
            message = (
                f"Provider ID '{provider_id}' is not authorized. Must be one of the configured providers."
                if provider_id
                else "Provider ID is required. Supply via 'X-Provider-ID' header or 'source_provider_id' field."
            )
        super().__init__(
            message=message,
            error_code="INVALID_PROVIDER_ID",
            status_code=400,
        )


class PayloadTooLargeError(IngestionException):
    """Raised when the upload size exceeds configured limits."""

    def __init__(self, max_bytes: int):
        super().__init__(
            message=f"Payload size exceeds maximum allowed limit of {max_bytes} bytes.",
            error_code="PAYLOAD_TOO_LARGE",
            status_code=413,
        )


class UnsupportedMediaTypeError(IngestionException):
    """Raised when an unsupported file type or content-type is uploaded."""

    def __init__(self, message: str = "Unsupported media type or file format."):
        super().__init__(
            message=message,
            error_code="UNSUPPORTED_MEDIA_TYPE",
            status_code=415,
        )


class MalformedPayloadError(IngestionException):
    """Raised when CSV or JSON structure is corrupted, unparseable, or inconsistent."""

    def __init__(self, message: str):
        super().__init__(
            message=message,
            error_code="MALFORMED_PAYLOAD",
            status_code=400,
        )


class EmptyPayloadError(IngestionException):
    """Raised when an upload contains no content or no clinical records."""

    def __init__(self, message: str = "Payload contains no data records."):
        super().__init__(
            message=message,
            error_code="EMPTY_PAYLOAD",
            status_code=400,
        )


class RecordLimitExceededError(IngestionException):
    """Raised when the number of records exceeds the configured maximum limit."""

    def __init__(self, record_count: int, max_records: int):
        super().__init__(
            message=f"Record count ({record_count}) exceeds maximum allowed limit of {max_records} records.",
            error_code="RECORD_LIMIT_EXCEEDED",
            status_code=400,
        )


class NormalizationException(Exception):
    """Base exception for all normalization layer errors."""

    def __init__(
        self,
        message: str,
        error_code: str = "NORMALIZATION_ERROR",
        status_code: int = 400,
        details: Optional[str] = None,
    ):
        super().__init__(message)
        self.message = message
        self.error_code = error_code
        self.status_code = status_code
        self.details = details


class NormalizationConfigurationError(NormalizationException):
    """Raised when no mapping configuration exists or configuration is invalid."""

    def __init__(self, message: str):
        super().__init__(
            message=message,
            error_code="NORMALIZATION_CONFIG_ERROR",
            status_code=400,
        )


class InvalidEnvelopeError(NormalizationException):
    """Raised when an incoming M1 ingestion envelope is malformed or invalid."""

    def __init__(self, message: str):
        super().__init__(
            message=message,
            error_code="INVALID_ENVELOPE",
            status_code=400,
        )


class NormalizationRecordLimitExceededError(NormalizationException):
    """Raised when the number of records in an M2 normalization batch exceeds the configured limit."""

    def __init__(self, record_count: int, max_records: int):
        super().__init__(
            message=f"Batch record count ({record_count}) exceeds maximum allowed limit of {max_records} records.",
            error_code="RECORD_LIMIT_EXCEEDED",
            status_code=400,
        )


class TerminologyException(Exception):
    """Base exception for all terminology mapping layer errors."""

    def __init__(
        self,
        message: str,
        error_code: str = "TERMINOLOGY_ERROR",
        status_code: int = 400,
        details: Optional[str] = None,
    ):
        super().__init__(message)
        self.message = message
        self.error_code = error_code
        self.status_code = status_code
        self.details = details


class TerminologyConfigurationError(TerminologyException):
    """Raised when terminology registry configuration is invalid, corrupted, or contains duplicate IDs."""

    def __init__(self, message: str):
        super().__init__(
            message=message,
            error_code="TERMINOLOGY_CONFIG_ERROR",
            status_code=400,
        )


class InvalidTerminologyRequestError(TerminologyException):
    """Raised when an incoming terminology mapping request or envelope is malformed or invalid."""

    def __init__(self, message: str):
        super().__init__(
            message=message,
            error_code="INVALID_TERMINOLOGY_REQUEST",
            status_code=400,
        )


class EmptyTerminologyBatchError(TerminologyException):
    """Raised when an incoming terminology request contains no records."""

    def __init__(self, message: str = "Terminology batch contains no records."):
        super().__init__(
            message=message,
            error_code="EMPTY_PAYLOAD",
            status_code=400,
        )


class TerminologyRecordLimitExceededError(TerminologyException):
    """Raised when the number of records in a terminology batch exceeds configured limits."""

    def __init__(self, record_count: int, max_records: int):
        super().__init__(
            message=f"Batch record count ({record_count}) exceeds maximum allowed limit of {max_records} records.",
            error_code="RECORD_LIMIT_EXCEEDED",
            status_code=400,
        )


class IdentityException(Exception):
    """Base exception for all patient identity safety layer errors."""

    def __init__(
        self,
        message: str,
        error_code: str = "IDENTITY_ERROR",
        status_code: int = 400,
        details: Optional[str] = None,
    ):
        super().__init__(message)
        self.message = message
        self.error_code = error_code
        self.status_code = status_code
        self.details = details


class IdentityConfigurationError(IdentityException, ValueError):
    """Raised when identity configuration or rules are invalid."""

    def __init__(self, message: str):
        super().__init__(
            message=message,
            error_code="IDENTITY_CONFIG_ERROR",
            status_code=400,
        )


class InvalidIdentityRequestError(IdentityException):
    """Raised when an incoming identity assessment request is malformed or invalid."""

    def __init__(self, message: str):
        super().__init__(
            message=message,
            error_code="INVALID_IDENTITY_REQUEST",
            status_code=400,
        )


class EmptyIdentityBatchError(IdentityException):
    """Raised when an incoming identity assessment batch contains no comparisons."""

    def __init__(self, message: str = "Identity assessment batch contains no comparisons."):
        super().__init__(
            message=message,
            error_code="EMPTY_PAYLOAD",
            status_code=400,
        )


class IdentityRecordLimitExceededError(IdentityException):
    """Raised when the number of comparisons in an identity batch exceeds configured limits."""

    def __init__(self, comparison_count: int, max_comparisons: int):
        super().__init__(
            message=f"Batch comparison count ({comparison_count}) exceeds maximum allowed limit of {max_comparisons} comparisons.",
            error_code="RECORD_LIMIT_EXCEEDED",
            status_code=400,
        )


