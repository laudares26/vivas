#!/usr/bin/env bash
# On-demand: (re)deploy MedGemma 1.5 to the FIXED Vertex endpoint, so the GPU is
# only online while a batch runs. Endpoint + model resources are pre-created, so
# the endpoint id / DNS (and thus the Fly secrets) stay stable across cycles.
#
# Cycle:  medgemma-deploy.sh  →  node scripts/runMedgemmaBatch.js  →  medgemma-undeploy.sh
#
# Requires gcloud authenticated with a SA that can deploy models (aiplatform.admin
# or owner). The lightweight runtime key (aiplatform.user) is enough to CALL the
# endpoint but NOT to deploy/undeploy.
set -euo pipefail

REGION="${VERTEX_LOCATION:-us-central1}"
ENDPOINT_ID="${VERTEX_MEDGEMMA_ENDPOINT_ID:?set VERTEX_MEDGEMMA_ENDPOINT_ID}"
MODEL_ID="${VERTEX_MEDGEMMA_MODEL_RESOURCE:?set VERTEX_MEDGEMMA_MODEL_RESOURCE (gcloud ai models list)}"
MACHINE_TYPE="${VERTEX_MEDGEMMA_MACHINE:-g2-standard-24}"
ACCEL_TYPE="${VERTEX_MEDGEMMA_ACCEL:-nvidia-l4}"
ACCEL_COUNT="${VERTEX_MEDGEMMA_ACCEL_COUNT:-2}"

echo "Deploying model $MODEL_ID to endpoint $ENDPOINT_ID ($MACHINE_TYPE, ${ACCEL_COUNT}x $ACCEL_TYPE)…"
gcloud ai endpoints deploy-model "$ENDPOINT_ID" \
  --region="$REGION" \
  --model="$MODEL_ID" \
  --display-name="vivas-medgemma" \
  --machine-type="$MACHINE_TYPE" \
  --accelerator="type=${ACCEL_TYPE},count=${ACCEL_COUNT}" \
  --min-replica-count=1 --max-replica-count=1

echo "Waiting for an available replica…"
until [ "$(gcloud ai endpoints describe "$ENDPOINT_ID" --region="$REGION" \
        --format='value(deployedModels[0].status.availableReplicaCount)')" = "1" ]; do
  sleep 30; echo -n "."
done
echo " ready."
