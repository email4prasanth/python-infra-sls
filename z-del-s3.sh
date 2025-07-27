#!/bin/bash

set -euo pipefail

# Get all bucket names that start with "cdk-"
buckets=$(aws s3api list-buckets --query "Buckets[?starts_with(Name, 'cdk-')].Name" --output text)

for bucket in $buckets; do
    echo "Processing bucket: $bucket"

    # Suspend versioning
    echo "  Suspending versioning..."
    aws s3api put-bucket-versioning \
        --bucket "$bucket" \
        --versioning-configuration Status=Suspended 

    # Get all object versions
    echo "  Deleting all object versions and delete markers..."
    versions=$(aws s3api list-object-versions --bucket "$bucket")

    # Delete all versions
    echo "$versions" | jq -c '.Versions[]?' | while read -r version; do
        key=$(echo "$version" | jq -r '.Key')
        versionId=$(echo "$version" | jq -r '.VersionId')
        aws s3api delete-object \
            --bucket "$bucket" \
            --key "$key" \
            --version-id "$versionId"
    done

    # Delete all delete markers
    echo "$versions" | jq -c '.DeleteMarkers[]?' | while read -r marker; do
        key=$(echo "$marker" | jq -r '.Key')
        versionId=$(echo "$marker" | jq -r '.VersionId')
        aws s3api delete-object \
            --bucket "$bucket" \
            --key "$key" \
            --version-id "$versionId"
    done

    # Delete the bucket
    echo "  Deleting bucket..."
    aws s3api delete-bucket --bucket "$bucket"

    echo "  Successfully deleted bucket: $bucket"
done

echo "All cdk-* buckets have been processed."
