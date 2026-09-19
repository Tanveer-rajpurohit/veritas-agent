import argparse
import json

from app.services.legal_sources import company_master_adapter


def main() -> None:
    parser = argparse.ArgumentParser(description="Smoke-test configured public fact sources")
    parser.add_argument("--cin", required=True, help="Exact MCA Corporate Identification Number")
    args = parser.parse_args()

    result = company_master_adapter.lookup_by_cin(args.cin)
    print(
        json.dumps(
            {
                "mca_company_master": {
                    "status": "available",
                    "provider": result["provider"],
                    "cin": result["cin"],
                    "updated_date": result.get("updated_date"),
                    "record": result["record"],
                    "limitations": result["limitations"],
                },
                "ibbi_public_announcement": {
                    "status": "unavailable",
                    "message": "The IBBI adapter is not connected yet.",
                },
            },
            indent=2,
            ensure_ascii=False,
        )
    )


if __name__ == "__main__":
    main()
