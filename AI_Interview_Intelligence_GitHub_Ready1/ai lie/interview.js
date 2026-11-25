"use strict";

/* =========================================================
   AI INTERVIEW INTELLIGENCE
   Automatic Interview Flow
========================================================= */

const API_URL = "http://127.0.0.1:8000";

const interviewConfig = {
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
   STATE
========================================================= */

let questions = [];
let previousQuestions = [];
let previousAnswers = [];

let currentQuestion = 0;

let stream = null;
let recognition = null;

let isListening = false;
let interviewRunning = false;
let processingAnswer = false;

let silenceTimer = null;
let timerInterval = null;
let timerSeconds = 0;

let answerText = "";
let lastSpeechTime = 0;


/* =========================================================
   ELEMENTS
========================================================= */

const video =
    document.getElementById("candidateVideo");

const placeholder =
    document.getElementById("cameraPlaceholder");

const cameraStatus =
    document.getElementById("cameraStatus");

const questionText =
    document.getElementById("questionText");

const questionNumber =
    document.getElementById("questionNumber");

const transcript =
    document.getElementById("transcript");

const recordingStatus =
    document.getElementById("recordingStatus");

const aiState =
    document.getElementById("aiState");

const timer =
    document.getElementById("timer");

const speakButton =
    document.getElementById("speakButton");

const endInterview =
    document.getElementById("endInterview");


/*
   These buttons are optional.
   Your new automatic flow does not require
   the candidate to click Start Answer / Next.
*/

const recordButton =
    document.getElementById("recordButton");

const nextButton =
    document.getElementById("nextButton");


/* =========================================================
   SIGNAL HELPER
========================================================= */

function setSignal(id, text, className = "signal-neutral") {

    const element =
        document.getElementById(id);

    if (!element) return;

    element.textContent = text;
    element.className = className;
}


/* =========================================================
   CAMERA + MICROPHONE
========================================================= */

async function startCamera() {

    try {

        if (
            !navigator.mediaDevices ||
            !navigator.mediaDevices.getUserMedia
        ) {

            throw new Error(
                "Camera API is not supported."
            );

        }

        stream =
            await navigator.mediaDevices.getUserMedia({
                video: true,
                audio: true
            });


        video.srcObject = stream;

        video.style.display = "block";

        if (placeholder) {
            placeholder.style.display = "none";
        }


        cameraStatus.textContent =
            "Camera Active";


        setSignal(
            "visualSignal",
            "Active",
            "signal-active"
        );


    } catch (error) {

        console.error(
            "Camera error:",
            error
        );


        cameraStatus.textContent =
            "Permission Required";


        setSignal(
            "visualSignal",
            "Unavailable"
        );


        /*
           We don't stop the interview here.
           Speech recognition can still request
           microphone permission separately.
        */

        console.warn(
            "Camera unavailable. Interview can continue with audio."
        );

    }

}


/* =========================================================
   TIMER
========================================================= */

function startTimer() {

    clearInterval(timerInterval);

    timerSeconds = 0;

    timer.textContent = "00:00";


    timerInterval =
        setInterval(() => {

            timerSeconds++;

            const minutes =
                Math.floor(
                    timerSeconds / 60
                );

            const seconds =
                timerSeconds % 60;


            timer.textContent =
                String(minutes).padStart(2, "0")
                +
                ":"
                +
                String(seconds).padStart(2, "0");

        }, 1000);

}


/* =========================================================
   LOAD QUESTION
========================================================= */

function loadQuestion() {

    if (
        currentQuestion >= questions.length
    ) {

        return;

    }


    const question =
        questions[currentQuestion];


    questionText.textContent =
        question;


    questionNumber.textContent =
        String(currentQuestion + 1)
            .padStart(2, "0");


    transcript.textContent =
        "Listening for your answer...";


    recordingStatus.textContent =
        "Waiting";


    aiState.textContent =
        "Question ready";


    setSignal(
        "voiceSignal",
        "Waiting"
    );


    setSignal(
        "responseSignal",
        "Waiting"
    );


    /*
       Hide manual controls because the
       interview is automatic.
    */

    if (recordButton) {
        recordButton.style.display = "none";
    }

    if (nextButton) {
        nextButton.style.display = "none";
    }

}


/* =========================================================
   SPEAK QUESTION
========================================================= */

function speakQuestion() {

    const text =
        questionText.textContent.trim();


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
        new SpeechSynthesisUtterance(text);


    speech.rate = 0.9;
    speech.pitch = 1;
    speech.volume = 1;


    aiState.textContent =
        "AI is asking...";


    recordingStatus.textContent =
        "AI speaking";


    speech.onend = () => {

        if (!interviewRunning) return;


        aiState.textContent =
            "Listening";


        setTimeout(() => {

            beginAutomaticListening();

        }, 500);

    };


    window.speechSynthesis.speak(
        speech
    );

}


/* =========================================================
   SPEECH RECOGNITION SETUP
========================================================= */

function setupSpeechRecognition() {

    const SpeechRecognition =
        window.SpeechRecognition ||
        window.webkitSpeechRecognition;


    if (!SpeechRecognition) {

        console.error(
            "Speech Recognition is not supported."
        );


        recordingStatus.textContent =
            "Speech recognition unavailable";


        aiState.textContent =
            "Use Google Chrome for automatic voice interview";


        return false;

    }


    recognition =
        new SpeechRecognition();


    recognition.continuous = true;

    recognition.interimResults = true;

    recognition.lang = "en-US";


    recognition.onstart = () => {

        isListening = true;

        processingAnswer = false;

        answerText = "";

        lastSpeechTime =
            Date.now();


        recordingStatus.textContent =
            "Listening...";


        aiState.textContent =
            "Listening";


        setSignal(
            "voiceSignal",
            "Active",
            "signal-active"
        );


        setSignal(
            "responseSignal",
            "Listening",
            "signal-active"
        );


        startSilenceDetection();

    };


    recognition.onresult =
        handleSpeechResult;


    recognition.onerror =
        handleSpeechError;


    recognition.onend = () => {

        isListening = false;


        clearTimeout(silenceTimer);


        /*
           If interview is still running and
           answer hasn't been submitted,
           restart recognition.
        */

        if (
            interviewRunning &&
            !processingAnswer &&
            answerText.trim()
        ) {

            /*
               Give the candidate a short period
               to finish speaking.
            */

            if (
                Date.now() - lastSpeechTime > 1500
            ) {

                submitAnswerAutomatically();

            }

        }

    };


    return true;

}


/* =========================================================
   SPEECH RESULT
========================================================= */

function handleSpeechResult(event) {

    if (!interviewRunning) return;

    let finalText = "";
    let interimText = "";


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

            finalText += text;

        } else {

            interimText += text;

        }

    }


    if (finalText.trim()) {

        answerText +=
            " " + finalText.trim();

        answerText =
            answerText.trim();


        lastSpeechTime =
            Date.now();

    }


    const displayText =
        answerText +
        (
            interimText
                ? " " + interimText
                : ""
        );


    transcript.textContent =
        displayText.trim() ||
        "Listening...";


    if (
        answerText.trim()
    ) {

        setSignal(
            "responseSignal",
            "Receiving",
            "signal-active"
        );

    }

}


