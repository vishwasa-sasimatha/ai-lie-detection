"use strict";

/* =========================================================
   AI INTERVIEW INTELLIGENCE
   COMPLETE INTERVIEW CONTROLLER
========================================================= */

const API_URL = "http://127.0.0.1:8000";

const START_ENDPOINT =
    `${API_URL}/api/interview/start`;

const NEXT_ENDPOINT =
    `${API_URL}/api/interview/next-question`;

const ANALYZE_ENDPOINT =
    `${API_URL}/api/interview/analyze-answer`;

const SUMMARY_ENDPOINT =
    `${API_URL}/api/interview/expression-summary`;

const COMPLETE_ENDPOINT =
    `${API_URL}/api/interview/complete`;


/* =========================================================
   INTERVIEW CONFIG
========================================================= */

let interviewConfig = {

    role: "Software Developer",

    skills: [
        "Python",
        "JavaScript",
        "SQL"
    ],

    difficulty: "medium",

    totalQuestions: 5,

    candidate: {},

    experience: [],

    projects: [],

    resumeSummary: "",

    interviewFocus: []

};


/* =========================================================
   LOAD CONFIG
========================================================= */

function loadInterviewConfig() {

    try {

        const saved =
            localStorage.getItem(
                "aiInterviewConfig"
            );

        if (!saved) {
            return;
        }

        const parsed =
            JSON.parse(saved);

        interviewConfig = {

            ...interviewConfig,

            ...parsed,

            role:
                parsed.role ||
                "Software Developer",

            skills:
                Array.isArray(parsed.skills)
                    ? parsed.skills
                    : interviewConfig.skills,

            totalQuestions:
                Number(parsed.totalQuestions) || 5,

            interviewFocus:
                Array.isArray(parsed.interviewFocus)
                    ? parsed.interviewFocus
                    : [],

            candidate:
                parsed.candidate || {},

            experience:
                Array.isArray(parsed.experience)
                    ? parsed.experience
                    : [],

            projects:
                Array.isArray(parsed.projects)
                    ? parsed.projects
                    : [],

            resumeSummary:
                parsed.resumeSummary || ""

        };

        console.log(
            "Interview configuration:",
            interviewConfig
        );

    } catch (error) {

        console.error(
            "Configuration error:",
            error
        );

    }

}


/* =========================================================
   STATE
========================================================= */

let questions = [];

let previousQuestions = [];

let previousAnswers = [];

let analysisHistory = [];

let interviewId = null;

let currentQuestionIndex = 0;

let interviewRunning = false;

let processingAnswer = false;

let answerText = "";

let questionStartTime = 0;

let timerSeconds = 0;

let timerInterval = null;

let recognition = null;

let isListening = false;

let silenceTimer = null;

let faceUIInterval = null;

let mediaStream = null;

let lastSpeechTime = 0;

let interviewAutoEnded = false;

let applicationSwitchCount = 0;

let applicationSwitchEvents = [];

let finishingInterview = false;
/* =========================================================
   DOM ELEMENTS
========================================================= */

const video =
    document.getElementById(
        "candidateVideo"
    );

const faceCanvas =
    document.getElementById(
        "faceCanvas"
    );

const cameraPlaceholder =
    document.getElementById(
        "cameraPlaceholder"
    );

const cameraStatus =
    document.getElementById(
        "cameraStatus"
    );

const questionText =
    document.getElementById(
        "questionText"
    );

const questionNumber =
    document.getElementById(
        "questionNumber"
    );

const transcript =
    document.getElementById(
        "answerTranscript"
    );

const recordingStatus =
    document.getElementById(
        "recordingStatus"
    );

const timer =
    document.getElementById(
        "timer"
    );

const progressBar =
    document.getElementById(
        "interviewProgress"
    );

const progressText =
    document.getElementById(
        "progressText"
    );

const listeningText =
    document.getElementById(
        "listeningText"
    );

const listeningProgress =
    document.getElementById(
        "listeningProgress"
    );

const autoStatusTitle =
    document.getElementById(
        "autoStatusTitle"
    );

const autoStatusText =
    document.getElementById(
        "autoStatusText"
    );

const repeatQuestion =
    document.getElementById(
        "repeatQuestion"
    );

const speakButton =
    document.getElementById(
        "speakButton"
    );

const endInterview =
    document.getElementById(
        "endInterview"
    );

const completionOverlay =
    document.getElementById(
        "completionOverlay"
    );

const closeCompletion =
    document.getElementById(
        "closeCompletion"
    );

const completionDownload =
    document.getElementById(
        "completionDownload"
    );

const downloadReport =
    document.getElementById(
        "downloadReport"
    );


/* =========================================================
   HELPERS
========================================================= */

function safeNumber(value) {

    const number =
        Number(value);

    return Number.isFinite(number)
        ? number
        : 0;

}


function clamp(
    value,
    min = 0,
    max = 100
) {

    return Math.max(
        min,
        Math.min(
            max,
            safeNumber(value)
        )
    );

}


function setText(
    element,
    value
) {

    if (element) {
        element.textContent =
            value ?? "";
    }

}


