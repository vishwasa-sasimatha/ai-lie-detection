"use strict";

/* =========================================================
   AI INTERVIEW INTELLIGENCE
   Interview + Facial Expression Analysis + PDF Report
========================================================= */

console.log("AI INTERVIEW INTELLIGENCE LOADED");


/* =========================================================
   CONFIGURATION
========================================================= */

const API_URL = "http://127.0.0.1:8000";

const DEFAULT_CONFIG = {
    role: "Software Developer",

    skills: [
        "Python",
        "JavaScript",
        "SQL"
    ],

    difficulty: "medium",

    totalQuestions: 5
};


/* =========================================================
   DOM
========================================================= */

const roleTitle =
    document.getElementById("roleTitle");

const questionText =
    document.getElementById("questionText");

const questionNumber =
    document.getElementById("questionNumber");

const answerTranscript =
    document.getElementById("answerTranscript");

const recordingStatus =
    document.getElementById("recordingStatus");

const listeningText =
    document.getElementById("listeningText");

const listeningProgress =
    document.getElementById("listeningProgress");

const timerElement =
    document.getElementById("timer");

const candidateVideo =
    document.getElementById("candidateVideo");

const faceCanvas =
    document.getElementById("faceCanvas");

const cameraPlaceholder =
    document.getElementById("cameraPlaceholder");

const cameraStatus =
    document.getElementById("cameraStatus");

const currentExpression =
    document.getElementById("currentExpression");

const expressionSignal =
    document.getElementById("expressionSignal");

const faceSignal =
    document.getElementById("faceSignal");

const expressionConfidence =
    document.getElementById("expressionConfidence");

const eyeActivity =
    document.getElementById("eyeActivity");

const faceDetectionStatus =
    document.getElementById("faceDetectionStatus");

const interviewProgress =
    document.getElementById("interviewProgress");

const progressText =
    document.getElementById("progressText");

const autoStatusTitle =
    document.getElementById("autoStatusTitle");

const autoStatusText =
    document.getElementById("autoStatusText");

const analysisSection =
    document.getElementById("analysisSection");

const relevanceScore =
    document.getElementById("relevanceScore");

const consistencyScore =
    document.getElementById("consistencyScore");

const deceptionScore =
    document.getElementById("deceptionScore");

const analysisIndicators =
    document.getElementById("analysisIndicators");

const analysisFeedback =
    document.getElementById("analysisFeedback");

const completionOverlay =
    document.getElementById("completionOverlay");

const downloadReport =
    document.getElementById("downloadReport");

const completionDownload =
    document.getElementById("completionDownload");

const closeCompletion =
    document.getElementById("closeCompletion");

const repeatQuestion =
    document.getElementById("repeatQuestion");

const endInterview =
    document.getElementById("endInterview");


/* =========================================================
   FACIAL EXPRESSION DOM
========================================================= */

const neutralPercent =
    document.getElementById("neutralPercent");

const happyPercent =
    document.getElementById("happyPercent");

const surprisedPercent =
    document.getElementById("surprisedPercent");

const sadPercent =
    document.getElementById("sadPercent");

const angryPercent =
    document.getElementById("angryPercent");

const otherPercent =
    document.getElementById("otherPercent");

const expressionObservationStatus =
    document.getElementById(
        "expressionObservationStatus"
    );


/* =========================================================
   STATE
========================================================= */

let interviewConfig = {
    ...DEFAULT_CONFIG
};

let currentQuestionIndex = 0;

let currentQuestion = "";

let currentAnswer = "";

let interviewStarted = false;

let interviewFinished = false;

let processingAnswer = false;

let interviewStartTime = null;

let timerInterval = null;

let silenceTimer = null;

let listeningProgressTimer = null;

let recognition = null;

let recognitionSupported = false;

let isListening = false;

let finalTranscript = "";

let interimTranscript = "";

let mediaStream = null;


/* =========================================================
   ANALYSIS STATE
========================================================= */

let analysisResults = [];

let latestAnalysis = {
    relevance_score: null,
    consistency_score: null,
    deception_indicator_score: null,
    indicators: [],
    feedback: ""
};


/* =========================================================
   FACIAL ANALYSIS STATE
========================================================= */

let faceLandmarker = null;

let faceDetectionRunning = false;

let faceAnimationFrame = null;

let lastFaceResultTime = 0;

let currentFaceDetected = false;

let currentExpressionName = "Neutral";

let currentExpressionScore = 0;

let expressionHistory = [];

let lastExpressionSample = 0;

const EXPRESSION_SAMPLE_INTERVAL = 1000;


/* =========================================================
   EXPRESSION COUNTERS
========================================================= */

const expressionCounts = {
    Neutral: 0,
    Happy: 0,
    Surprised: 0,
    Sad: 0,
    Angry: 0,
    Other: 0
};


/* =========================================================
   INITIALIZE CONFIG
========================================================= */

function loadInterviewConfig() {

    try {

        const savedConfig =
            localStorage.getItem(
                "aiInterviewConfig"
            );

        if (savedConfig) {

            const parsed =
                JSON.parse(savedConfig);

            interviewConfig = {
                ...DEFAULT_CONFIG,
                ...parsed
            };
        }

    } catch (error) {

        console.error(
            "Could not load interview configuration:",
            error
        );

        interviewConfig = {
            ...DEFAULT_CONFIG
        };
    }

    if (
        !Array.isArray(
            interviewConfig.skills
        )
        ||
        interviewConfig.skills.length === 0
    ) {

        interviewConfig.skills = [
            ...DEFAULT_CONFIG.skills
        ];
    }

    if (
        !interviewConfig.totalQuestions
        ||
        interviewConfig.totalQuestions < 1
    ) {

        interviewConfig.totalQuestions =
            DEFAULT_CONFIG.totalQuestions;
    }

    if (roleTitle) {

        roleTitle.textContent =
            interviewConfig.role ||
            DEFAULT_CONFIG.role;
    }
}


/* =========================================================
   TIMER
========================================================= */

