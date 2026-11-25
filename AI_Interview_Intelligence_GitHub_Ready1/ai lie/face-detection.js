"use strict";

console.log("Face Detection Module Loaded.");

let FilesetResolver = null;
let FaceLandmarker = null;
let faceLandmarker = null;

let detectionRunning = false;
let animationFrameId = null;
let lastTimestamp = 0;

let behaviorHistory = [];
let previousLandmarks = null;

const MAX_HISTORY_SAMPLES = 1500;

let currentFaceData = {
    detected: false,
    confidence: 0,
    eyeActivity: 0,
    faceStability: null,
    expression: "Not Detected",
    timestamp: 0
};

// =====================================================
// LOAD LOCAL MEDIAPIPE
// =====================================================

async function loadMediaPipe() {
    try {
        const module = await import(
            "./node_modules/@mediapipe/tasks-vision/vision_bundle.mjs"
        );

        FilesetResolver = module.FilesetResolver;
        FaceLandmarker = module.FaceLandmarker;

        if (!FilesetResolver || !FaceLandmarker) {
            throw new Error("MediaPipe classes were not found.");
        }

        console.log("Local MediaPipe loaded successfully.");

        return true;

    } catch (error) {
        console.error("Local MediaPipe loading failed:", error);
        return false;
    }
}

// =====================================================
// INITIALIZE FACE LANDMARKER
// =====================================================

async function initializeFaceLandmarker() {
    if (faceLandmarker) {
        return true;
    }

    const loaded = await loadMediaPipe();

    if (!loaded) {
        console.error("MediaPipe could not be loaded.");
        return false;
    }

    try {
        const vision = await FilesetResolver.forVisionTasks(
            "./node_modules/@mediapipe/tasks-vision/wasm"
        );

        const options = {
            baseOptions: {
                modelAssetPath:
                    "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task"
            },
            runningMode: "VIDEO",
            numFaces: 1,
            minFaceDetectionConfidence: 0.15,
            minFacePresenceConfidence: 0.15,
            minTrackingConfidence: 0.15,
            outputFaceBlendshapes: false,
            outputFacialTransformationMatrixes: false
        };

        try {
            console.log("Trying GPU delegate...");

            faceLandmarker = await FaceLandmarker.createFromOptions(
                vision,
                {
                    ...options,
                    baseOptions: {
                        ...options.baseOptions,
                        delegate: "GPU"
                    }
                }
            );

        } catch (gpuError) {
            console.warn("GPU failed. Trying CPU.", gpuError);

            faceLandmarker = await FaceLandmarker.createFromOptions(
                vision,
                {
                    ...options,
                    baseOptions: {
                        ...options.baseOptions,
                        delegate: "CPU"
                    }
                }
            );
        }

        console.log("FACE LANDMARKER READY");

        return true;

    } catch (error) {
        console.error(
            "Face Landmarker initialization failed:",
            error
        );

        faceLandmarker = null;

        return false;
    }
}

// =====================================================
// START FACE DETECTION
// =====================================================

async function startFaceDetection(video) {
    if (!video) {
        console.error("Video element not found.");
        return false;
    }

    if (!faceLandmarker) {
        const ready = await initializeFaceLandmarker();

        if (!ready) {
            console.error("Face Landmarker is not ready.");
            return false;
        }
    }

    if (video.readyState < 2) {
        await new Promise(resolve => {
            video.addEventListener(
                "loadeddata",
                resolve,
                { once: true }
            );
        });
    }

    if (!video.videoWidth || !video.videoHeight) {
        console.error("Invalid video dimensions.");
        return false;
    }

    stopFaceDetection();

    detectionRunning = true;
    lastTimestamp = 0;

    behaviorHistory = [];
    previousLandmarks = null;

    detectFrame(video);

    return true;
}

// =====================================================
// DETECTION LOOP
// =====================================================

function detectFrame(video) {
    if (!detectionRunning) {
        return;
    }

    try {
        if (
            faceLandmarker &&
            video.readyState >= 2 &&
            video.videoWidth > 0 &&
            video.videoHeight > 0
        ) {
            const now = performance.now();

            const timestamp = Math.max(
                now,
                lastTimestamp + 1
            );

            lastTimestamp = timestamp;

            const result = faceLandmarker.detectForVideo(
                video,
                timestamp
            );

            processDetection(result, video);
        }

    } catch (error) {
        console.error("Face detection error:", error);
    }

    if (detectionRunning) {
        animationFrameId = requestAnimationFrame(
            () => detectFrame(video)
        );
    }
}

// =====================================================
// PROCESS FACE DETECTION
// =====================================================

