#!/usr/bin/env bash
# On-demand: undeploy MedGemma from the fixed Vertex endpoint to STOP the GPU
# charge. The endpoint + model resources stay (they cost nothing), ready for the
# next medgemma-deploy.sh. Run this right after the batch finishes.
set -euo pipefail

REGION="${VERTEX_LOCATION:-us-central1}"
ENDPOINT_ID="${VERTEX_MEDGEMMA_ENDPOINT_ID:?set VERTEX_MEDGEMMA_ENDPOINT_ID}"

DEPLOYED_ID="$(gcloud ai endpoints describe "$ENDPOINT_ID" --region="$REGION" \
  --format='value(deployedModels[0].id)')"

if [ -z "$DEPLOYED_ID" ]; then
  echo "No model deployed on $ENDPOINT_ID — nothing to undeploy (GPU already off)."
  exit 0
fi

echo "Undeploying model $DEPLOYED_ID from endpoint $ENDPOINT_ID…"
gcloud ai endpoints undeploy-model "$ENDPOINT_ID" \
  --region="$REGION" --deployed-model-id="$DEPLOYED_ID"
echo "Done — GPU released."
