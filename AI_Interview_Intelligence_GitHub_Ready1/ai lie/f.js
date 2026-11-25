"use strict";

console.log("Face Detection Module Loaded.");

let FilesetResolver = null;
let FaceLandmarker = null;

let faceLandmarker = null;
let detectionRunning = false;
let animationFrameId = null;
let lastTimestamp = 0;

let currentFaceData = {
    detected: false,
    confidence: 0,
    eyeActivity: 0,
    faceStability: 0,
    expression: "Not Detected",
    timestamp: 0
};

let behaviorHistory = [];


// =====================================================
// LOAD LOCAL MEDIAPIPE
// =====================================================

async function loadMediaPipe() {

    console.log("Loading local MediaPipe...");

    try {

        const module =
            await import(
                "./node_modules/@mediapipe/tasks-vision/vision_bundle.mjs"
            );

        FilesetResolver =
            module.FilesetResolver;

        FaceLandmarker =
            module.FaceLandmarker;


        if (
            !FilesetResolver ||
            !FaceLandmarker
        ) {

            throw new Error(
                "MediaPipe classes were not found."
            );
        }


        console.log(
            "Local MediaPipe loaded successfully."
        );


        return true;


    } catch (error) {

        console.error(
            "Local MediaPipe loading failed:",
            error
        );


        return false;
    }
}

// =====================================================
// INITIALIZE
// =====================================================

async function initializeFaceLandmarker() {

    if (faceLandmarker) {

        return true;
    }


    console.log(
        "Initializing MediaPipe Face Landmarker..."
    );


    const loaded =
        await loadMediaPipe();


    if (!loaded) {

        console.error(
            "MediaPipe could not be loaded."
        );

        return false;
    }


    try {

        console.log(
            "Creating FilesetResolver..."
        );


        const vision =
            await FilesetResolver.forVisionTasks(
                "./node_modules/@mediapipe/tasks-vision/wasm"
            );


        console.log(
            "FilesetResolver ready."
        );


        try {

            console.log(
                "Trying GPU delegate..."
            );


            faceLandmarker =
                await FaceLandmarker.createFromOptions(
                    vision,
                    {

                        baseOptions: {

                            modelAssetPath:
                                "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",

                            delegate: "GPU"
                        },

                        runningMode: "VIDEO",

                        numFaces: 1,

                        minFaceDetectionConfidence:
                            0.15,

                        minFacePresenceConfidence:
                            0.15,

                        minTrackingConfidence:
                            0.15,

                        outputFaceBlendshapes:
                            false,

                        outputFacialTransformationMatrixes:
                            false
                    }
                );


        } catch (gpuError) {

            console.warn(
                "GPU failed. Using CPU.",
                gpuError
            );


            faceLandmarker =
                await FaceLandmarker.createFromOptions(
                    vision,
                    {

                        baseOptions: {

                            modelAssetPath:
                                "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",

                            delegate: "CPU"
                        },

                        runningMode: "VIDEO",

                        numFaces: 1,

                        minFaceDetectionConfidence:
                            0.10,

                        minFacePresenceConfidence:
                            0.10,

                        minTrackingConfidence:
                            0.10,

                        outputFaceBlendshapes:
                            false,

                        outputFacialTransformationMatrixes:
                            false
                    }
                );
        }


        console.log(
            "FACE LANDMARKER READY"
        );


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
// START
// =====================================================

async function startFaceDetection(video) {

    if (!video) {

        console.error(
            "Video element not found."
        );

        return false;
    }


    if (!faceLandmarker) {

        const ready =
            await initializeFaceLandmarker();


        if (!ready) {

            console.error(
                "Face Landmarker is not ready."
            );

            return false;
        }
    }


    console.log(
        "Waiting for video..."
    );


    if (video.readyState < 2) {

        await new Promise(resolve => {

            const handler = () => {

                video.removeEventListener(
                    "loadeddata",
                    handler
                );

                resolve();
            };


            video.addEventListener(
                "loadeddata",
                handler
            );

        });
    }


    console.log(
        "VIDEO READY"
    );


    console.log(
        "VIDEO DIMENSIONS:",
        video.videoWidth,
        "x",
        video.videoHeight
    );


    if (
        video.videoWidth === 0 ||
        video.videoHeight === 0
    ) {

        console.error(
            "Invalid video dimensions."
        );

        return false;
    }


    detectionRunning = true;

    lastTimestamp = 0;

    behaviorHistory = [];


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
            video.videoWidth > 0
        ) {

            const now =
                performance.now();


            const timestamp =
                Math.max(
                    now,
                    lastTimestamp + 1
                );


            lastTimestamp =
                timestamp;


            const result =
                faceLandmarker.detectForVideo(
                    video,
                    timestamp
                );


            processDetection(
                result,
                video
            );

        }

    } catch (error) {

        console.error(
            "Face detection error:",
            error
        );

    }


    animationFrameId =
        requestAnimationFrame(
            () => detectFrame(video)
        );
}