function processDetection(result, video) {
    const canvas = document.getElementById("faceCanvas");

    const ctx = canvas
        ? canvas.getContext("2d")
        : null;

    if (canvas) {
        if (canvas.width !== video.videoWidth) {
            canvas.width = video.videoWidth;
        }

        if (canvas.height !== video.videoHeight) {
            canvas.height = video.videoHeight;
        }
    }

    const landmarks = result?.faceLandmarks?.[0];

    if (!landmarks || landmarks.length === 0) {
        currentFaceData = {
            detected: false,
            confidence: 0,
            eyeActivity: 0,
            faceStability: null,
            expression: "Not Detected",
            timestamp: Date.now()
        };

        previousLandmarks = null;

        if (ctx && canvas) {
            ctx.clearRect(
                0,
                0,
                canvas.width,
                canvas.height
            );
        }

        updateFaceUI(currentFaceData);

        return;
    }

    const confidence = calculateFaceConfidence(
        landmarks
    );

    const eyeActivity = calculateEyeActivity(
        landmarks
    );

    const faceStability = calculateFaceStability(
        landmarks
    );

    currentFaceData = {
        detected: true,
        confidence,
        eyeActivity,
        faceStability,
        expression: "Observed",
        timestamp: Date.now()
    };

    behaviorHistory.push({
        ...currentFaceData
    });

    if (behaviorHistory.length > MAX_HISTORY_SAMPLES) {
        behaviorHistory.shift();
    }

    // Save current landmarks for comparison with the next frame.
    previousLandmarks = landmarks.map(point => ({
        x: point.x,
        y: point.y
    }));

    drawFace(
        ctx,
        landmarks,
        video
    );

    updateFaceUI(currentFaceData);
}

// =====================================================
// FACE CONFIDENCE
// =====================================================

function calculateFaceConfidence(landmarks) {
    if (!landmarks || !landmarks.length) {
        return 0;
    }

    let valid = 0;

    for (const point of landmarks) {
        if (
            Number.isFinite(point.x) &&
            Number.isFinite(point.y) &&
            point.x >= 0 &&
            point.x <= 1 &&
            point.y >= 0 &&
            point.y <= 1
        ) {
            valid++;
        }
    }

    return Math.round(
        (valid / landmarks.length) * 100
    );
}

// =====================================================
// EYE ACTIVITY
// =====================================================

// Estimates eye opening per frame.
// This is not blink-rate or gaze-direction measurement.

function calculateEyeActivity(landmarks) {
    if (!landmarks || landmarks.length < 468) {
        return 0;
    }

    const leftUpper = landmarks[159];
    const leftLower = landmarks[145];

    const rightUpper = landmarks[386];
    const rightLower = landmarks[374];

    if (
        !leftUpper ||
        !leftLower ||
        !rightUpper ||
        !rightLower
    ) {
        return 0;
    }

    const leftOpening = Math.abs(
        leftUpper.y - leftLower.y
    );

    const rightOpening = Math.abs(
        rightUpper.y - rightLower.y
    );

    const averageOpening =
        (leftOpening + rightOpening) / 2;

    return Math.round(
        Math.max(
            0,
            Math.min(
                100,
                averageOpening * 2000
            )
        )
    );
}

// =====================================================
// FACIAL STABILITY
// =====================================================

// Estimates frame-to-frame landmark movement.
// The first sample has no previous frame, so stability is unknown.

function calculateFaceStability(landmarks) {
    if (
        !previousLandmarks ||
        previousLandmarks.length !== landmarks.length
    ) {
        return null;
    }

    let totalMovement = 0;

    for (let i = 0; i < landmarks.length; i++) {
        const dx =
            landmarks[i].x -
            previousLandmarks[i].x;

        const dy =
            landmarks[i].y -
            previousLandmarks[i].y;

        totalMovement += Math.sqrt(
            dx * dx + dy * dy
        );
    }

    const averageMovement =
        totalMovement / landmarks.length;

    const stability =
        100 - averageMovement * 1200;

    return Math.round(
        Math.max(
            0,
            Math.min(
                100,
                stability
            )
        )
    );
}

// =====================================================
// DRAW FACE LANDMARKS
// =====================================================

function drawFace(ctx, landmarks, video) {
    if (!ctx) {
        return;
    }

    ctx.clearRect(
        0,
        0,
        video.videoWidth,
        video.videoHeight
    );

    ctx.fillStyle = "rgba(115,199,231,0.9)";

    for (const point of landmarks) {
        const x = point.x * video.videoWidth;
        const y = point.y * video.videoHeight;

        ctx.beginPath();

        ctx.arc(
            x,
            y,
            1.2,
            0,
            Math.PI * 2
        );

        ctx.fill();
    }

    let minX = 1;
    let minY = 1;
    let maxX = 0;
    let maxY = 0;

    for (const point of landmarks) {
        minX = Math.min(minX, point.x);
        minY = Math.min(minY, point.y);

        maxX = Math.max(maxX, point.x);
        maxY = Math.max(maxY, point.y);
    }

    const x =
        minX * video.videoWidth - 15;

    const y =
        minY * video.videoHeight - 15;

    const width =
        (maxX - minX) * video.videoWidth + 30;

    const height =
        (maxY - minY) * video.videoHeight + 30;

    ctx.strokeStyle = "rgba(115,199,231,0.9)";
    ctx.lineWidth = 2;

    ctx.strokeRect(
        x,
        y,
        width,
        height
    );
}