function startTimer() {

    interviewStartTime =
        Date.now();

    timerInterval =
        setInterval(() => {

            if (!interviewStartTime) {
                return;
            }

            const elapsed =
                Math.floor(
                    (Date.now() -
                        interviewStartTime) /
                    1000
                );

            const minutes =
                Math.floor(
                    elapsed / 60
                );

            const seconds =
                elapsed % 60;

            if (timerElement) {

                timerElement.textContent =
                    `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
            }

        }, 1000);
}


function stopTimer() {

    if (timerInterval) {

        clearInterval(
            timerInterval
        );

        timerInterval = null;
    }
}


function getInterviewDuration() {

    if (!interviewStartTime) {
        return "00:00";
    }

    const endTime =
        interviewFinished
            ? Date.now()
            : Date.now();

    const elapsed =
        Math.floor(
            (endTime -
                interviewStartTime) /
            1000
        );

    const minutes =
        Math.floor(
            elapsed / 60
        );

    const seconds =
        elapsed % 60;

    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}


/* =========================================================
   CAMERA
========================================================= */

async function startCamera() {

    try {

        mediaStream =
            await navigator.mediaDevices.getUserMedia({
                video: {
                    width: {
                        ideal: 1280
                    },
                    height: {
                        ideal: 720
                    },
                    facingMode: "user"
                },
                audio: true
            });

        candidateVideo.srcObject =
            mediaStream;

        await candidateVideo.play();

        if (cameraPlaceholder) {

            cameraPlaceholder.style.display =
                "none";
        }

        if (cameraStatus) {

            cameraStatus.textContent =
                "Camera Active";

            cameraStatus.classList.add(
                "face-detected"
            );
        }

        console.log(
            "Camera and microphone started."
        );

        initializeFaceAnalysis();

    } catch (error) {

        console.error(
            "Camera error:",
            error
        );

        if (cameraStatus) {

            cameraStatus.textContent =
                "Camera unavailable";
        }

        if (cameraPlaceholder) {

            cameraPlaceholder.style.display =
                "flex";
        }

        if (faceSignal) {

            faceSignal.textContent =
                "Unavailable";
        }
    }
}


/* =========================================================
   STOP CAMERA
========================================================= */

function stopCamera() {

    if (faceAnimationFrame) {

        cancelAnimationFrame(
            faceAnimationFrame
        );

        faceAnimationFrame = null;
    }

    if (mediaStream) {

        mediaStream
            .getTracks()
            .forEach(track => {
                track.stop();
            });

        mediaStream = null;
    }

    if (candidateVideo) {

        candidateVideo.srcObject =
            null;
    }

    faceDetectionRunning = false;
}


/* =========================================================
   MEDIAPIPE INITIALIZATION
========================================================= */

async function initializeFaceAnalysis() {

    try {

        if (
            typeof vision ===
            "undefined"
        ) {

            console.error(
                "MediaPipe vision library was not loaded."
            );

            updateFaceStatus(
                false,
                "Library unavailable"
            );

            return;
        }

        const {
            FaceLandmarker,
            FilesetResolver
        } = vision;

        const filesetResolver =
            await FilesetResolver.forVisionTasks(
                "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.22/wasm"
            );

        faceLandmarker =
            await FaceLandmarker.createFromOptions(
                filesetResolver,
                {
                    baseOptions: {
                        modelAssetPath:
                            "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",

                        delegate: "GPU"
                    },

                    runningMode: "VIDEO",

                    numFaces: 1,

                    outputFaceBlendshapes: true,

                    outputFacialTransformationMatrixes:
                        false
                }
            );

        console.log(
            "Face Landmarker initialized."
        );

        faceDetectionRunning = true;

        if (expressionObservationStatus) {

            expressionObservationStatus.textContent =
                "Recording";
        }

        startFaceDetectionLoop();

    } catch (error) {

        console.error(
            "Face Landmarker initialization failed:",
            error
        );

        updateFaceStatus(
            false,
            "Detection unavailable"
        );
    }
}


/* =========================================================
   FACE DETECTION LOOP
========================================================= */

function startFaceDetectionLoop() {

    if (
        !faceDetectionRunning ||
        !faceLandmarker ||
        !candidateVideo
    ) {
        return;
    }

    if (
        candidateVideo.readyState <
        2
    ) {

        faceAnimationFrame =
            requestAnimationFrame(
                startFaceDetectionLoop
            );

        return;
    }

    try {

        const now =
            performance.now();

        const result =
            faceLandmarker.detectForVideo(
                candidateVideo,
                now
            );

        processFaceResult(
            result
        );

    } catch (error) {

        console.error(
            "Face detection error:",
            error
        );
    }

    faceAnimationFrame =
        requestAnimationFrame(
            startFaceDetectionLoop
        );
}


/* =========================================================
   PROCESS FACE RESULT
========================================================= */

function processFaceResult(result) {

    if (
        !result ||
        !result.faceLandmarks ||
        result.faceLandmarks.length === 0
    ) {

        currentFaceDetected =
            false;

        updateFaceStatus(
            false,
            "No face"
        );

        return;
    }

    currentFaceDetected =
        true;

    updateFaceStatus(
        true,
        "Face detected"
    );

    drawFaceLandmarks(
        result.faceLandmarks[0]
    );

    const blendshapeSet =
        result.faceBlendshapes &&
        result.faceBlendshapes.length
            ? result.faceBlendshapes[0]
            : null;

    if (!blendshapeSet) {
        return;
    }

    const blendshapes =
        {};

    blendshapeSet.categories
        .forEach(item => {

            blendshapes[
                item.categoryName
            ] = item.score;
        });

    const expression =
        classifyExpression(
            blendshapes
        );

    currentExpressionName =
        expression.name;

    currentExpressionScore =
        expression.confidence;

    updateExpressionUI(
        expression
    );

    updateEyeActivity(
        blendshapes
    );

    recordExpression(
        expression,
        blendshapes
    );
}


/* =========================================================
   FACE STATUS UI
========================================================= */

function updateFaceStatus(
    detected,
    text
) {

    if (faceSignal) {

        faceSignal.textContent =
            text;

        faceSignal.classList.toggle(
            "face-detected",
            detected
        );

        faceSignal.classList.toggle(
            "face-not-detected",
            !detected
        );
    }

    if (faceDetectionStatus) {

        faceDetectionStatus.textContent =
            detected
                ? "● FACE LIVE"
                : "● SEARCHING";
    }
}


/* =========================================================
   DRAW FACE LANDMARKS
========================================================= */

function drawFaceLandmarks(
    landmarks
) {

    if (
        !faceCanvas ||
        !candidateVideo
    ) {
        return;
    }

    const ctx =
        faceCanvas.getContext("2d");

    const width =
        candidateVideo.videoWidth;

    const height =
        candidateVideo.videoHeight;

    if (!width || !height) {
        return;
    }

    faceCanvas.width =
        width;

    faceCanvas.height =
        height;

    ctx.clearRect(
        0,
        0,
        width,
        height
    );

    /*
     * We intentionally draw only a
     * subtle facial outline instead
     * of covering the face with a
     * large landmark mesh.
     */

    ctx.strokeStyle =
        "rgba(77,168,255,0.55)";

    ctx.lineWidth = 1.2;

    const selectedPoints = [
        10,
        152,
        234,
        454,
        61,
        291
    ];

    ctx.beginPath();

    selectedPoints.forEach(
        (index, position) => {

            const point =
                landmarks[index];

            if (!point) {
                return;
            }

            const x =
                point.x * width;

            const y =
                point.y * height;

            if (position === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        }
    );

    ctx.stroke();
}


/* =========================================================
   EXPRESSION CLASSIFICATION
========================================================= */

function classifyExpression(
    b
) {

    const smile =
        Math.max(
            b.mouthSmileLeft || 0,
            b.mouthSmileRight || 0
        );

    const frown =
        Math.max(
            b.mouthFrownLeft || 0,
            b.mouthFrownRight || 0
        );

    const browDown =
        Math.max(
            b.browDownLeft || 0,
            b.browDownRight || 0
        );

    const browUp =
        Math.max(
            b.browInnerUp || 0,
            b.browOuterUpLeft || 0,
            b.browOuterUpRight || 0
        );

    const eyeWide =
        Math.max(
            b.eyeWideLeft || 0,
            b.eyeWideRight || 0
        );

    const eyeBlink =
        Math.max(
            b.eyeBlinkLeft || 0,
            b.eyeBlinkRight || 0
        );

    const jawOpen =
        b.jawOpen || 0;


    /* HAPPY */

    if (
        smile > 0.35 &&
        smile > frown + 0.10
    ) {

        return {
            name: "Happy",
            confidence:
                clampPercent(
                    smile
                )
        };
    }


    /* SURPRISED */

    if (
        eyeWide > 0.35 &&
        browUp > 0.30 &&
        jawOpen > 0.25
    ) {

        return {
            name: "Surprised",
            confidence:
                clampPercent(
                    Math.max(
                        eyeWide,
                        browUp,
                        jawOpen
                    )
                )
        };
    }


    /* SAD */

    if (
        frown > 0.30 &&
        browInnerUp > 0
    ) {

        return {
            name: "Sad",
            confidence:
                clampPercent(
                    frown
                )
        };
    }


    /* ANGRY */

    if (
        browDown > 0.35 &&
        frown > 0.20
    ) {

        return {
            name: "Angry",
            confidence:
                clampPercent(
                    Math.max(
                        browDown,
                        frown
                    )
                )
        };
    }


    /* OTHER */

    if (
        eyeBlink > 0.55 ||
        jawOpen > 0.45
    ) {

        return {
            name: "Other",
            confidence:
                clampPercent(
                    Math.max(
                        eyeBlink,
                        jawOpen
                    )
                )
        };
    }


    /* NEUTRAL */

    return {
        name: "Neutral",
        confidence: 60
    };
}


/* =========================================================
   CLAMP
========================================================= */

function clampPercent(value) {

    const number =
        Number(value) || 0;

    return Math.max(
        0,
        Math.min(
            100,
            Math.round(
                number * 100
            )
        )
    );
}


/* =========================================================
   EXPRESSION UI
========================================================= */

function updateExpressionUI(
    expression
) {

    if (currentExpression) {

        currentExpression.textContent =
            expression.name;
    }

    if (expressionSignal) {

        expressionSignal.textContent =
            expression.name;

        expressionSignal.classList.add(
            "expression-active"
        );
    }

    if (expressionConfidence) {

        expressionConfidence.textContent =
            `${expression.confidence}%`;
    }
}


/* =========================================================
   EYE ACTIVITY
========================================================= */

function updateEyeActivity(
    b
) {

    const blink =
        (
            (b.eyeBlinkLeft || 0) +
            (b.eyeBlinkRight || 0)
        ) / 2;

    if (!eyeActivity) {
        return;
    }

    if (blink > 0.45) {

        eyeActivity.textContent =
            "Blink detected";

    } else if (blink > 0.18) {

        eyeActivity.textContent =
            "Active";

    } else {

        eyeActivity.textContent =
            "Open";
    }
}


/* =========================================================
   RECORD EXPRESSION
========================================================= */

function recordExpression(
    expression,
    blendshapes
) {

    const now =
        Date.now();

    if (
        now -
        lastExpressionSample <
        EXPRESSION_SAMPLE_INTERVAL
    ) {
        return;
    }

    lastExpressionSample =
        now;

    const name =
        expression.name;

    if (
        Object.prototype.hasOwnProperty.call(
            expressionCounts,
            name
        )
    ) {

        expressionCounts[name]++;
    } else {

        expressionCounts.Other++;
    }

    expressionHistory.push({

        timestamp: now,

        elapsedSeconds:
            interviewStartTime
                ? Math.floor(
                    (now -
                        interviewStartTime) /
                    1000
                )
                : 0,

        expression: name,

        confidence:
            expression.confidence,

        faceDetected:
            currentFaceDetected,

        smile:
            Number(
                Math.max(
                    blendshapes.mouthSmileLeft || 0,
                    blendshapes.mouthSmileRight || 0
                ).toFixed(3)
            ),

        eyeBlink:
            Number(
                (
                    (
                        blendshapes.eyeBlinkLeft || 0
                    ) +
                    (
                        blendshapes.eyeBlinkRight || 0
                    )
                ).toFixed(3)
            )
    });

    updateExpressionSummary();
}


/* =========================================================
   EXPRESSION SUMMARY
========================================================= */

function updateExpressionSummary() {

    const total =
        Object.values(
            expressionCounts
        ).reduce(
            (sum, value) =>
                sum + value,
            0
        );

    if (!total) {
        return;
    }

    const percent =
        name => {

            return Math.round(
                (
                    expressionCounts[name] /
                    total
                ) * 100
            );
        };

    if (neutralPercent) {
        neutralPercent.textContent =
            `${percent("Neutral")}%`;
    }

    if (happyPercent) {
        happyPercent.textContent =
            `${percent("Happy")}%`;
    }

    if (surprisedPercent) {
        surprisedPercent.textContent =
            `${percent("Surprised")}%`;
    }

    if (sadPercent) {
        sadPercent.textContent =
            `${percent("Sad")}%`;
    }

    if (angryPercent) {
        angryPercent.textContent =
            `${percent("Angry")}%`;
    }

    if (otherPercent) {
        otherPercent.textContent =
            `${percent("Other")}%`;
    }
}


/* =========================================================
   SPEECH RECOGNITION
========================================================= */

function setupSpeechRecognition() {

    const SpeechRecognition =
        window.SpeechRecognition ||
        window.webkitSpeechRecognition;

    if (!SpeechRecognition) {

        console.warn(
            "Speech recognition is not supported."
        );

        recognitionSupported =
            false;

        if (recordingStatus) {

            recordingStatus.textContent =
                "Speech recognition unavailable";
        }

        return;
    }

    recognitionSupported =
        true;

    recognition =
        new SpeechRecognition();

    recognition.continuous =
        true;

    recognition.interimResults =
        true;

    recognition.lang =
        "en-US";


    recognition.onstart = () => {

        isListening = true;

        if (recordingStatus) {

            recordingStatus.textContent =
                "Listening...";
        }

        if (listeningText) {

            listeningText.textContent =
                "Listening";
        }

        startListeningProgress();

        resetSilenceTimer();
    };


    recognition.onresult =
        event => {

            let finalText = "";
            let interimText = "";

            for (
                let i = event.resultIndex;
                i < event.results.length;
                i++
            ) {

                const transcript =
                    event.results[i][0]
                        .transcript;

                if (
                    event.results[i].isFinal
                ) {

                    finalText +=
                        transcript + " ";

                } else {

                    interimText +=
                        transcript;
                }
            }

            if (finalText) {

                finalTranscript +=
                    finalText;
            }

            interimTranscript =
                interimText;

            currentAnswer =
                (
                    finalTranscript +
                    interimTranscript
                ).trim();

            if (answerTranscript) {

                answerTranscript.textContent =
                    currentAnswer ||
                    "Listening...";
            }

            resetSilenceTimer();
        };


    recognition.onerror =
        event => {

            console.warn(
                "Speech recognition error:",
                event.error
            );

            if (
                event.error ===
                "not-allowed"
            ) {

                recordingStatus.textContent =
                    "Microphone permission denied";
            }
        };


    recognition.onend = () => {

        isListening = false;

        stopListeningProgress();

        if (
            interviewStarted &&
            !interviewFinished &&
            !processingAnswer
        ) {

            /*
             * Chrome may stop continuous
             * recognition automatically.
             * Restart while the answer is
             * still being recorded.
             */

            try {

                recognition.start();

            } catch (error) {

                console.warn(
                    "Could not restart recognition."
                );
            }
        }
    };
}


/* =========================================================
   START LISTENING
========================================================= */

function beginListening() {

    if (
        !recognitionSupported ||
        !recognition
    ) {

        return;
    }

    finalTranscript = "";

    interimTranscript = "";

    currentAnswer = "";

    if (answerTranscript) {

        answerTranscript.textContent =
            "Listening...";
    }

    try {

        recognition.start();

    } catch (error) {

        console.warn(
            "Recognition already running."
        );
    }

    resetSilenceTimer();
}


/* =========================================================
   STOP LISTENING
========================================================= */

function stopListening() {

    if (silenceTimer) {

        clearTimeout(
            silenceTimer
        );

        silenceTimer = null;
    }

    stopListeningProgress();

    if (
        recognition &&
        isListening
    ) {

        try {

            recognition.stop();

        } catch (error) {

            console.warn(error);
        }
    }

    isListening = false;
}


/* =========================================================
   SILENCE TIMER
========================================================= */

function resetSilenceTimer() {

    if (silenceTimer) {

        clearTimeout(
            silenceTimer
        );
    }

    silenceTimer =
        setTimeout(() => {

            if (
                isListening &&
                !processingAnswer &&
                currentAnswer.trim()
            ) {

                submitCurrentAnswer();
            }

        }, 2500);
}


/* =========================================================
   LISTENING PROGRESS
========================================================= */

function startListeningProgress() {

    stopListeningProgress();

    let progress = 0;

    listeningProgressTimer =
        setInterval(() => {

            progress += 2;

            if (progress > 100) {
                progress = 0;
            }

            if (listeningProgress) {

                listeningProgress.style.width =
                    `${progress}%`;
            }

        }, 100);
}


function stopListeningProgress() {

    if (listeningProgressTimer) {

        clearInterval(
            listeningProgressTimer
        );

        listeningProgressTimer = null;
    }

    if (listeningProgress) {

        listeningProgress.style.width =
            "0%";
    }
}


/* =========================================================
   API — START INTERVIEW
========================================================= */

async function startInterviewAPI() {

    try {

        updateAutoStatus(
            "Preparing Interview",
            "Generating your first interview question..."
        );

        const response =
            await fetch(
                `${API_URL}/api/interview/start`,
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({

                        role:
                            interviewConfig.role,

                        skills:
                            interviewConfig.skills,

                        difficulty:
                            interviewConfig.difficulty,

                        totalQuestions:
                            interviewConfig.totalQuestions,

                        candidate:
                            interviewConfig.candidate ||
                            {},

                        experience:
                            interviewConfig.experience ||
                            [],

                        projects:
                            interviewConfig.projects ||
                            [],

                        resumeSummary:
                            interviewConfig.resumeSummary ||
                            "",

                        interviewFocus:
                            interviewConfig.interviewFocus ||
                            []
                    })
                }
            );

        if (!response.ok) {

            throw new Error(
                `Start interview failed: ${response.status}`
            );
        }

        const data =
            await response.json();

        console.log(
            "Interview start response:",
            data
        );

        const question =
            extractQuestion(data);

        if (!question) {

            throw new Error(
                "Backend did not return a question."
            );
        }

        currentQuestion =
            question;

        currentQuestionIndex =
            0;

        displayQuestion();

        interviewStarted =
            true;

        updateProgress();

        updateAutoStatus(
            "AI Interview Active",
            "Listen to the question and answer naturally."
        );

        await speakQuestion();

    } catch (error) {

        console.error(
            "Interview start error:",
            error
        );

        updateAutoStatus(
            "Interview Error",
            "Could not start the interview. Check the backend."
        );

        if (questionText) {

            questionText.textContent =
                "Unable to start interview. Please check the backend.";
        }
    }
}


/* =========================================================
   EXTRACT QUESTION
========================================================= */

function extractQuestion(data) {

    if (!data) {
        return "";
    }

    if (
        typeof data.question ===
        "string"
    ) {

        return data.question;
    }

    if (
        data.data &&
        typeof data.data.question ===
        "string"
    ) {

        return data.data.question;
    }

    if (
        data.result &&
        typeof data.result.question ===
        "string"
    ) {

        return data.result.question;
    }

    if (
        Array.isArray(data.questions) &&
        data.questions.length
    ) {

        return String(
            data.questions[0]
        );
    }

    return "";
}


/* =========================================================
   DISPLAY QUESTION
========================================================= */

function displayQuestion() {

    if (questionText) {

        questionText.textContent =
            currentQuestion;
    }

    if (questionNumber) {

        questionNumber.textContent =
            `${String(currentQuestionIndex + 1).padStart(2, "0")} / ${String(interviewConfig.totalQuestions).padStart(2, "0")}`;
    }

    if (answerTranscript) {

        answerTranscript.textContent =
            "Waiting for your response...";
    }

    finalTranscript = "";

    interimTranscript = "";

    currentAnswer = "";
}


/* =========================================================
   SPEAK QUESTION
========================================================= */

function speakQuestion() {

    return new Promise(resolve => {

        if (
            !window.speechSynthesis ||
            !currentQuestion
        ) {

            beginListening();

            resolve();

            return;
        }

        window.speechSynthesis.cancel();

        const utterance =
            new SpeechSynthesisUtterance(
                currentQuestion
            );

        utterance.rate =
            0.92;

        utterance.pitch =
            1;

        utterance.volume =
            1;

        utterance.onstart =
            () => {

                updateAutoStatus(
                    "AI Interviewer Speaking",
                    "Listen carefully to the question."
                );
            };

        utterance.onend =
            () => {

                updateAutoStatus(
                    "Your Turn",
                    "Answer the question naturally."
                );

                beginListening();

                resolve();
            };

        utterance.onerror =
            () => {

                beginListening();

                resolve();
            };

        window.speechSynthesis.speak(
            utterance
        );
    });
}


/* =========================================================
   SUBMIT ANSWER
========================================================= */

async function submitCurrentAnswer() {

    if (
        processingAnswer ||
        interviewFinished
    ) {
        return;
    }

    processingAnswer =
        true;

    stopListening();

    const answer =
        currentAnswer.trim();

    if (!answer) {

        processingAnswer =
            false;

        beginListening();

        return;
    }

    if (recordingStatus) {

        recordingStatus.textContent =
            "Analyzing answer...";
    }

    updateAutoStatus(
        "AI Analyzing",
        "Analyzing your response..."
    );

    try {

        const response =
            await fetch(
                `${API_URL}/api/interview/analyze-answer`,
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({

                        role:
                            interviewConfig.role,

                        question:
                            currentQuestion,

                        answer:
                            answer,

                        questionNumber:
                            currentQuestionIndex + 1,

                        skills:
                            interviewConfig.skills,

                        candidate:
                            interviewConfig.candidate ||
                            {},

                        experience:
                            interviewConfig.experience ||
                            [],

                        projects:
                            interviewConfig.projects ||
                            [],

                        resumeSummary:
                            interviewConfig.resumeSummary ||
                            ""
                    })
                }
            );

        if (!response.ok) {

            throw new Error(
                `Analysis failed: ${response.status}`
            );
        }

        const data =
            await response.json();

        console.log(
            "Answer analysis:",
            data
        );

        const analysis =
            extractAnalysis(data);

        latestAnalysis =
            analysis;

        analysisResults.push({

            questionNumber:
                currentQuestionIndex + 1,

            question:
                currentQuestion,

            answer:
                answer,

            analysis:
                analysis
        });

        displayAnalysis(
            analysis
        );

        if (
            currentQuestionIndex + 1 >=
            interviewConfig.totalQuestions
        ) {

            finishInterview();

            return;
        }

        currentQuestionIndex++;

        updateProgress();

        await requestNextQuestion();

    } catch (error) {

        console.error(
            "Answer analysis error:",
            error
        );

        /*
         * Even if analysis fails,
         * continue the interview.
         */

        if (
            currentQuestionIndex + 1 >=
            interviewConfig.totalQuestions
        ) {

            finishInterview();

            return;
        }

        currentQuestionIndex++;

        updateProgress();

        await requestNextQuestion();

    } finally {

        processingAnswer =
            false;
    }
}


/* =========================================================
   EXTRACT ANALYSIS
========================================================= */

function extractAnalysis(data) {

    const source =
        data?.analysis ||
        data?.result ||
        data ||
        {};

    return {

        relevance_score:
            source.relevance_score ??
            source.relevance ??
            null,

        consistency_score:
            source.consistency_score ??
            source.consistency ??
            null,

        deception_indicator_score:
            source.deception_indicator_score ??
            source.deception_indicator ??
            source.deception_score ??
            null,

        indicators:
            Array.isArray(
                source.indicators
            )
                ? source.indicators
                : [],

        feedback:
            source.feedback ||
            source.message ||
            ""
    };
}


/* =========================================================
   NEXT QUESTION
========================================================= */

async function requestNextQuestion() {

    updateAutoStatus(
        "Preparing Next Question",
        "The AI interviewer is preparing your next question..."
    );

    try {

        const response =
            await fetch(
                `${API_URL}/api/interview/next-question`,
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({

                        role:
                            interviewConfig.role,

                        skills:
                            interviewConfig.skills,

                        difficulty:
                            interviewConfig.difficulty,

                        questionNumber:
                            currentQuestionIndex + 1,

                        totalQuestions:
                            interviewConfig.totalQuestions,

                        previousQuestions:
                            analysisResults.map(
                                item =>
                                    item.question
                            ),

                        previousAnswers:
                            analysisResults.map(
                                item =>
                                    item.answer
                            ),

                        previousAnalysis:
                            analysisResults.map(
                                item =>
                                    item.analysis
                            ),

                        candidate:
                            interviewConfig.candidate ||
                            {},

                        experience:
                            interviewConfig.experience ||
                            [],

                        projects:
                            interviewConfig.projects ||
                            [],

                        resumeSummary:
                            interviewConfig.resumeSummary ||
                            ""
                    })
                }
            );

        if (!response.ok) {

            throw new Error(
                `Next question failed: ${response.status}`
            );
        }

        const data =
            await response.json();

        const question =
            extractQuestion(data);

        if (!question) {

            throw new Error(
                "No next question returned."
            );
        }

        currentQuestion =
            question;

        displayQuestion();

        updateAutoStatus(
            "Next Question",
            "Listen to the next question."
        );

        await speakQuestion();

    } catch (error) {

        console.error(
            "Next question error:",
            error
        );

        /*
         * Fallback question so the
         * interview does not completely stop.
         */

        currentQuestion =
            generateFallbackQuestion();

        displayQuestion();

        await speakQuestion();
    }
}


/* =========================================================
   FALLBACK QUESTION
========================================================= */

function generateFallbackQuestion() {

    const skills =
        interviewConfig.skills || [];

    const skill =
        skills[
            currentQuestionIndex %
            skills.length
        ] ||
        "your technical skills";

    const questions = [

        `Can you explain your experience with ${skill}?`,

        `Tell me about a project where you used ${skill}.`,

        `What challenges have you faced while working with ${skill}?`,

        `How would you improve your knowledge of ${skill}?`,

        `Can you describe a real-world problem that you could solve using ${skill}?`
    ];

    return questions[
        currentQuestionIndex %
        questions.length
    ];
}


/* =========================================================
   DISPLAY ANALYSIS
========================================================= */

function displayAnalysis(
    analysis
) {

    if (relevanceScore) {

        relevanceScore.textContent =
            formatScore(
                analysis.relevance_score
            );
    }

    if (consistencyScore) {

        consistencyScore.textContent =
            formatScore(
                analysis.consistency_score
            );
    }

    if (deceptionScore) {

        deceptionScore.textContent =
            formatScore(
                analysis.deception_indicator_score
            );
    }

    if (analysisIndicators) {

        if (
            Array.isArray(
                analysis.indicators
            ) &&
            analysis.indicators.length
        ) {

            analysisIndicators.innerHTML =
                analysis.indicators
                    .map(
                        item =>
                            `<div>• ${escapeHTML(String(item))}</div>`
                    )
                    .join("");

        } else {

            analysisIndicators.textContent =
                "No specific indicators returned.";
        }
    }

    if (analysisFeedback) {

        analysisFeedback.textContent =
            analysis.feedback ||
            "No additional feedback returned.";
    }

    if (analysisSection) {

        analysisSection.style.display =
            "block";
    }
}


/* =========================================================
   SCORE FORMAT
========================================================= */

function formatScore(value) {

    if (
        value === null ||
        value === undefined ||
        value === ""
    ) {

        return "--";
    }

    const numeric =
        Number(value);

    if (Number.isNaN(numeric)) {

        return String(value);
    }

    return `${Math.round(numeric)}%`;
}


/* =========================================================
   PROGRESS
========================================================= */

function updateProgress() {

    const total =
        interviewConfig.totalQuestions;

    const completed =
        currentQuestionIndex;

    const percent =
        Math.round(
            (
                completed /
                total
            ) * 100
        );

    if (interviewProgress) {

        interviewProgress.style.width =
            `${percent}%`;
    }

    if (progressText) {

        progressText.textContent =
            `${percent}%`;
    }
}


/* =========================================================
   STATUS
========================================================= */

function updateAutoStatus(
    title,
    text
) {

    if (autoStatusTitle) {

        autoStatusTitle.textContent =
            title;
    }

    if (autoStatusText) {

        autoStatusText.textContent =
            text;
    }
}


/* =========================================================
   REPEAT QUESTION
========================================================= */

if (repeatQuestion) {

    repeatQuestion.addEventListener(
        "click",
        async () => {

            if (interviewFinished) {
                return;
            }

            stopListening();

            await speakQuestion();
        }
    );
}


/* =========================================================
   END INTERVIEW
========================================================= */

if (endInterview) {

    endInterview.addEventListener(
        "click",
        () => {

            if (
                confirm(
                    "Are you sure you want to end the interview?"
                )
            ) {

                finishInterview();
            }
        }
    );
}


/* =========================================================
   FINISH INTERVIEW
========================================================= */

function finishInterview() {

    if (interviewFinished) {
        return;
    }

    interviewFinished =
        true;

    interviewStarted =
        false;

    stopListening();

    stopTimer();

    stopCamera();

    if (
        window.speechSynthesis
    ) {

        window.speechSynthesis.cancel();
    }

    if (expressionObservationStatus) {

        expressionObservationStatus.textContent =
            "Completed";
    }

    if (progressText) {

        progressText.textContent =
            "100%";
    }

    if (interviewProgress) {

        interviewProgress.style.width =
            "100%";
    }

    updateExpressionSummary();

    updateAutoStatus(
        "Interview Complete",
        "Your interview analysis has been generated."
    );

    if (recordingStatus) {

        recordingStatus.textContent =
            "Interview completed";
    }

    showCompletionOverlay();

    console.log(
        "Interview finished."
    );
}


/* =========================================================
   COMPLETION OVERLAY
========================================================= */

function showCompletionOverlay() {

    if (!completionOverlay) {
        return;
    }

    completionOverlay.classList.add(
        "active"
    );
}


if (closeCompletion) {

    closeCompletion.addEventListener(
        "click",
        () => {

            completionOverlay.classList.remove(
                "active"
            );

            if (analysisSection) {

                analysisSection.scrollIntoView({
                    behavior: "smooth"
                });
            }
        }
    );
}


/* =========================================================
   PDF REPORT
========================================================= */

async function generatePDFReport() {

    try {

        if (
            !window.jspdf ||
            !window.jspdf.jsPDF
        ) {

            alert(
                "PDF library is not loaded. Please check your internet connection and reload the page."
            );

            return;
        }

        const {
            jsPDF
        } = window.jspdf;

        const doc =
            new jsPDF({
                orientation: "portrait",
                unit: "mm",
                format: "a4"
            });

        const pageWidth =
            doc.internal.pageSize.getWidth();

        const pageHeight =
            doc.internal.pageSize.getHeight();

        const margin = 18;

        let y = 20;


        /* =================================================
           HELPERS
        ================================================= */

        function addPageIfNeeded(
            requiredHeight = 10
        ) {

            if (
                y + requiredHeight >
                pageHeight - 18
            ) {

                doc.addPage();

                y = 20;
            }
        }


        function addText(
            text,
            x,
            fontSize = 10,
            style = "normal",
            maxWidth = pageWidth - margin * 2
        ) {

            doc.setFont(
                "helvetica",
                style
            );

            doc.setFontSize(
                fontSize
            );

            const lines =
                doc.splitTextToSize(
                    String(text || ""),
                    maxWidth
                );

            doc.text(
                lines,
                x,
                y
            );

            y +=
                lines.length *
                (fontSize * 0.42);

            y += 3;

            return lines;
        }


        function addHeading(
            text
        ) {

            addPageIfNeeded(
                15
            );

            doc.setFont(
                "helvetica",
                "bold"
            );

            doc.setFontSize(
                15
            );

            doc.text(
                text,
                margin,
                y
            );

            y += 8;

            doc.setDrawColor(
                210,
                215,
                225
            );

            doc.line(
                margin,
                y,
                pageWidth - margin,
                y
            );

            y += 7;
        }


        function addSmallLabel(
            text
        ) {

            doc.setFont(
                "helvetica",
                "bold"
            );

            doc.setFontSize(
                8
            );

            doc.text(
                text.toUpperCase(),
                margin,
                y
            );

            y += 5;
        }


        /* =================================================
           HEADER
        ================================================= */

        doc.setFont(
            "helvetica",
            "bold"
        );

        doc.setFontSize(
            23
        );

        doc.text(
            "AI Interview Intelligence",
            margin,
            y
        );

        y += 9;

        doc.setFont(
            "helvetica",
            "normal"
        );

        doc.setFontSize(
            10
        );

        doc.text(
            "Interview Analysis Report",
            margin,
            y
        );

        y += 12;

        doc.setDrawColor(
            77,
            168,
            255
        );

        doc.setLineWidth(
            0.8
        );

        doc.line(
            margin,
            y,
            pageWidth - margin,
            y
        );

        y += 10;


        /* =================================================
           CANDIDATE INFORMATION
        ================================================= */

        addHeading(
            "Candidate Information"
        );

        const candidate =
            interviewConfig.candidate ||
            {};

        const candidateName =
            candidate.name ||
            "Candidate";

        const candidateEmail =
            candidate.email ||
            "Not provided";

        const candidatePhone =
            candidate.phone ||
            "Not provided";

        addSmallLabel(
            "Name"
        );

        addText(
            candidateName,
            margin,
            10
        );

        addSmallLabel(
            "Email"
        );

        addText(
            candidateEmail,
            margin,
            10
        );

        addSmallLabel(
            "Phone"
        );

        addText(
            candidatePhone,
            margin,
            10
        );

        addSmallLabel(
            "Role"
        );

        addText(
            interviewConfig.role ||
            "Software Developer",
            margin,
            10
        );

        addSmallLabel(
            "Interview Duration"
        );

        addText(
            getInterviewDuration(),
            margin,
            10
        );

        addSmallLabel(
            "Questions"
        );

        addText(
            String(
                interviewConfig.totalQuestions
            ),
            margin,
            10
        );


        /* =================================================
           INTERVIEW SCORES
        ================================================= */

        addHeading(
            "Interview Performance"
        );

        addText(
            `Relevance Score: ${formatScore(latestAnalysis.relevance_score)}`,
            margin,
            11,
            "bold"
        );

        addText(
            `Consistency Score: ${formatScore(latestAnalysis.consistency_score)}`,
            margin,
            11,
            "bold"
        );

        addText(
            `Potential Indicator Score: ${formatScore(latestAnalysis.deception_indicator_score)}`,
            margin,
            11,
            "bold"
        );


        /* =================================================
           FACIAL EXPRESSION
        ================================================= */

        addHeading(
            "Facial Expression Analysis"
        );

        const expressionTotal =
            Object.values(
                expressionCounts
            ).reduce(
                (sum, value) =>
                    sum + value,
                0
            );

        if (expressionTotal > 0) {

            const expressions = [
                "Neutral",
                "Happy",
                "Surprised",
                "Sad",
                "Angry",
                "Other"
            ];

            expressions.forEach(
                expression => {

                    const percentage =
                        Math.round(
                            (
                                expressionCounts[
                                    expression
                                ] /
                                expressionTotal
                            ) * 100
                        );

                    addText(
                        `${expression}: ${percentage}%`,
                        margin,
                        10
                    );
                }
            );

        } else {

            addText(
                "No facial-expression observations were recorded.",
                margin,
                10
            );
        }

        addText(
            `Face observations recorded: ${expressionHistory.length}`,
            margin,
            10
        );


        /* =================================================
           QUESTIONS
        ================================================= */

        addHeading(
            "Question & Answer Analysis"
        );

        if (
            analysisResults.length === 0
        ) {

            addText(
                "No completed answer analysis was available.",
                margin,
                10
            );

        } else {

            analysisResults.forEach(
                item => {

                    addPageIfNeeded(
                        35
                    );

                    doc.setFont(
                        "helvetica",
                        "bold"
                    );

                    doc.setFontSize(
                        11
                    );

                    doc.text(
                        `Question ${item.questionNumber}`,
                        margin,
                        y
                    );

                    y += 7;

                    doc.setFont(
                        "helvetica",
                        "normal"
                    );

                    doc.setFontSize(
                        9
                    );

                    const qLines =
                        doc.splitTextToSize(
                            `Q: ${item.question}`,
                            pageWidth -
                            margin * 2
                        );

                    doc.text(
                        qLines,
                        margin,
                        y
                    );

                    y +=
                        qLines.length *
                        4;

                    y += 3;

                    const aLines =
                        doc.splitTextToSize(
                            `Answer: ${item.answer}`,
                            pageWidth -
                            margin * 2
                        );

                    addPageIfNeeded(
                        aLines.length * 4 + 10
                    );

                    doc.text(
                        aLines,
                        margin,
                        y
                    );

                    y +=
                        aLines.length *
                        4;

                    y += 4;

                    const analysis =
                        item.analysis ||
                        {};

                    const feedback =
                        analysis.feedback ||
                        "No feedback available.";

                    const fLines =
                        doc.splitTextToSize(
                            `AI Feedback: ${feedback}`,
                            pageWidth -
                            margin * 2
                        );

                    addPageIfNeeded(
                        fLines.length * 4 + 10
                    );

                    doc.text(
                        fLines,
                        margin,
                        y
                    );

                    y +=
                        fLines.length *
                        4;

                    y += 4;

                    doc.setDrawColor(
                        220,
                        224,
                        232
                    );

                    doc.line(
                        margin,
                        y,
                        pageWidth - margin,
                        y
                    );

                    y += 8;
                }
            );
        }


        /* =================================================
           OBSERVED INDICATORS
        ================================================= */

        addHeading(
            "Observed Indicators"
        );

        const indicators =
            latestAnalysis.indicators ||
            [];

        if (
            Array.isArray(indicators) &&
            indicators.length
        ) {

            indicators.forEach(
                indicator => {

                    addText(
                        `• ${indicator}`,
                        margin,
                        10
                    );
                }
            );

        } else {

            addText(
                "No specific indicators were returned.",
                margin,
                10
            );
        }


        /* =================================================
           OVERALL FEEDBACK
        ================================================= */

        addHeading(
            "Overall AI Feedback"
        );

        addText(
            latestAnalysis.feedback ||
            "No overall feedback was returned.",
            margin,
            10
        );


        /* =================================================
           FACIAL EXPRESSION TIMELINE
        ================================================= */

        addHeading(
            "Facial Expression Observations"
        );

        if (
            expressionHistory.length
        ) {

            expressionHistory
                .slice(
                    0,
                    40
                )
                .forEach(
                    observation => {

                        const time =
                            formatSeconds(
                                observation.elapsedSeconds
                            );

                        addText(
                            `${time} — ${observation.expression} (${observation.confidence}% confidence)`,
                            margin,
                            9
                        );
                    }
                );

            if (
                expressionHistory.length >
                40
            ) {

                addText(
                    `Showing the first 40 observations out of ${expressionHistory.length}.`,
                    margin,
                    8
                );
            }

        } else {

            addText(
                "No expression timeline was recorded.",
                margin,
                9
            );
        }


        /* =================================================
           DISCLAIMER
        ================================================= */

        addHeading(
            "Important Note"
        );

        addText(
            "Facial expressions and other behavioral signals are contextual observations. They should not be interpreted as proof of deception, truthfulness, intent, or personality. Expression classification can also be affected by lighting, camera quality, facial position, individual differences, and model limitations.",
            margin,
            9
        );


        /* =================================================
           FOOTER
        ================================================= */

        const pageCount =
            doc.internal.getNumberOfPages();

        for (
            let page = 1;
            page <= pageCount;
            page++
        ) {

            doc.setPage(
                page
            );

            doc.setFont(
                "helvetica",
                "normal"
            );

            doc.setFontSize(
                8
            );

            doc.setTextColor(
                120,
                125,
                135
            );

            doc.text(
                `AI Interview Intelligence • Page ${page} of ${pageCount}`,
                margin,
                pageHeight - 10
            );
        }


        /* =================================================
           SAVE
        ================================================= */

        const safeName =
            String(
                candidateName
            )
                .replace(
                    /[^a-z0-9]/gi,
                    "_"
                )
                .replace(
                    /_+/g,
                    "_"
                );

        const fileName =
            `AI_Interview_Report_${safeName}.pdf`;

        doc.save(
            fileName
        );

    } catch (error) {

        console.error(
            "PDF generation error:",
            error
        );

        alert(
            "Could not generate the PDF report. Please try again."
        );
    }
}


/* =========================================================
   FORMAT SECONDS
========================================================= */

function formatSeconds(
    seconds
) {

    const value =
        Number(seconds) || 0;

    const minutes =
        Math.floor(
            value / 60
        );

    const remaining =
        value % 60;

    return `${String(minutes).padStart(2, "0")}:${String(remaining).padStart(2, "0")}`;
}


/* =========================================================
   PDF BUTTON EVENTS
========================================================= */

if (downloadReport) {

    downloadReport.addEventListener(
        "click",
        generatePDFReport
    );
}


if (completionDownload) {

    completionDownload.addEventListener(
        "click",
        generatePDFReport
    );
}


/* =========================================================
   HTML ESCAPE
========================================================= */

function escapeHTML(
    value
) {

    return value
        .replace(
            /&/g,
            "&amp;"
        )
        .replace(
            /</g,
            "&lt;"
        )
        .replace(
            />/g,
            "&gt;"
        )
        .replace(
            /"/g,
            "&quot;"
        )
        .replace(
            /'/g,
            "&#039;"
        );
}


/* =========================================================
   INITIALIZE
========================================================= */

async function initializeInterview() {

    console.log(
        "Initializing AI interview..."
    );

    loadInterviewConfig();

    updateProgress();

    updateExpressionSummary();

    if (analysisSection) {

        /*
         * Keep analysis available because
         * it also contains the PDF report.
         */

        analysisSection.style.display =
            "block";
    }

    startTimer();

    startCamera();

    setupSpeechRecognition();

    await startInterviewAPI();
}


/* =========================================================
   PAGE LOAD
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    () => {

        initializeInterview();

    }
);


/* =========================================================
   CLEANUP
========================================================= */

window.addEventListener(
    "beforeunload",
    () => {

        stopListening();

        stopTimer();

        stopCamera();

        if (
            window.speechSynthesis
        ) {

            window.speechSynthesis.cancel();
        }
    }
);