// =====================================================
// PROCESS
// =====================================================

function processDetection(
    result,
    video
) {

    const canvas =
        document.getElementById(
            "faceCanvas"
        );


    const ctx =
        canvas ?
        canvas.getContext("2d") :
        null;


    if (canvas) {

        canvas.width =
            video.videoWidth;

        canvas.height =
            video.videoHeight;
    }


    if (
        !result ||
        !result.faceLandmarks ||
        result.faceLandmarks.length === 0
    ) {

        currentFaceData = {

            detected: false,

            confidence: 0,

            eyeActivity: 0,

            faceStability: 0,

            expression:
                "Not Detected",

            timestamp:
                Date.now()

        };


        updateFaceUI(
            currentFaceData
        );


        return;
    }


    const landmarks =
        result.faceLandmarks[0];


    console.log(
        "FACE DETECTED:",
        landmarks.length,
        "landmarks"
    );


    const confidence =
        calculateFaceConfidence(
            landmarks
        );


    const eyeActivity =
        calculateEyeActivity(
            landmarks
        );


    const faceStability =
        calculateFaceStability();


    currentFaceData = {

        detected: true,

        confidence,

        eyeActivity,

        faceStability,

        expression:
            "Observed",

        timestamp:
            Date.now()

    };


    behaviorHistory.push(
        currentFaceData
    );


    if (
        behaviorHistory.length > 100
    ) {

        behaviorHistory.shift();

    }


    drawFace(
        ctx,
        landmarks,
        video
    );


    updateFaceUI(
        currentFaceData
    );
}


// =====================================================
// CONFIDENCE
// =====================================================

function calculateFaceConfidence(
    landmarks
) {

    if (
        !landmarks ||
        !landmarks.length
    ) {

        return 0;
    }


    let valid = 0;


    for (
        const point of landmarks
    ) {

        if (
            point.x >= 0 &&
            point.x <= 1 &&
            point.y >= 0 &&
            point.y <= 1
        ) {

            valid++;
        }
    }


    return Math.round(
        (
            valid /
            landmarks.length
        ) * 100
    );
}


// =====================================================
// EYE ACTIVITY
// =====================================================

function calculateEyeActivity(
    landmarks
) {

    if (
        !landmarks ||
        landmarks.length < 468
    ) {

        return 50;
    }


    const leftUpper =
        landmarks[159];

    const leftLower =
        landmarks[145];

    const rightUpper =
        landmarks[386];

    const rightLower =
        landmarks[374];


    if (
        !leftUpper ||
        !leftLower ||
        !rightUpper ||
        !rightLower
    ) {

        return 50;
    }


    const left =
        Math.abs(
            leftUpper.y -
            leftLower.y
        );


    const right =
        Math.abs(
            rightUpper.y -
            rightLower.y
        );


    const opening =
        (left + right) / 2;


    return Math.round(
        Math.min(
            100,
            Math.max(
                0,
                opening * 2000
            )
        )
    );
}


// =====================================================
// STABILITY
// =====================================================

function calculateFaceStability() {

    if (
        behaviorHistory.length < 2
    ) {

        return 100;
    }


    return 85;
}


// =====================================================
// DRAW
// =====================================================

