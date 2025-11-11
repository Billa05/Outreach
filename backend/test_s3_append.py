import os
import json
import time
import uuid
import argparse
import boto3
from botocore.exceptions import ClientError
from dotenv import load_dotenv


def get_s3_client(region: str | None):
    session = boto3.session.Session(region_name=region) if region else boto3.session.Session()
    return session.client("s3")


def read_object_bytes(s3, bucket: str, key: str) -> bytes:
    try:
        obj = s3.get_object(Bucket=bucket, Key=key)
        return obj["Body"].read()
    except ClientError as e:
        if e.response.get("Error", {}).get("Code") in ("NoSuchKey", "NoSuchBucket"):
            return b""
        raise


def append_jsonl(s3, bucket: str, key: str, records: list[dict]) -> None:
    existing = read_object_bytes(s3, bucket, key)
    new_lines = "".join(json.dumps(r, ensure_ascii=False) + "\n" for r in records).encode("utf-8")
    combined = existing + new_lines
    s3.put_object(Bucket=bucket, Key=key, Body=combined, ContentType="application/x-ndjson")


def head_tail_preview(s3, bucket: str, key: str, tail_lines: int = 5) -> None:
    blob = read_object_bytes(s3, bucket, key)
    text = blob.decode("utf-8", errors="replace")
    lines = [ln for ln in text.splitlines() if ln.strip()]
    print(f"Total lines: {len(lines)}")
    print("Last lines:")
    for ln in lines[-tail_lines:]:
        print(ln)


def main():
    parser = argparse.ArgumentParser(description="Append a test record to S3 JSONL and preview tail.")
    parser.add_argument("--bucket", default=None, help="S3 bucket name (overrides env S3_BUCKET_NAME)")
    parser.add_argument("--key", default=None, help="S3 object key (overrides env S3_JSONL_KEY)")
    parser.add_argument("--region", default=None, help="AWS region (overrides env AWS_REGION)")
    parser.add_argument("--times", type=int, default=1, help="How many test lines to append")
    parser.add_argument("--preview", type=int, default=5, help="How many tail lines to print")
    args = parser.parse_args()

    load_dotenv()
    bucket = args.bucket or os.getenv("S3_BUCKET_NAME", "outreachdata")
    key = args.key or os.getenv("S3_JSONL_KEY", "b2b_lead_data_india.jsonl")
    region = args.region or os.getenv("AWS_REGION")

    if not bucket:
        raise SystemExit("Error: S3 bucket is required. Set S3_BUCKET_NAME or pass --bucket")

    s3 = get_s3_client(region)

    # Build sample records that match ml.ipynb schema
    now = int(time.time())
    records = []
    for i in range(args.times):
        records.append({
            "original_user_query": f"Test query {uuid.uuid4()}",
            "org_summary": "This is a dummy summary for testing S3 JSONL append.",
            "contact_info": {
                "email": "test@example.com",
                "phone": "+1-555-000-0000",
                "contact_title": "Testing Bot"
            },
            "user_feedback": ""  # empty by default; can be populated via /feedback in the app
        })

    try:
        append_jsonl(s3, bucket, key, records)
        print(f"Appended {len(records)} line(s) to s3://{bucket}/{key}")
        head_tail_preview(s3, bucket, key, tail_lines=args.preview)
    except ClientError as e:
        print(f"AWS ClientError: {e}")
        raise


if __name__ == "__main__":
    main()


