from app.services.legal_sources.company_master import (
    CompanyMasterAdapter,
    company_master_adapter,
)
from app.services.legal_sources.ecourts_india import (
    ECourtsIndiaAdapter,
    ecourts_adapter,
)
from app.services.legal_sources.indian_kanoon import (
    IndianKanoonAdapter,
    indian_kanoon_adapter,
)
from app.services.legal_sources.materializer import (
    LegalSourceMaterializer,
    legal_materializer,
)
from app.services.legal_sources.templates import (
    TemplateRegistryService,
    template_service,
)

__all__ = [
    "CompanyMasterAdapter",
    "ECourtsIndiaAdapter",
    "IndianKanoonAdapter",
    "LegalSourceMaterializer",
    "TemplateRegistryService",
    "company_master_adapter",
    "ecourts_adapter",
    "indian_kanoon_adapter",
    "legal_materializer",
    "template_service",
]
