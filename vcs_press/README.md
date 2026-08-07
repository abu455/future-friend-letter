# VCS-Press Calibration-Free Vision Servo System

VCS-Press is an embeddable Python reference implementation for soft-material press cutting machines. It targets leather, PU, PVC, EVA, foam, fabric, composites, shoe materials, luggage, and automotive soft trim where feeding drift, stretch, shrinkage, glare, and curled edges make manual alignment unstable.

## Why calibration-free

The system does not depend on a skilled operator doing a manual nine-point camera calibration. On boot or after tool change, the PLC owns the machine motion and punches 3-5 reference holes in a safe scrap area. Vision detects the hole centers, pairs them with known machine coordinates, solves an image-to-machine transform, and rejects production when reprojection error is out of tolerance.

## Architecture

Industrial camera and light control feed calibration, CAD parsing, preprocessing, deep or classical feature matching, geometric registration, deformation compensation, servo recommendation, safety checks, PLC communication, post-inspection, online bias learning, storage, and FastAPI/HMI interfaces. The vision system never commands a punch stroke; it only writes `allow_punch`, compensation offsets, and alarm data for the PLC to decide.

## Modules

- `camera/`: simulated, OpenCV USB, and reserved industrial SDK camera interfaces.
- `illumination/`: ring/coaxial/bar/polarized light abstraction and simulated controller.
- `plc/`: simulated PLC plus Modbus, OPC UA, and Siemens S7 stubs.
- `calibration/`: hole detection and Similarity/Affine/Homography transform solving.
- `cad/`: DXF parsing, CAD rendering, and normalized job data.
- `vision_matching/`: ORB, SIFT, MockDeep, optional SuperPoint+LightGlue, OmniGlue/RoMa extension points, RANSAC outputs.
- `registration/`: global `dx/dy/theta/scale/shear` computation.
- `deformation/`: TPS-based residual local deformation field and per-region offsets.
- `servo/` and `safety/`: compensation limiting and safety interlock decisions.
- `inspection/` and `online_learning/`: post-punch quality report and bias update.
- `projector/`: simulated projector device abstraction, status, canvas, factory, and service orchestration.
- `projection_mapping/`: camera-projector and machine-projector calibration, CAD-to-projector mapping, homography warp, mesh warp, feedback loop, and projection quality checks.
- `projection_rendering/` and `projection_inspection/`: CAD projection pattern rendering, alignment markers, debug overlays, projected marker detection, and projection error estimation.
- `state_machine/`: industrial production state controller with logged transitions.
- `api/`: FastAPI, WebSocket, and a minimal browser HMI.

## Install

Use Python 3.10+.

`pip install -r requirements.txt`

GPU is optional. The project runs in simulated mode without model weights.

Install the real LightGlue backend only on machines that need it:

`pip install -r requirements-lightglue.txt`

## Start

`python main.py`

Open `http://127.0.0.1:8000/` for the minimal HMI.

## Industrial safety principles

The vision system is advisory only. It may output `allow_punch`, `x_offset_mm`, `y_offset_mm`, `theta_offset_deg`, `feed_offset_mm`, confidence, and alarm information. It must never expose or call an API that directly commands the punch head to descend. Final punch motion belongs to the PLC or Safety PLC after all machine safety conditions are satisfied.

Fail-closed rules:

- Startup default is `allow_punch=false`.
- Any exception, timeout, lost communication, camera fault, light fault, model failure, low confidence, high residual, excessive compensation, excessive deformation, missing calibration, missing job, safety door fault, light curtain fault, low air pressure, PLC fault, or emergency stop forces `allow_punch=false`.
- Projector OK is never sufficient for punching. Projection safety and machine safety must both pass; projector disconnect, projection misalignment, job/pattern mismatch, high reflection, and projector update timeout force `allow_punch=false`.
- `ServoService.send_to_plc()` writes `allow_punch=false` before sending a new payload, so a previous true value cannot survive a rejected cycle.
- `ALARM` recovery requires explicit `POST /system/reset_alarm`.
- `EMERGENCY_STOP` recovery requires `POST /system/ack_emergency_stop` with PLC and operator acknowledgement flags.

Alarm events include `alarm_code`, `alarm_message`, `severity`, `timestamp`, and `recommended_action`. Severity values are `INFO`, `WARNING`, `CRITICAL`, and `EMERGENCY`.

## API quick flow

- `GET /health`
- `POST /system/init`
- `POST /system/reset_alarm`
- `POST /system/ack_emergency_stop`
- `POST /calibration/start`
- `POST /job/load`
- `POST /vision/register`
- `GET /projector/status`
- `POST /projector/connect`
- `POST /projector/disconnect`
- `POST /projector/on`
- `POST /projector/off`
- `POST /projector/clear`
- `POST /projector/show_pattern`
- `POST /projection/calibration/start`
- `GET /projection/calibration/status`
- `POST /projection/render`
- `POST /projection/preview`
- `POST /projection/update_warp`
- `POST /projection/feedback_loop`
- `GET /projection/report/latest`
- `POST /projection/mode`
- `POST /projection/safety/check`
- `POST /servo/compute`
- `POST /servo/send_to_plc`
- `POST /inspection/run`
- `GET /system/status`
- `WebSocket /ws/status`