/* =========================================================
   SILENCE DETECTION
========================================================= */

function startSilenceDetection() {

    clearTimeout(silenceTimer);


    const checkSilence = () => {

        if (!interviewRunning) return;


        const silenceDuration =
            Date.now() - lastSpeechTime;


        /*
           2.5 seconds of silence means
           the candidate probably finished.
        */

        if (
            answerText.trim() &&
            silenceDuration >= 2500 &&
            !processingAnswer
        ) {

            submitAnswerAutomatically();

            return;

        }


        silenceTimer =
            setTimeout(
                checkSilence,
                500
            );

    };


    checkSilence();

}


/* =========================================================
   START AUTOMATIC LISTENING
========================================================= */

function beginAutomaticListening() {

    if (!interviewRunning) return;


    if (!recognition) {

        const ready =
            setupSpeechRecognition();


        if (!ready) {

            return;

        }

    }


    if (isListening) return;


    answerText = "";

    transcript.textContent =
        "Listening for your answer...";


    try {

        recognition.start();

    } catch (error) {

        console.log(
            "Recognition start:",
            error
        );

    }

}


/* =========================================================
   SPEECH ERROR
========================================================= */

function handleSpeechError(event) {

    console.error(
        "Speech recognition:",
        event.error
    );


    if (
        event.error === "not-allowed" ||
        event.error === "service-not-allowed"
    ) {

        recordingStatus.textContent =
            "Microphone permission denied";


        aiState.textContent =
            "Microphone access required";


        interviewRunning = false;


        return;

    }


    if (
        event.error === "no-speech"
    ) {

        if (
            interviewRunning &&
            !processingAnswer
        ) {

            setTimeout(
                beginAutomaticListening,
                500
            );

        }

        return;

    }


    recordingStatus.textContent =
        "Speech error";

}


/* =========================================================
   SUBMIT ANSWER AUTOMATICALLY
========================================================= */