// =====================================================
// UPDATE DASHBOARD UI
// =====================================================

function updateFaceUI(data) {
    const status = document.getElementById(
        "faceDetectionStatus"
    );

    const face = document.getElementById(
        "faceSignal"
    );

    const confidence = document.getElementById(
        "expressionConfidence"
    );

    const eye = document.getElementById(
        "eyeActivity"
    );

    const monitoring = document.getElementById(
        "expressionSignal"
    );

    const badge = document.getElementById(
        "expressionBadge"
    );

    const expression = document.getElementById(
        "currentExpression"
    );

    if (!data.detected) {
        if (status) {
            status.textContent = "● SEARCHING";
        }

        if (face) {
            face.textContent = "Not Detected";
        }

        if (confidence) {
            confidence.textContent = "0%";
        }

        if (eye) {
            eye.textContent = "Waiting";
        }

        if (monitoring) {
            monitoring.textContent = "Waiting";
        }

        if (badge) {
            badge.textContent = "FACE NOT DETECTED";
        }

        if (expression) {
            expression.textContent = "Not Detected";
        }

        return;
    }

    if (status) {
        status.textContent = "● MONITORING";
    }

    if (face) {
        face.textContent = "Detected";
    }

    if (confidence) {
        confidence.textContent =
            `${data.confidence}%`;
    }

    if (eye) {
        eye.textContent =
            `${data.eyeActivity}%`;
    }

    if (monitoring) {
        monitoring.textContent = "Active";
    }

    if (badge) {
        badge.textContent = "FACE DETECTED";
    }

    if (expression) {
        expression.textContent = "Observed";
    }
}

// =====================================================
// STOP
// =====================================================

function stopFaceDetection() {
    detectionRunning = false;

    if (animationFrameId !== null) {
        cancelAnimationFrame(animationFrameId);

        animationFrameId = null;
    }

    console.log("Face detection stopped.");
}

// =====================================================
// RESET
// =====================================================

function resetFaceAnalysis() {
    stopFaceDetection();

    currentFaceData = {
        detected: false,
        confidence: 0,
        eyeActivity: 0,
        faceStability: null,
        expression: "Not Detected",
        timestamp: Date.now()
    };

    behaviorHistory = [];
    previousLandmarks = null;

    const canvas = document.getElementById(
        "faceCanvas"
    );

    if (canvas) {
        const ctx = canvas.getContext("2d");

        if (ctx) {
            ctx.clearRect(
                0,
                0,
                canvas.width,
                canvas.height
            );
        }
    }

    updateFaceUI(currentFaceData);
}

// =====================================================
// GET CURRENT DATA
// =====================================================

function getCurrentFaceData() {
    return {
        ...currentFaceData
    };
}

// =====================================================
// INTERVIEW-WIDE SUMMARY
// =====================================================

function getBehaviorSummary() {
    const detectedSamples = behaviorHistory.filter(
        item => item.detected
    );

    function average(values) {
        const validValues = values.filter(
            value => Number.isFinite(value)
        );

        if (!validValues.length) {
            return null;
        }

        return Math.round(
            validValues.reduce(
                (total, value) => total + value,
                0
            ) / validValues.length
        );
    }

    const averageConfidence = average(
        detectedSamples.map(
            item => item.confidence
        )
    );

    const averageEyeActivity = average(
        detectedSamples.map(
            item => item.eyeActivity
        )
    );

    const averageFaceStability = average(
        detectedSamples.map(
            item => item.faceStability
        )
    );

    return {
        samples: behaviorHistory.length,

        detected_samples:
            detectedSamples.length,

        face_detected:
            detectedSamples.length > 0,

        average_confidence:
            averageConfidence,

        average_eye_activity:
            averageEyeActivity,

        average_face_stability:
            averageFaceStability,

        // CamelCase aliases for compatibility.
        averageConfidence,
        averageEyeActivity,
        averageFaceStability
    };
}

// =====================================================
// PUBLIC API
// =====================================================

window.FaceAnalysis = {
    initialize: initializeFaceLandmarker,
    start: startFaceDetection,
    stop: stopFaceDetection,
    reset: resetFaceAnalysis,
    getCurrent: getCurrentFaceData,
    getSummary: getBehaviorSummary
};

console.log("FaceAnalysis API ready.");