function escapeHTML(value) {

    return String(value)

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
   CAMERA
========================================================= */

async function startCamera() {

    try {

        if (
            !navigator.mediaDevices ||
            !navigator.mediaDevices.getUserMedia
        ) {

            throw new Error(
                "Camera API unavailable."
            );

        }

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


        if (video) {

            video.srcObject =
                mediaStream;

            video.muted =
                true;

            video.autoplay =
                true;

            video.playsInline =
                true;

            video.style.display =
                "block";

            try {

                await video.play();

            } catch (error) {

                console.warn(
                    "Video play warning:",
                    error
                );

            }

        }


        if (cameraPlaceholder) {

            cameraPlaceholder.style.display =
                "none";

        }


        setText(
            cameraStatus,
            "Camera Active"
        );


        await startFaceDetection();


        console.log(
            "Camera started successfully."
        );


    } catch (error) {

        console.error(
            "Camera error:",
            error
        );

        setText(
            cameraStatus,
            "Camera unavailable"
        );

        setText(
            autoStatusText,
            "Camera unavailable. Interview can continue without camera monitoring."
        );

    }
    if (window.ObjectDetection) {
    console.log("Starting object detection...");

    await window.ObjectDetection.start({
        video: document.getElementById("candidateVideo"),

        onAlert: (event) => {
            console.log("Integrity alert:", event);
        }
    });
} else {
    console.error("ObjectDetection is not loaded!");
}

}


/* =========================================================
   FACE DETECTION
========================================================= */

async function startFaceDetection() {

    if (!window.FaceAnalysis) {

        console.warn(
            "FaceAnalysis is not loaded."
        );

        return;

    }


    try {

        if (
            typeof FaceAnalysis.reset ===
            "function"
        ) {

            FaceAnalysis.reset();

        }


        if (
            typeof FaceAnalysis.initialize ===
            "function"
        ) {

            const initialized =
                await FaceAnalysis.initialize();

            if (!initialized) {

                console.warn(
                    "FaceAnalysis initialization failed."
                );

                return;

            }

        }


        if (
            typeof FaceAnalysis.start ===
            "function"
        ) {

            await FaceAnalysis.start(
                video
            );

        }


        startFaceUI();


    } catch (error) {

        console.error(
            "Face monitoring error:",
            error
        );

    }

}


/* =========================================================
   FACE UI
========================================================= */

function startFaceUI() {

    stopFaceUI();

    updateFaceUI();

    faceUIInterval =
        setInterval(
            updateFaceUI,
            500
        );

}


function stopFaceUI() {

    if (faceUIInterval) {

        clearInterval(
            faceUIInterval
        );

        faceUIInterval =
            null;

    }

}


/* =========================================================
   GET FACE DATA
========================================================= */

function getFaceData() {

    if (
        window.FaceAnalysis &&
        typeof FaceAnalysis.getCurrent ===
        "function"
    ) {

        try {

            const data =
                FaceAnalysis.getCurrent() ||
                {};


            const detected =
                Boolean(
                    data.detected ??
                    data.face_detected ??
                    false
                );


            const confidence =
                clamp(
                    data.confidence ??
                    data.faceConfidence ??
                    0
                );


            const eyeActivity =
                clamp(
                    data.eyeActivity ??
                    data.eye_activity ??
                    0
                );


            const faceStability =
                clamp(
                    data.faceStability ??
                    data.face_stability ??
                    confidence
                );


            return {

                face_detected:
                    detected,

                confidence:
                    confidence,

                eye_activity:
                    eyeActivity,

                face_stability:
                    faceStability,

                expression:
                    data.expression ||
                    "Observed"

            };


        } catch (error) {

            console.warn(
                "Face data error:",
                error
            );

        }

    }


    return {

        face_detected:
            false,

        confidence:
            0,

        eye_activity:
            0,

        face_stability:
            0,

        expression:
            "Unknown"

    };

}


/* =========================================================
   FACE UI UPDATE
========================================================= */

function updateFaceUI() {

    const data =
        getFaceData();


    const faceSignal =
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

    const status =
        document.getElementById(
            "faceDetectionStatus"
        );

    const badge =
        document.getElementById(
            "expressionBadge"
        );

    const badgeText =
        document.getElementById(
            "currentExpression"
        );


    if (data.face_detected) {

        setText(
            faceSignal,
            "Detected"
        );

        setText(
            confidence,
            `${Math.round(
                data.confidence
            )}%`
        );

        setText(
            eye,
            `${Math.round(
                data.eye_activity
            )}%`
        );

        setText(
            monitoring,
            "Monitoring"
        );

        setText(
            status,
            "● MONITORING"
        );

        if (badgeText) {

            badgeText.textContent =
                "Behavioral Monitoring";

        }

        if (badge) {

            badge.classList.add(
                "active"
            );

        }

    } else {

        setText(
            faceSignal,
            "Not Detected"
        );

        setText(
            confidence,
            "0%"
        );

        setText(
            eye,
            "Waiting"
        );

        setText(
            monitoring,
            "Waiting"
        );

        setText(
            status,
            "● SEARCHING"
        );

        if (badgeText) {

            badgeText.textContent =
                "Face Not Detected";

        }

        if (badge) {

            badge.classList.remove(
                "active"
            );

        }

    }

}


/* =========================================================
   TIMER
========================================================= */

function startTimer() {

    clearInterval(
        timerInterval
    );

    timerSeconds =
        0;


    setText(
        timer,
        "00:00"
    );


    timerInterval =
        setInterval(
            () => {

                timerSeconds++;


                const hours =
                    Math.floor(
                        timerSeconds / 3600
                    );


                const minutes =
                    Math.floor(
                        (timerSeconds % 3600) / 60
                    );


                const seconds =
                    timerSeconds % 60;


                if (hours > 0) {

                    setText(
                        timer,
                        `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
                    );

                } else {

                    setText(
                        timer,
                        `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
                    );

                }

            },
            1000
        );

}


/* =========================================================
   PROGRESS
========================================================= */

function updateProgress() {

    const total =
        Math.max(
            1,
            interviewConfig.totalQuestions
        );


    const current =
        Math.min(
            currentQuestionIndex + 1,
            total
        );


    const percentage =
        Math.round(
            (
                current /
                total
            ) * 100
        );


    if (progressBar) {

        progressBar.style.width =
            `${percentage}%`;

    }


    setText(
        progressText,
        `${current} / ${total}`
    );

}


/* =========================================================
   LOAD QUESTION
========================================================= */

function loadQuestion() {

    if (
        !questions.length ||
        currentQuestionIndex >=
        questions.length
    ) {

        return;

    }


    const question =
        questions[
            currentQuestionIndex
        ];


    setText(
        questionText,
        question
    );


    setText(
        questionNumber,
        String(
            currentQuestionIndex + 1
        ).padStart(
            2,
            "0"
        )
    );


    questionStartTime =
        Date.now();


    answerText =
        "";


    setText(
        transcript,
        "Listening for your answer..."
    );


    setText(
        recordingStatus,
        "Waiting"
    );


    setText(
        autoStatusTitle,
        "AI Interviewer"
    );


    setText(
        autoStatusText,
        "Preparing your question..."
    );


    updateProgress();

}


/* =========================================================
   SPEAK QUESTION
========================================================= */

function speakQuestion() {

    const text =
        questionText
            ? questionText.textContent.trim()
            : "";


    if (
        !text ||
        text === "Loading..."
    ) {

        return;

    }


    if (
        !("speechSynthesis" in window)
    ) {

        beginAutomaticListening();

        return;

    }


    window.speechSynthesis.cancel();


    const speech =
        new SpeechSynthesisUtterance(
            text
        );


    speech.rate =
        0.9;

    speech.pitch =
        1;

    speech.volume =
        1;


    setText(
        autoStatusTitle,
        "AI Interviewer"
    );


    setText(
        autoStatusText,
        "Speaking question..."
    );


    speech.onend =
        () => {

            if (!interviewRunning) {
                return;
            }


            setTimeout(
                beginAutomaticListening,
                500
            );

        };


    window.speechSynthesis.speak(
        speech
    );

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
            "Speech recognition unavailable."
        );

        return false;

    }


    recognition =
        new SpeechRecognition();


    recognition.continuous =
        true;

    recognition.interimResults =
        true;

    recognition.lang =
        "en-US";


    recognition.onstart =
        () => {

            isListening =
                true;

            lastSpeechTime =
                Date.now();


            setText(
                recordingStatus,
                "Listening..."
            );


            setText(
                autoStatusText,
                "Speak naturally. The AI will detect when you finish."
            );


            setSignal(
                "voiceSignal",
                "Active",
                "signal-active"
            );

        };


    recognition.onresult =
        handleSpeechResult;


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

                setText(
                    recordingStatus,
                    "Microphone permission denied"
                );

            }

        };


    recognition.onend =
        () => {

            isListening =
                false;


            clearTimeout(
                silenceTimer
            );


            if (
                interviewRunning &&
                !processingAnswer &&
                answerText.trim()
            ) {

                const silence =
                    Date.now() -
                    lastSpeechTime;


                if (
                    silence >= 1500
                ) {

                    submitAnswer();

                }

            }

        };


    return true;

}