Example:

`curl -X POST http://127.0.0.1:8000/calibration/start`

Use LightGlue through the API after installing the optional backend:

`curl -X POST http://127.0.0.1:8000/vision/register -H "Content-Type: application/json" -d '{"matcher":"lightglue"}'`

## Simulation flow

The simulated camera generates four reference holes for self-calibration and a shifted material image for registration. MockDeepMatcher emits dense correspondences; registration computes the global offset; TPS estimates residual local deformation; ServoService checks safety thresholds and writes only recommendations to SimulatedPLC.

## Projector-guided projection alignment

The projector module adds a simulated projector-guided vision cutting loop. CAD/job geometry is rendered as a projector pattern, mapped from machine mm to projector pixels, shown by `SimulatedProjector`, corrected with homography and mesh warp from registration/deformation results, and inspected for projection error before servo compensation is allowed.

Run the no-hardware projection loop:

`python scripts/run_projection_simulation.py`

The script writes:

- `data/projection/calibration/camera_projector_calibration.json`
- `data/projection/calibration/machine_projector_calibration.json`
- `data/projection/patterns/*.png`
- `data/projection/previews/*.png`
- `data/projection/debug_overlays/projection_debug_overlay.png`
- `data/projection/reports/projection_report.json`

Projection capture modes are `visible`, `clean`, and `strobe`. `clean` mode is the default because projected lines can interfere with material edge, texture, and hole recognition. The projector is guidance output only; it cannot replace PLC safety logic or command a punch.

## CI and pre-commit

Install development hooks:

`pip install -r requirements.txt`

`pre-commit install`

Run the same checks as CI:

`python scripts/check_unicode_safety.py`

`ruff check .`

`black --check .`

`isort --check-only .`

`python -m pytest -q`

The Unicode safety check rejects hidden bidirectional controls and zero-width characters in `.py`, `.yaml`, `.md`, and `.txt` files. This prevents misleading source display, unsafe copy/paste artifacts, and Trojan-source style code review bypasses.

## Real camera integration

Implement a subclass of `CameraBase` for Basler, Hikvision, Daheng, or MindVision SDKs. Map exposure, gain, trigger mode, hardware trigger arm, timestamp, frame timeout, and exception handling into the common `Frame` result. Keep `SimulatedCamera` enabled for offline commissioning and CI tests.

## Siemens S7 PLC integration

Install and validate `snap7`, then replace `SiemensS7PLCStub` methods with DB block reads/writes for status, axis positions, safety signals, compensation, allow/deny bit, alarm code, and PLC ACK. Do not add any direct punch command in the vision layer.

## LightGlue, OmniGlue, and RoMa integration

`SuperPointLightGlueMatcher` now loads `SuperPoint` and `LightGlue` from the upstream `lightglue` package when installed. Select it with matcher name `lightglue` or `superpoint_lightglue`; it automatically chooses CUDA when available, runs RANSAC, returns homography/affine/residual/confidence, and falls back to ORB if the backend is missing or inference fails. Replace `OmniGlueMatcher` and `RoMaMatcher` with site-approved model loaders while preserving the `FeatureMatcher` interface and fallback behavior.

## Safety notes

Punching is forbidden when emergency stop, safety door, PLC fault, low air pressure, camera or light fault, missing calibration, CAD not loaded, low confidence, low inlier ratio, high residual, excessive compensation, excessive deformation, or repeated NG occurs. Final punch motion must stay under PLC safety control.

## Simulated safety test flow

Use pytest to validate fail-closed behavior without hardware:

- `tests/test_industrial_safety.py` covers emergency stop, safety door, light curtain, air pressure, PLC disconnect, heartbeat loss, camera/light faults, missing calibration/job, low matching quality, compensation limits, deformation limits, and consecutive NG.
- `tests/test_timeout_safety.py` covers camera acquisition, vision cycle, PLC ACK, light ready, and post-inspection timeouts.
- `tests/test_state_machine_safety.py` verifies `ALARM` needs explicit reset and `EMERGENCY_STOP` needs PLC plus operator acknowledgement.

## Tests

`pytest`

The tests cover simulated camera/PLC flow, hole detection, transform solving, image registration, servo output, low-confidence rejection, safety checks, and state-machine transitions.

## Engineering roadmap

Add real SDK adapters, machine-specific PLC maps, persistent SQLAlchemy records, production HMI, authenticated operator roles, model management, TensorRT acceleration, multi-camera calibration, richer defect detection, and site acceptance test scripts for each machine model.
