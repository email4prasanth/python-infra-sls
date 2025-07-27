# List all buckets and filter for cdk-* prefix
$buckets = aws s3api list-buckets --query "Buckets[?starts_with(Name, 'cdk-')].Name" --output text --profile tut --region us-east-1

foreach ($bucket in $buckets) {
    Write-Host "Processing bucket: $bucket"
    
    # 1. Suspend versioning first
    Write-Host "  Suspending versioning..."
    aws s3api put-bucket-versioning --bucket $bucket --versioning-configuration Status=Suspended --profile tut --region us-east-1
    
    # 2. Remove all versions and delete markers
    Write-Host "  Deleting all objects and versions..."
    $versions = aws s3api list-object-versions --bucket $bucket --output json --profile tut --region us-east-1 | ConvertFrom-Json
    
    # Delete regular objects
    if ($versions.Versions) {
        $versions.Versions | ForEach-Object {
            $delete = @{
                Objects = @(@{ Key = $_.Key; VersionId = $_.VersionId })
                Quiet   = $true
            } | ConvertTo-Json
            aws s3api delete-objects --bucket $bucket --delete $delete --profile tut --region us-east-1
        }
    }
    
    # Delete delete markers
    if ($versions.DeleteMarkers) {
        $versions.DeleteMarkers | ForEach-Object {
            $delete = @{
                Objects = @(@{ Key = $_.Key; VersionId = $_.VersionId })
                Quiet   = $true
            } | ConvertTo-Json
            aws s3api delete-objects --bucket $bucket --delete $delete --profile tut --region us-east-1
        }
    }
    
    # 3. Delete the bucket
    Write-Host "  Deleting bucket..."
    aws s3api delete-bucket --bucket $bucket --profile tut --region us-east-1
    
    Write-Host "  Successfully deleted bucket: $bucket`n"
}

Write-Host "All cdk-* buckets have been processed."