/* =========================================================
   SPEECH RESULT
========================================================= */

function handleSpeechResult(
    event
) {

    if (!interviewRunning) {
        return;
    }


    let finalText =
        "";

    let interimText =
        "";


    for (
        let i = event.resultIndex;
        i < event.results.length;
        i++
    ) {

        const result =
            event.results[i];


        const text =
            result[0].transcript;


        if (result.isFinal) {

            finalText +=
                text;

        } else {

            interimText +=
                text;

        }

    }


    if (finalText.trim()) {

        answerText =
            `${answerText} ${finalText}`
                .trim();


        lastSpeechTime =
            Date.now();

    }


    const visibleText =
        `${answerText} ${interimText}`
            .trim();


    setText(
        transcript,
        visibleText ||
        "Listening..."
    );


    if (listeningProgress) {

        listeningProgress.style.width =
            "100%";

    }


    startSilenceDetection();

}


/* =========================================================
   SILENCE DETECTION
========================================================= */

function startSilenceDetection() {

    clearTimeout(
        silenceTimer
    );


    silenceTimer =
        setTimeout(
            () => {

                if (
                    answerText.trim() &&
                    !processingAnswer &&
                    interviewRunning
                ) {

                    submitAnswer();

                }

            },
            2500
        );

}


/* =========================================================
   START LISTENING
========================================================= */