async function submitAnswerAutomatically() {

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


    processingAnswer = true;


    clearTimeout(silenceTimer);


    if (recognition && isListening) {

        try {

            recognition.stop();

        } catch (error) {

            console.log(error);

        }

    }


    recordingStatus.textContent =
        "Analyzing...";


    aiState.textContent =
        "AI is analyzing your answer...";


    setSignal(
        "voiceSignal",
        "Analyzed",
        "signal-active"
    );


    setSignal(
        "responseSignal",
        "Received",
        "signal-active"
    );


    const currentQuestionText =
        questions[currentQuestion];


    const oldAnswers =
        [...previousAnswers];


    try {

        /*
           -----------------------------------------
           ANALYZE ANSWER
           -----------------------------------------
        */

        const analysisResponse =
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
                            currentQuestionText,

                        answer:
                            answer,

                        previous_answers:
                            oldAnswers

                    })

                }
            );


        if (!analysisResponse.ok) {

            const errorText =
                await analysisResponse.text();


            throw new Error(
                `Analysis failed: ${analysisResponse.status} ${errorText}`
            );

        }


        const analysis =
            await analysisResponse.json();


        console.log(
            "AI analysis:",
            analysis
        );


        /*
           Show analysis immediately.
        */

        displayAnalysis(
            analysis
        );


        /*
           Save answer.
        */

        previousAnswers.push(
            answer
        );


        /*
           -----------------------------------------
           CHECK LAST QUESTION
           -----------------------------------------
        */

        currentQuestion++;


        if (
            currentQuestion >=
            interviewConfig.totalQuestions
        ) {

            await completeInterview();

            return;

        }


        /*
           -----------------------------------------
           GENERATE NEXT QUESTION
           -----------------------------------------
        */

        aiState.textContent =
            "AI is preparing the next question...";


        const questionResponse =
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

                        question_number:
                            currentQuestion + 1,

                        previous_questions:
                            previousQuestions,

                        previous_answers:
                            previousAnswers

                    })

                }
            );


        if (!questionResponse.ok) {

            const errorText =
                await questionResponse.text();


            throw new Error(
                `Question generation failed: ${questionResponse.status} ${errorText}`
            );

        }


        const data =
            await questionResponse.json();


        if (!data.question) {

            throw new Error(
                "AI returned no next question."
            );

        }


        questions.push(
            data.question
        );


        previousQuestions.push(
            data.question
        );


        /*
           Load next question.
        */

        loadQuestion();


        processingAnswer = false;


        /*
           Let AI ask it automatically.
        */

        setTimeout(
            speakQuestion,
            700
        );


    } catch (error) {

        console.error(
            "Automatic interview error:",
            error
        );


        processingAnswer = false;


        aiState.textContent =
            "Analysis error";


        recordingStatus.textContent =
            "Retrying...";


        /*
           Don't immediately end the interview.
        */

        setTimeout(() => {

            if (interviewRunning) {

                beginAutomaticListening();

            }

        }, 1500);

    }

}


/* =========================================================
   DISPLAY ANALYSIS
========================================================= */

function displayAnalysis(result) {

    if (!result) return;


    const status =
        document.getElementById(
            "analysisStatus"
        );


    const relevance =
        document.getElementById(
            "relevanceScore"
        );


    const consistency =
        document.getElementById(
            "consistencyScore"
        );


    const deception =
        document.getElementById(
            "deceptionScore"
        );


    const indicators =
        document.getElementById(
            "analysisIndicators"
        );


    const feedback =
        document.getElementById(
            "analysisFeedback"
        );


    if (status) {

        status.textContent =
            "Analysis Complete";

    }


    if (relevance) {

        relevance.textContent =
            result.relevance_score ?? "—";

    }


    if (consistency) {

        consistency.textContent =
            result.consistency_score ?? "—";

    }


    if (deception) {

        deception.textContent =
            result.deception_indicator_score ?? "—";

    }


    if (indicators) {

        indicators.innerHTML = "";


        if (
            Array.isArray(result.indicators) &&
            result.indicators.length
        ) {

            result.indicators.forEach(
                indicator => {

                    const item =
                        document.createElement(
                            "span"
                        );


                    item.className =
                        "analysis-indicator";


                    item.textContent =
                        indicator;


                    indicators.appendChild(
                        item
                    );

                }
            );

        } else {

            indicators.innerHTML =
                `
                <span class="empty-analysis">
                    No potential inconsistencies identified.
                </span>
                `;

        }

    }


    if (feedback) {

        feedback.textContent =
            result.feedback ||
            "No additional feedback available.";

    }


    /*
       Consistency signal.
    */

    if (
        result.consistency_score !== undefined
    ) {

        const score =
            Number(
                result.consistency_score
            );


        if (score >= 75) {

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

    }

}


/* =========================================================
   START INTERVIEW
========================================================= */

async function startInterviewAPI() {

    try {

        aiState.textContent =
            "Connecting to AI...";


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

                        total_questions:
                            interviewConfig.totalQuestions

                    })

                }
            );


        if (!response.ok) {

            const errorText =
                await response.text();


            throw new Error(
                `Interview start failed: ${response.status} ${errorText}`
            );

        }


        const data =
            await response.json();


        if (!data.question) {

            throw new Error(
                "Server returned no question."
            );

        }


        questions = [
            data.question
        ];


        previousQuestions = [
            data.question
        ];


        previousAnswers = [];


        currentQuestion = 0;


        interviewRunning = true;


        loadQuestion();


        /*
           AI asks the first question.
        */

        setTimeout(
            speakQuestion,
            700
        );


    } catch (error) {

        console.error(
            "Interview start error:",
            error
        );


        interviewRunning = false;


        aiState.textContent =
            "AI connection failed";


        questionText.textContent =
            "Unable to start the AI interview.";


        recordingStatus.textContent =
            "Connection error";


        console.error(
            error.message
        );

    }

}


