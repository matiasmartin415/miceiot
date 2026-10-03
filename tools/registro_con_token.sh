wget -O - --method=POST \
  --header="x-admin-token: clavemaestra123" \
  --body-data="id=$1&n=$2&k=$3" \
  http://localhost:8080/device
echo ""