function beginAutomaticListening() {

    if (!interviewRunning) {
        return;
    }


    if (!recognition) {

        if (
            !setupSpeechRecognition()
        ) {

            return;

        }

    }


    if (isListening) {
        return;
    }


    answerText =
        "";


    setText(
        transcript,
        "Listening for your answer..."
    );


    try {

        recognition.start();

    } catch (error) {

        console.warn(
            "Recognition start:",
            error
        );

    }

}


/* =========================================================
   SUBMIT ANSWER
========================================================= */

async function submitAnswer() {

    if (
        processingAnswer ||
        !interviewRunning
    ) {

        return;

    }


    const answer =
        answerText.trim();


    if (!answer) {

        beginAutomaticListening();

        return;

    }


    processingAnswer =
        true;


    clearTimeout(
        silenceTimer
    );


    if (
        recognition &&
        isListening
    ) {

        try {

            recognition.stop();

        } catch (error) {}

    }


    setText(
        recordingStatus,
        "Analyzing..."
    );


    setText(
        autoStatusText,
        "AI is analyzing your response..."
    );


    const question =
        questions[
            currentQuestionIndex
        ];


    const responseTime =
        Math.round(
            (
                Date.now() -
                questionStartTime
            ) / 1000
        );


    const oldPreviousAnswers =
        [...previousAnswers];


    try {

        const response =
            await fetch(
                ANALYZE_ENDPOINT,
                {

                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({

                        interview_id:
                            interviewId,

                        role:
                            interviewConfig.role,

                        question:
                            question,

                        answer:
                            answer,

                        previous_answers:
                            oldPreviousAnswers,

                        response_time_seconds:
                            responseTime,

                        expression_data:
                            getFaceData()

                    })

                }
            );


        if (!response.ok) {

            const errorText =
                await response.text();


            throw new Error(
                `Analysis request failed: ${response.status} ${errorText}`
            );

        }


        const result =
            await response.json();


        console.log(
            "AI ANALYSIS RESULT:",
            result
        );


        /* =============================================
           DISPLAY SCORES
        ============================================= */

        displayAnalysis(
            result
        );


        /* =============================================
           SAVE ANSWER
        ============================================= */

        previousAnswers.push(
            answer
        );


        /* =============================================
           SAVE LOCAL ANALYSIS
        ============================================= */

        analysisHistory.push({

            question:
                question,

            answer:
                answer,

            response_time_seconds:
                responseTime,

            analysis:
                result,

            face:
                getFaceData(),

            created_at:
                new Date().toISOString()

        });


        localStorage.setItem(
            "aiInterviewAnalysisHistory",
            JSON.stringify(
                analysisHistory
            )
        );


        /* =============================================
           SERVER ANSWER SAVE IS ALREADY HANDLED
           BY /analyze-answer
        ============================================= */


        if (
            currentQuestionIndex + 1 >=
            interviewConfig.totalQuestions
        ) {

            await finishInterview();

            return;

        }


        currentQuestionIndex++;


        setText(
            autoStatusText,
            "Generating your next question..."
        );


        await getNextQuestion();


    } catch (error) {

        console.error(
            "Answer processing error:",
            error
        );


        setText(
            recordingStatus,
            "Analysis failed"
        );


        setText(
            autoStatusText,
            "Unable to analyze the response. Retrying..."
        );


        processingAnswer =
            false;


        setTimeout(
            beginAutomaticListening,
            1500
        );

    }

}


/* =========================================================
   NEXT QUESTION
========================================================= */

async function getNextQuestion() {

    try {

        const response =
            await fetch(
                NEXT_ENDPOINT,
                {

                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({

                        interview_id:
                            interviewId,

                        role:
                            interviewConfig.role,

                        skills:
                            interviewConfig.skills,

                        difficulty:
                            interviewConfig.difficulty,

                        question_number:
                            currentQuestionIndex + 1,

                        previous_questions:
                            previousQuestions,

                        previous_answers:
                            previousAnswers,

                        resume_summary:
                            interviewConfig.resumeSummary,

                        interview_focus:
                            interviewConfig.interviewFocus

                    })

                }
            );


        if (!response.ok) {

            const errorText =
                await response.text();


            throw new Error(
                `Next question failed: ${response.status} ${errorText}`
            );

        }


        const data =
            await response.json();


        console.log(
            "NEXT QUESTION:",
            data
        );


        if (!data.question) {

            throw new Error(
                "No question returned by AI."
            );

        }


        questions[
            currentQuestionIndex
        ] =
            data.question;


        previousQuestions.push(
            data.question
        );


        processingAnswer =
            false;


        loadQuestion();


        setTimeout(
            speakQuestion,
            700
        );


    } catch (error) {

        console.error(
            "Next question error:",
            error
        );


        processingAnswer =
            false;


        setText(
            autoStatusText,
            "Could not generate the next question."
        );


        setTimeout(
            beginAutomaticListening,
            1500
        );

    }

}


