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
- `vision_matching/`: ORB, SIFT, MockDeep, LightGlue/OmniGlue/RoMa stubs, RANSAC outputs.
- `registration/`: global `dx/dy/theta/scale/shear` computation.
- `deformation/`: TPS-based residual local deformation field and per-region offsets.
- `servo/` and `safety/`: compensation limiting and safety interlock decisions.
- `inspection/` and `online_learning/`: post-punch quality report and bias update.
- `state_machine/`: industrial production state controller with logged transitions.
- `api/`: FastAPI, WebSocket, and a minimal browser HMI.

## Install

Use Python 3.10+.

`pip install -r requirements.txt`

GPU is optional. The project runs in simulated mode without model weights.

## Start

`python main.py`

Open `http://127.0.0.1:8000/` for the minimal HMI.

## API quick flow

- `GET /health`
- `POST /system/init`
- `POST /calibration/start`
- `POST /job/load`
- `POST /vision/register`
- `POST /servo/compute`
- `POST /servo/send_to_plc`
- `POST /inspection/run`
- `GET /system/status`
- `WebSocket /ws/status`

Example:

`curl -X POST http://127.0.0.1:8000/calibration/start`

## Simulation flow

The simulated camera generates four reference holes for self-calibration and a shifted material image for registration. MockDeepMatcher emits dense correspondences; registration computes the global offset; TPS estimates residual local deformation; ServoService checks safety thresholds and writes only recommendations to SimulatedPLC.

## Real camera integration

Implement a subclass of `CameraBase` for Basler, Hikvision, Daheng, or MindVision SDKs. Map exposure, gain, trigger mode, hardware trigger arm, timestamp, frame timeout, and exception handling into the common `Frame` result. Keep `SimulatedCamera` enabled for offline commissioning and CI tests.

## Siemens S7 PLC integration

Install and validate `snap7`, then replace `SiemensS7PLCStub` methods with DB block reads/writes for status, axis positions, safety signals, compensation, allow/deny bit, alarm code, and PLC ACK. Do not add any direct punch command in the vision layer.

## LightGlue, OmniGlue, and RoMa integration

Replace the stubs in `lightglue_stub.py` and `roma_stub.py` with model loading, preprocessing, tensor inference, and coordinate scaling. Preserve the `FeatureMatcher` interface and keep ORB/SIFT/edge fallback active for low GPU availability or missing weights.

## Safety notes

Punching is forbidden when emergency stop, safety door, PLC fault, low air pressure, camera or light fault, missing calibration, CAD not loaded, low confidence, low inlier ratio, high residual, excessive compensation, excessive deformation, or repeated NG occurs. Final punch motion must stay under PLC safety control.

## Tests

`pytest`

The tests cover simulated camera/PLC flow, hole detection, transform solving, image registration, servo output, low-confidence rejection, safety checks, and state-machine transitions.

## Engineering roadmap

Add real SDK adapters, machine-specific PLC maps, persistent SQLAlchemy records, production HMI, authenticated operator roles, model management, TensorRT acceleration, multi-camera calibration, richer defect detection, and site acceptance test scripts for each machine model.