/* =========================================================
   COMPLETE INTERVIEW
========================================================= */

async function completeInterview() {

    interviewRunning = false;

    processingAnswer = true;


    clearInterval(
        timerInterval
    );


    clearTimeout(
        silenceTimer
    );


    if (recognition) {

        try {

            recognition.stop();

        } catch (error) {

            console.log(error);

        }

    }


    if (
        "speechSynthesis" in window
    ) {

        window.speechSynthesis.cancel();

    }


    aiState.textContent =
        "Interview completed";


    recordingStatus.textContent =
        "Final analysis complete";


    setSignal(
        "voiceSignal",
        "Complete",
        "signal-active"
    );


    setSignal(
        "responseSignal",
        "Complete",
        "signal-active"
    );


    setSignal(
        "consistencySignal",
        "Complete",
        "signal-active"
    );


    /*
       Keep camera on briefly so the user
       can see the final result.
    */

    setTimeout(() => {

        stopCamera();

    }, 1500);


    /*
       Do NOT redirect immediately.
       Keep the analysis visible.
    */

    questionText.textContent =
        "Interview completed successfully.";


    transcript.textContent =
        "Your responses have been analyzed. Review the AI assessment below.";


    if (endInterview) {

        endInterview.textContent =
            "Interview Completed";

        endInterview.disabled = true;

    }

}


/* =========================================================
   STOP CAMERA
========================================================= */

function stopCamera() {

    if (!stream) return;


    stream
        .getTracks()
        .forEach(
            track => track.stop()
        );


    stream = null;


    if (video) {

        video.srcObject = null;

    }


    if (placeholder) {

        placeholder.style.display =
            "flex";

    }


    if (cameraStatus) {

        cameraStatus.textContent =
            "Camera Off";

    }

}


/* =========================================================
   MANUAL END
========================================================= */

function manuallyEndInterview() {

    if (!interviewRunning) {

        return;

    }


    const confirmed =
        confirm(
            "Are you sure you want to end the interview?"
        );


    if (!confirmed) return;


    interviewRunning = false;


    clearInterval(
        timerInterval
    );


    clearTimeout(
        silenceTimer
    );


    if (recognition) {

        try {

            recognition.stop();

        } catch (error) {}

    }


    stopCamera();


    if (
        "speechSynthesis" in window
    ) {

        window.speechSynthesis.cancel();

    }


    aiState.textContent =
        "Interview ended";


    recordingStatus.textContent =
        "Ended";


    questionText.textContent =
        "Interview ended by candidate.";

}


/* =========================================================
   OPTIONAL SPEAK BUTTON
========================================================= */

if (speakButton) {

    speakButton.addEventListener(
        "click",
        speakQuestion
    );

}


/* =========================================================
   END BUTTON
========================================================= */

if (endInterview) {

    endInterview.addEventListener(
        "click",
        manuallyEndInterview
    );

}


/* =========================================================
   INITIALIZE
========================================================= */

async function initializeInterview() {

    console.log(
        "AI Interview Intelligence starting..."
    );


    startTimer();


    /*
       Request camera + microphone.
    */

    await startCamera();


    /*
       Prepare speech recognition.
    */

    setupSpeechRecognition();


    /*
       Start AI interview.
    */

    await startInterviewAPI();

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


        if (recognition) {

            try {

                recognition.stop();

            } catch (error) {}

        }


        if (stream) {

            stream
                .getTracks()
                .forEach(
                    track =>
                        track.stop()
                );

        }

    }
);