function drawFace(
    ctx,
    landmarks,
    video
) {

    if (!ctx) {
        return;
    }


    ctx.clearRect(
        0,
        0,
        video.videoWidth,
        video.videoHeight
    );


    // Face landmarks

    ctx.fillStyle =
        "rgba(115,199,231,0.9)";


    for (
        const point of landmarks
    ) {

        const x =
            point.x *
            video.videoWidth;


        const y =
            point.y *
            video.videoHeight;


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


    // Bounding box

    let minX = 1;
    let minY = 1;
    let maxX = 0;
    let maxY = 0;


    for (
        const point of landmarks
    ) {

        minX =
            Math.min(
                minX,
                point.x
            );


        minY =
            Math.min(
                minY,
                point.y
            );


        maxX =
            Math.max(
                maxX,
                point.x
            );


        maxY =
            Math.max(
                maxY,
                point.y
            );
    }


    const x =
        minX *
        video.videoWidth -
        15;


    const y =
        minY *
        video.videoHeight -
        15;


    const width =
        (
            maxX -
            minX
        ) *
        video.videoWidth +
        30;


    const height =
        (
            maxY -
            minY
        ) *
        video.videoHeight +
        30;


    ctx.strokeStyle =
        "rgba(115,199,231,0.9)";


    ctx.lineWidth = 2;


    ctx.strokeRect(
        x,
        y,
        width,
        height
    );
}


// =====================================================
// UI
// =====================================================

function updateFaceUI(data) {

    const status =
        document.getElementById(
            "faceDetectionStatus"
        );


    const face =
        document.getElementById(
            "faceSignal"
        );


    const confidence =
        document.getElementById(
            "expressionConfidence"
        );


    const eye =
        document.getElementById(
            "eyeActivity"
        );


    const monitoring =
        document.getElementById(
            "expressionSignal"
        );


    if (!data.detected) {

        if (status)
            status.textContent =
                "● SEARCHING";


        if (face)
            face.textContent =
                "Not Detected";


        if (confidence)
            confidence.textContent =
                "0%";


        if (eye)
            eye.textContent =
                "Waiting";


        if (monitoring)
            monitoring.textContent =
                "Waiting";


        return;
    }


    if (status)
        status.textContent =
            "● MONITORING";


    if (face)
        face.textContent =
            "Detected";


    if (confidence)
        confidence.textContent =
            `${data.confidence}%`;


    if (eye)
        eye.textContent =
            `${data.eyeActivity}%`;


    if (monitoring)
        monitoring.textContent =
            "Active";


    const badge =
        document.getElementById(
            "expressionBadge"
        );


    if (badge)
        badge.textContent =
            "FACE DETECTED";


    const currentExpression =
        document.getElementById(
            "currentExpression"
        );


    if (currentExpression)
        currentExpression.textContent =
            "Observed";
}


// =====================================================
// STOP
// =====================================================

function stopFaceDetection() {

    detectionRunning = false;


    if (animationFrameId) {

        cancelAnimationFrame(
            animationFrameId
        );

        animationFrameId = null;
    }


    console.log(
        "Face detection stopped."
    );
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

        faceStability: 0,

        expression:
            "Not Detected",

        timestamp:
            Date.now()

    };


    behaviorHistory = [];


    const canvas =
        document.getElementById(
            "faceCanvas"
        );


    if (canvas) {

        const ctx =
            canvas.getContext("2d");


        ctx.clearRect(
            0,
            0,
            canvas.width,
            canvas.height
        );
    }
}


// =====================================================
// CURRENT DATA
// =====================================================

function getCurrentFaceData() {

    return {
        ...currentFaceData
    };
}


// =====================================================
// SUMMARY
// =====================================================

function getBehaviorSummary() {

    const detected =
        behaviorHistory.filter(
            item => item.detected
        );


    if (!detected.length) {

        return {

            samples:
                behaviorHistory.length,

            face_detected:
                false,

            average_confidence:
                0,

            average_eye_activity:
                0,

            average_face_stability:
                0

        };
    }


    const average = values => {

        if (!values.length)
            return 0;


        return Math.round(
            values.reduce(
                (a, b) => a + b,
                0
            ) / values.length
        );
    };


    return {

        samples:
            behaviorHistory.length,

        face_detected:
            true,

        average_confidence:
            average(
                detected.map(
                    x => x.confidence
                )
            ),

        average_eye_activity:
            average(
                detected.map(
                    x => x.eyeActivity
                )
            ),

        average_face_stability:
            average(
                detected.map(
                    x => x.faceStability
                )
            )

    };
}


// =====================================================
// PUBLIC API
// =====================================================

window.FaceAnalysis = {

    initialize:
        initializeFaceLandmarker,

    start:
        startFaceDetection,

    stop:
        stopFaceDetection,

    reset:
        resetFaceAnalysis,

    getCurrent:
        getCurrentFaceData,

    getSummary:
        getBehaviorSummary
};


console.log(
    "FaceAnalysis API ready."
);