/* =========================================================
   DISPLAY AI ANALYSIS
========================================================= */

function displayAnalysis(result) {

    if (!result) {

        console.warn(
            "No analysis result received."
        );

        return;

    }


    console.log(
        "DISPLAYING ANALYSIS:",
        result
    );


    /*
       Some backend responses may be wrapped:

       {
          analysis: {...}
       }

       or

       {
          data: {...}
       }

       or

       {
          result: {...}
       }

       Support all of them.
    */

    const analysis =
        result.analysis &&
        typeof result.analysis ===
        "object"

            ? result.analysis

            : result.data &&
              typeof result.data ===
              "object"

                ? result.data

                : result.result &&
                  typeof result.result ===
                  "object"

                    ? result.result

                    : result;


    /* =====================================================
       NORMALIZE VALUES
    ===================================================== */

    const relevance =
        Number(
            analysis.relevance_score ??
            analysis.relevance ??
            analysis.relevanceScore ??
            0
        );


    const consistency =
        Number(
            analysis.consistency_score ??
            analysis.consistency ??
            analysis.consistencyScore ??
            analysis.response_consistency ??
            analysis.responseConsistency ??
            0
        );


    const potentialIndicator =
        Number(
            analysis.deception_indicator_score ??
            analysis.potential_indicator_score ??
            analysis.potential_indicators ??
            analysis.potentialIndicators ??
            analysis.deceptionScore ??
            analysis.deception_indicator ??
            0
        );


    /*
       Response confidence is derived from
       relevance + consistency.

       It is NOT a lie probability.
    */

    const responseConfidence =
        Math.round(
            (
                relevance +
                consistency
            ) / 2
        );


    /* =====================================================
       FACE DATA
    ===================================================== */

    const faceData =
        getFaceData();


    const behavioralStability =
        Number(
            faceData.face_stability ??
            faceData.faceStability ??
            0
        );


    const eyeActivity =
        Number(
            faceData.eye_activity ??
            faceData.eyeActivity ??
            0
        );


    const facialStability =
        Number(
            faceData.face_stability ??
            faceData.faceStability ??
            0
        );


    /* =====================================================
       SAFE SCORE
    ===================================================== */

    function safeScore(value) {

        const number =
            Number(value);


        if (
            !Number.isFinite(number)
        ) {

            return 0;

        }


        return Math.max(
            0,
            Math.min(
                100,
                Math.round(number)
            )
        );

    }


    const relevanceValue =
        safeScore(
            relevance
        );


    const consistencyValue =
        safeScore(
            consistency
        );


    const potentialValue =
        safeScore(
            potentialIndicator
        );


    const confidenceValue =
        safeScore(
            responseConfidence
        );


    const behavioralValue =
        safeScore(
            behavioralStability
        );


    const eyeValue =
        safeScore(
            eyeActivity
        );


    const facialValue =
        safeScore(
            facialStability
        );


    /* =====================================================
       MAIN AI ANALYSIS
    ===================================================== */

    updateScore(
        "relevanceScore",
        relevanceValue
    );


    updateScore(
        "consistencyScore",
        consistencyValue
    );


    updateScore(
        "deceptionScore",
        potentialValue
    );


    /* =====================================================
       INTEGRITY ANALYSIS
    ===================================================== */

    updateScore(
        "responseConsistency",
        consistencyValue
    );


    updateScore(
        "responseConsistencyPercentage",
        consistencyValue
    );


    updateScore(
        "responseConfidence",
        confidenceValue
    );


    updateScore(
        "responseConfidencePercentage",
        confidenceValue
    );


    updateScore(
        "potentialIndicators",
        potentialValue
    );


    updateScore(
        "potentialIndicatorsPercentage",
        potentialValue
    );


    updateScore(
        "behavioralStability",
        behavioralValue
    );


    updateScore(
        "behavioralStabilityPercentage",
        behavioralValue
    );


    updateScore(
        "eyeActivityScore",
        eyeValue
    );


    updateScore(
        "eyeActivityPercentage",
        eyeValue
    );


    updateScore(
        "facialStability",
        facialValue
    );


    updateScore(
        "facialStabilityPercentage",
        facialValue
    );


    /* =====================================================
       ALTERNATIVE IDS
    ===================================================== */

    updateScore(
        "overallRelevance",
        relevanceValue
    );


    updateScore(
        "overallConsistency",
        consistencyValue
    );


    updateScore(
        "overallIndicator",
        potentialValue
    );


    updateScore(
        "overallEyeActivity",
        eyeValue
    );


    updateScore(
        "overallFaceStability",
        facialValue
    );


    updateScore(
        "overallBehavioralStability",
        behavioralValue
    );


    /* =====================================================
       ANALYSIS STATUS
    ===================================================== */

    const status =
        document.getElementById(
            "analysisStatus"
        );


    if (status) {

        status.textContent =
            "Analysis Complete";

    }


    /* =====================================================
       INDICATORS
    ===================================================== */

    const indicators =
        document.getElementById(
            "analysisIndicators"
        );


    if (indicators) {

        indicators.innerHTML =
            "";


        const indicatorList =
            Array.isArray(
                analysis.indicators
            )

                ? analysis.indicators

                : [];


        if (
            indicatorList.length > 0
        ) {

            indicatorList.forEach(
                indicator => {

                    const item =
                        document.createElement(
                            "span"
                        );


                    item.className =
                        "analysis-indicator";


                    item.textContent =
                        String(
                            indicator
                        );


                    indicators.appendChild(
                        item
                    );

                }
            );

        } else {

            indicators.innerHTML = `
                <span class="empty-analysis">
                    No potential inconsistencies identified.
                </span>
            `;

        }

    }


    /* =====================================================
       AI FEEDBACK
    ===================================================== */

    const feedback =
        document.getElementById(
            "analysisFeedback"
        );


    if (feedback) {

        feedback.textContent =
            analysis.feedback ||
            "Analysis completed successfully.";

    }


    /* =====================================================
       RESPONSE SIGNAL
    ===================================================== */

    setSignal(
        "responseSignal",
        "Analyzed",
        "signal-active"
    );


    /* =====================================================
       CONSISTENCY SIGNAL
    ===================================================== */

    if (
        consistencyValue >= 75
    ) {

        setSignal(
            "consistencySignal",
            "Consistent",
            "signal-active"
        );

    } else {

        setSignal(
            "consistencySignal",
            "Review",
            "signal-warning"
        );

    }


    /* =====================================================
       SAVE LATEST ANALYSIS
    ===================================================== */

    const latestAnalysis = {

        relevance_score:
            relevanceValue,

        consistency_score:
            consistencyValue,

        deception_indicator_score:
            potentialValue,

        response_confidence:
            confidenceValue,

        behavioral_stability:
            behavioralValue,

        eye_activity:
            eyeValue,

        facial_stability:
            facialValue,

        indicators:
            Array.isArray(
                analysis.indicators
            )
                ? analysis.indicators
                : [],

        feedback:
            analysis.feedback ||
            ""

    };


    localStorage.setItem(
        "latestInterviewAnalysis",
        JSON.stringify(
            latestAnalysis
        )
    );


    console.log(
        "FINAL ANALYSIS VALUES:",
        {

            relevance:
                relevanceValue,

            consistency:
                consistencyValue,

            potentialIndicator:
                potentialValue,

            responseConfidence:
                confidenceValue,

            behavioralStability:
                behavioralValue,

            eyeActivity:
                eyeValue,

            facialStability:
                facialValue

        }
    );

}


/* =========================================================
   UPDATE SCORE ELEMENT
========================================================= */

function updateScore(
    id,
    value
) {

    const element =
        document.getElementById(
            id
        );


    if (!element) {

        console.warn(
            `Score element not found: #${id}`
        );

        return;

    }


    const score =
        Math.max(
            0,
            Math.min(
                100,
                Number(value) || 0
            )
        );


    element.textContent =
        `${Math.round(score)}%`;

}


/* =========================================================
   SIGNAL
========================================================= */

function setSignal(
    id,
    text,
    className = ""
) {

    const element =
        document.getElementById(
            id
        );


    if (!element) {
        return;
    }


    element.textContent =
        text;


    if (className) {

        element.className =
            className;

    }

}


/* =========================================================
   START INTERVIEW
========================================================= */

async function startInterview() {

    try {

        setText(
            autoStatusText,
            "Connecting to AI interviewer..."
        );


        const response =
            await fetch(
                START_ENDPOINT,
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

                        total_questions:
                            interviewConfig.totalQuestions,

                        candidate:
                            interviewConfig.candidate,

                        resume_summary:
                            interviewConfig.resumeSummary,

                        interview_focus:
                            interviewConfig.interviewFocus,

                        experience:
                            interviewConfig.experience,

                        projects:
                            interviewConfig.projects

                    })

                }
            );


        if (!response.ok) {

            const errorText =
                await response.text();


            throw new Error(
                `Start interview failed: ${response.status} ${errorText}`
            );

        }


        const data =
            await response.json();


        console.log(
            "START INTERVIEW RESPONSE:",
            data
        );


        interviewId =
            data.interview_id ||
            data.id ||
            null;


        if (interviewId) {

            localStorage.setItem(
                "activeInterviewId",
                interviewId
            );

        }


        if (!data.question) {

            throw new Error(
                "No first question received."
            );

        }


        questions = [
            data.question
        ];


        previousQuestions = [
            data.question
        ];


        previousAnswers = [];


        currentQuestionIndex =
            0;


        analysisHistory =
            [];


        interviewRunning =
            true;


        processingAnswer =
            false;


        loadQuestion();


        setText(
            autoStatusText,
            "AI question ready."
        );


        setTimeout(
            speakQuestion,
            700
        );


    } catch (error) {

        console.error(
            "Interview start error:",
            error
        );


        setText(
            questionText,
            "Unable to start interview."
        );


        setText(
            autoStatusText,
            "Backend connection failed."
        );

    }

}


/* =========================================================
   SAVE BEHAVIOR SUMMARY
========================================================= */

async function saveBehaviorSummary() {

    if (!interviewId) {
        return;
    }


    try {

        const faceData =
            getFaceData();


        await fetch(
            SUMMARY_ENDPOINT,
            {

                method: "POST",

                headers: {
                    "Content-Type":
                        "application/json"
                },

                body: JSON.stringify({

                    interview_id:
                        interviewId,

                    summary: {

                        face_detected:
                            faceData.face_detected,

                        confidence:
                            faceData.confidence,

                        eye_activity:
                            faceData.eye_activity,

                        face_stability:
                            faceData.face_stability,

                        expression:
                            faceData.expression

                    }

                })

            }
        );


    } catch (error) {

        console.warn(
            "Behavior summary save failed:",
            error
        );

    }

}


/* =========================================================
   COMPLETE SERVER INTERVIEW
========================================================= */

async function completeServerInterview() {

    if (!interviewId) {
        return;
    }


    try {

        const response =
            await fetch(
                COMPLETE_ENDPOINT,
                {

                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({

                        interview_id:
                            interviewId

                    })

                }
            );


        if (!response.ok) {

            console.warn(
                "Complete interview failed:",
                await response.text()
            );

        }


        localStorage.setItem(
            "completedInterviewId",
            interviewId
        );


        localStorage.setItem(
            "lastInterviewReportId",
            interviewId
        );


    } catch (error) {

        console.warn(
            "Completion request failed:",
            error
        );

    }

}


/* =========================================================
   SAVE LOCAL REPORT
========================================================= */

/* =========================================================
   SAVE LOCAL REPORT
========================================================= */

/* =========================================================
   SAVE LOCAL REPORT
========================================================= */

function saveLocalReportData(expressionSummary = null) {

    // Capture face analysis metrics
    const behaviorSummary =
        window.FaceAnalysis &&
        typeof window.FaceAnalysis.getSummary === "function"
            ? window.FaceAnalysis.getSummary()
            : {};

    console.log(
        "FACE SUMMARY BEFORE REPORT SAVE:",
        behaviorSummary
    );

    // Get existing integrity information safely
    let existingReport = {};

    try {
        existingReport = JSON.parse(
            localStorage.getItem("aiInterviewReport") || "{}"
        );
    } catch (error) {
        console.warn(
            "Could not read existing report:",
            error
        );
    }

    const report = {
        interview_id: interviewId,

        candidate: interviewConfig.candidate,
        role: interviewConfig.role,
        skills: interviewConfig.skills,
        difficulty: interviewConfig.difficulty,
        total_questions: interviewConfig.totalQuestions,

        questions: questions,
        answers: previousAnswers,
        analysis: analysisHistory,

        // Face analysis metrics
        behavior_summary: behaviorSummary,

        // Expression analysis
        expression_summary: expressionSummary || {},

        duration_seconds: timerSeconds,

        started_at: new Date(
            Date.now() - timerSeconds * 1000
        ).toISOString(),

        completed_at: new Date().toISOString(),

        // Application switching
        application_switch_count:
            typeof applicationSwitchCount !== "undefined"
                ? applicationSwitchCount
                : 0,

        application_switch_events:
            typeof applicationSwitchEvents !== "undefined"
                ? applicationSwitchEvents
                : [],

        // Preserve existing integrity information
        integrity: existingReport.integrity || {}
    };

    // Save report locally
    localStorage.setItem(
        "aiInterviewReport",
        JSON.stringify(report)
    );

    // Verify saved data
    const savedReport = JSON.parse(
        localStorage.getItem("aiInterviewReport")
    );

    console.log(
        "VERIFIED SAVED BEHAVIOR SUMMARY:",
        savedReport.behavior_summary
    );

    console.log(
        "VERIFIED SAVED EXPRESSION SUMMARY:",
        savedReport.expression_summary
    );

    console.log(
        "COMPLETE LOCAL REPORT:",
        savedReport
    );

    return savedReport;
}


/* =========================================================
   FINISH INTERVIEW
========================================================= */

/* =========================================================
   FINISH INTERVIEW
========================================================= */

async function finishInterview() {

    // Avoid generating the report more than once.
    if (finishingInterview) {
        return;
    }

    finishingInterview = true;

    interviewRunning = false;
    processingAnswer = true;

    clearInterval(timerInterval);
    clearTimeout(silenceTimer);

    if (recognition) {
        try {
            recognition.stop();
        } catch (error) {
            console.warn(
                "Speech recognition stop error:",
                error
            );
        }
    }

    if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
    }

    // Stop object monitoring.
    if (
        window.ObjectDetection &&
        typeof ObjectDetection.stop === "function"
    ) {
        try {
            ObjectDetection.stop();
        } catch (error) {
            console.warn(
                "Object detection stop error:",
                error
            );
        }
    }

    // Save the final behavior summary.
    await saveBehaviorSummary();

    // Complete the server-side interview.
    await completeServerInterview();

    // Save the local report.
    saveLocalReportData();

    // Stop the camera and face monitoring.
    stopCamera();

    // Display the completion screen.
    showCompletion();

    processingAnswer = false;

    console.log(
        "Interview completed and report generated."
    );
}

/* =========================================================
   COMPLETION OVERLAY
========================================================= */

function showCompletion() {

    if (!completionOverlay) {
        return;
    }


    completionOverlay.classList.add(
        "active"
    );


    completionOverlay.style.display =
        "flex";

}


function hideCompletion() {

    if (!completionOverlay) {
        return;
    }


    completionOverlay.classList.remove(
        "active"
    );


    completionOverlay.style.display =
        "none";

}


/* =========================================================
   OPEN INTERVIEW REPORT
========================================================= */

function openInterviewReport() {

    const id =
        interviewId ||
        localStorage.getItem(
            "completedInterviewId"
        ) ||
        localStorage.getItem(
            "lastInterviewReportId"
        );


    if (!id) {

        alert(
            "Interview report is not available because the interview ID could not be found."
        );


        return;

    }


    localStorage.setItem(
        "completedInterviewId",
        id
    );


    window.location.href =
        `report.html?id=${encodeURIComponent(id)}`;

}


/* =========================================================
   STOP CAMERA
========================================================= */

function stopCamera() {

    stopFaceUI();


    if (
        window.FaceAnalysis &&
        typeof FaceAnalysis.stop ===
        "function"
    ) {

        try {

            FaceAnalysis.stop();

        } catch (error) {}

    }


    if (!mediaStream) {
        return;
    }


    mediaStream
        .getTracks()
        .forEach(
            track => track.stop()
        );


    mediaStream =
        null;


    if (video) {

        video.srcObject =
            null;

    }


    if (cameraPlaceholder) {

        cameraPlaceholder.style.display =
            "flex";

    }


    setText(
        cameraStatus,
        "Camera Off"
    );

}


/* =========================================================
   END INTERVIEW
========================================================= */

async function handleEndInterview() {

    if (!interviewRunning) {
        return;
    }


    const confirmed =
        confirm(
            "Are you sure you want to end the interview?"
        );


    if (!confirmed) {
        return;
    }


    await finishInterview();

}


/* =========================================================
   BUTTON EVENTS
========================================================= */

if (speakButton) {

    speakButton.addEventListener(
        "click",
        speakQuestion
    );

}


if (repeatQuestion) {

    repeatQuestion.addEventListener(
        "click",
        speakQuestion
    );

}


if (endInterview) {

    endInterview.addEventListener(
        "click",
        handleEndInterview
    );

}


if (completionDownload) {

    completionDownload.addEventListener(
        "click",
        openInterviewReport
    );

}


if (downloadReport) {

    downloadReport.addEventListener(
        "click",
        openInterviewReport
    );

}


if (closeCompletion) {

    closeCompletion.addEventListener(
        "click",
        hideCompletion
    );

}


/* =========================================================
   INITIALIZE
========================================================= */

async function initializeInterview() {

    console.log(
        "AI Interview Intelligence starting..."
    );


    loadInterviewConfig();


    startTimer();


    await startCamera();


    setupSpeechRecognition();


    await startInterview();

}


initializeInterview();


/* =========================================================
   CLEANUP
========================================================= */

window.addEventListener(
    "beforeunload",
    () => {

        clearInterval(
            timerInterval
        );


        clearTimeout(
            silenceTimer
        );


        stopFaceUI();


        if (recognition) {

            try {

                recognition.stop();

            } catch (error) {}

        }


        if (mediaStream) {

            mediaStream
                .getTracks()
                .forEach(
                    track =>
                        track.stop()
                );

        }

    }
);


/* =========================================================
   APPLICATION SWITCH MONITORING
========================================================= */

function handleApplicationSwitch(reason) {

    // Only handle events during an active interview.
    if (!interviewRunning) {
        return;
    }

    // Prevent duplicate termination.
    if (interviewAutoEnded) {
        return;
    }

    interviewAutoEnded = true;

    applicationSwitchCount++;

    const event = {
        type: "application_switch",
        message: reason,
        timestamp: new Date().toISOString()
    };

    applicationSwitchEvents.push(event);

    console.warn(
        "APPLICATION SWITCH DETECTED:",
        event
    );

    setText(
        autoStatusTitle,
        "Interview Terminated"
    );

    setText(
        autoStatusText,
        "The interview window lost focus. Your report is being generated."
    );

    setText(
        recordingStatus,
        "Interview Ended"
    );

    // This generates the report and ends the interview.
    finishInterview();
}


/* =========================================================
   DETECT TAB SWITCH / PAGE HIDDEN
========================================================= */

document.addEventListener(
    "visibilitychange",
    () => {

        if (
            document.visibilityState === "hidden"
        ) {

            handleApplicationSwitch(
                "Interview page became hidden. The candidate may have switched tabs or minimized the browser."
            );

        }

    }
);


/* =========================================================
   DETECT WINDOW FOCUS LOSS
========================================================= */

window.addEventListener(
    "blur",
    () => {

        handleApplicationSwitch(
            "Interview browser window lost focus. The candidate may have switched to another application."
        );

    }
);