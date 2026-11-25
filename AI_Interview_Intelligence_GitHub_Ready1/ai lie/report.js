
"use strict";

/* =========================================================
   CONFIGURATION
========================================================= */

const API_URL = "http://127.0.0.1:8000";

const params = new URLSearchParams(
    window.location.search
);

const interviewId =
    params.get("id") ||
    localStorage.getItem("completedInterviewId") ||
    localStorage.getItem("lastInterviewReportId");

let currentReport = null;


/* =========================================================
   HELPERS
========================================================= */

function getElement(id) {
    return document.getElementById(id);
}

function setText(id, value) {
    const element = getElement(id);

    if (!element) {
        return;
    }

    element.textContent =
        value === null ||
        value === undefined ||
        value === ""
            ? "—"
            : String(value);
}

function safeNumber(value) {
    if (
        value === null ||
        value === undefined ||
        value === ""
    ) {
        return null;
    }

    const number = Number(value);

    return Number.isFinite(number)
        ? number
        : null;
}

function clamp(value) {
    const number = safeNumber(value);

    if (number === null) {
        return null;
    }

    return Math.max(
        0,
        Math.min(100, number)
    );
}

function average(values) {
    const validValues = values
        .map(safeNumber)
        .filter(value => value !== null);

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

function formatPercent(value) {
    const number = clamp(value);

    return number === null
        ? "—"
        : `${Math.round(number)}%`;
}

function escapeHTML(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function getObject(value) {
    return (
        value &&
        typeof value === "object" &&
        !Array.isArray(value)
    )
        ? value
        : {};
}

function getArray(value) {
    return Array.isArray(value)
        ? value
        : [];
}

function hasSummary(value) {
    return (
        value &&
        typeof value === "object" &&
        !Array.isArray(value) &&
        Object.keys(value).length > 0
    );
}

function getAnalysis(item) {
    const object = getObject(item);

    return getObject(
        object.analysis ||
        object.answer_analysis ||
        object.ai_analysis ||
        object
    );
}

function getFaceData(item) {
    const object = getObject(item);

    return getObject(
        object.face ||
        object.face_data ||
        object.expression_data ||
        object.behavior ||
        object.behavior_data ||
        {}
    );
}

function getMetric(object, keys) {
    object = getObject(object);

    for (const key of keys) {
        const value = safeNumber(object[key]);

        if (value !== null) {
            return clamp(value);
        }
    }

    return null;
}


/* =========================================================
   LOAD LOCAL REPORT DATA
========================================================= */

function getLocalReport() {
    try {
        const savedReport = localStorage.getItem(
            "aiInterviewReport"
        );

        if (!savedReport) {
            return null;
        }

        const report = JSON.parse(savedReport);

        return getObject(report);

    } catch (error) {
        console.error(
            "Unable to read local report:",
            error
        );

        return null;
    }
}


/* =========================================================
   LOAD REPORT
========================================================= */

async function loadReport() {

    const localReport = getLocalReport();

    console.log(
        "LOCAL REPORT:",
        localReport
    );

    if (!interviewId) {
        if (localReport) {
            renderReport(localReport);
        } else {
            showEmptyReport(
                "Interview report data is not available."
            );
        }

        return;
    }

    try {
        const response = await fetch(
            `${API_URL}/api/interview/${encodeURIComponent(interviewId)}`
        );

        if (!response.ok) {
            throw new Error(
                `Report request failed: ${response.status}`
            );
        }

        const result = await response.json();

        console.log(
            "INTERVIEW REPORT RESPONSE:",
            result
        );

        const backendReport =
            result.interview ||
            result.data ||
            result.report ||
            result;

        if (
            !backendReport ||
            typeof backendReport !== "object"
        ) {
            throw new Error(
                "Invalid report response."
            );
        }

        /*
         * Merge local and backend report data.
         *
         * Backend report fields take priority.
         * Behavioral summaries are preserved from
         * localStorage when missing on the backend.
         */

        const mergedReport = {
            ...(localReport || {}),
            ...backendReport,

            behavior_summary:
                hasSummary(
                    backendReport.behavior_summary
                )
                    ? backendReport.behavior_summary
                    : (
                        localReport?.behavior_summary ||
                        backendReport.behaviorSummary ||
                        localReport?.behaviorSummary ||
                        {}
                    ),

            expression_summary:
                hasSummary(
                    backendReport.expression_summary
                )
                    ? backendReport.expression_summary
                    : (
                        localReport?.expression_summary ||
                        backendReport.expressionSummary ||
                        localReport?.expressionSummary ||
                        {}
                    )
        };

        console.log(
            "MERGED REPORT:",
            mergedReport
        );

        renderReport(mergedReport);

    } catch (error) {
        console.error(
            "Unable to load report from backend:",
            error
        );

        if (localReport) {
            renderReport(localReport);
        } else {
            showEmptyReport(
                "Unable to load the interview report."
            );
        }
    }
}


/* =========================================================
   LOCAL REPORT FALLBACK
========================================================= */

function loadLocalReport() {
    const report = getLocalReport();

    if (!report) {
        showEmptyReport(
            "Interview report data is not available."
        );

        return;
    }

    renderReport(report);
}


/* =========================================================
   NORMALIZE REPORT DATA
========================================================= */

function normalizeReport(report) {
    report = getObject(report);

    const candidate = getObject(
        report.candidate ||
        report.candidate_details ||
        report.user ||
        {}
    );

    const questions = getArray(
        report.questions ||
        report.interview_questions ||
        []
    );

    const answers = getArray(
        report.answers ||
        report.responses ||
        report.interview_answers ||
        []
    );

    const analyses = getArray(
        report.analysis ||
        report.analyses ||
        report.answer_analyses ||
        report.analysis_history ||
        []
    );

    /*
     * Face and behavioral summary.
     * Do not mix expression_summary into this object.
     */

    const behaviorSummary = getObject(
        report.behavior_summary ||
        report.behaviorSummary ||
        report.face_summary ||
        report.faceSummary ||
        report.behavior ||
        report.behavior_data ||
        {}
    );

    /*
     * Expression summary is a separate metric group.
     */

    const expressionSummary = getObject(
        report.expression_summary ||
        report.expressionSummary ||
        {}
    );

    return {
        ...report,

        candidate,

        questions,

        answers,

        analysis: analyses,

        behavior_summary: behaviorSummary,

        expression_summary: expressionSummary
    };
}


/* =========================================================
   RENDER REPORT
========================================================= */

function renderReport(rawReport) {
    if (!rawReport) {
        showEmptyReport(
            "No interview report was found."
        );

        return;
    }

    const report = normalizeReport(rawReport);

    currentReport = report;

    console.log(
        "NORMALIZED REPORT:",
        report
    );

    console.log(
        "BEHAVIOR SUMMARY:",
        report.behavior_summary
    );

    renderCandidate(report);

    renderInterviewDetails(report);

    const scores = calculateScores(report);

    renderScores(scores);

    renderBehaviorMetrics(scores);

    renderQuestions(
        report.questions,
        report.answers,
        report.analysis
    );

    renderIndicators(report.analysis);

    renderFeedback(
        report.analysis,
        report
    );
}


/* =========================================================
   CANDIDATE INFORMATION
========================================================= */

function renderCandidate(report) {
    const candidate = getObject(
        report.candidate
    );

    const candidateName =
        candidate.name ||
        candidate.full_name ||
        report.candidate_name ||
        report.name ||
        "Candidate";

    const candidateEmail =
        candidate.email ||
        report.email ||
        "—";

    const candidateRole =
        report.role ||
        report.job_role ||
        report.position ||
        "Software Developer";

    setText(
        "candidateName",
        candidateName
    );

    setText(
        "candidateEmail",
        candidateEmail
    );

    setText(
        "candidateRole",
        candidateRole
    );

    setText(
        "candidateInitial",
        candidateName.charAt(0).toUpperCase()
    );

    setText(
        "interviewStatus",
        "Completed"
    );
}


/* =========================================================
   INTERVIEW DETAILS
========================================================= */

function renderInterviewDetails(report) {
    const questions = getArray(
        report.questions
    );

    const answers = getArray(
        report.answers
    );

    const analyses = getArray(
        report.analysis
    );

    const count = Math.max(
        questions.length,
        answers.length,
        analyses.length
    );

    setText(
        "questionCount",
        count
    );

    const duration = getDuration(report);

    setText(
        "interviewDuration",
        formatTime(duration)
    );
}


/* =========================================================
   CALCULATE SCORES
========================================================= */

function calculateScores(report) {
    const analyses = getArray(
        report.analysis
    );

    const behaviorSummary = getObject(
        report.behavior_summary
    );

    const relevanceValues = [];

    const consistencyValues = [];

    const indicatorValues = [];

    const eyeValues = [];

    const faceStabilityValues = [];

    const faceConfidenceValues = [];

    const behaviorStabilityValues = [];

    analyses.forEach(item => {
        const analysis = getAnalysis(item);

        const face = getFaceData(item);

        const relevance = getMetric(
            analysis,
            [
                "relevance_score",
                "relevanceScore",
                "relevance"
            ]
        );

        const consistency = getMetric(
            analysis,
            [
                "consistency_score",
                "consistencyScore",
                "consistency",
                "response_consistency"
            ]
        );

        const indicator = getMetric(
            analysis,
            [
                "deception_indicator_score",
                "potential_indicator_score",
                "potentialIndicators",
                "potential_indicators",
                "indicator_score"
            ]
        );

        const eye = getMetric(
            analysis,
            [
                "eye_activity",
                "eyeActivity"
            ]
        );

        const faceStability = getMetric(
            analysis,
            [
                "facial_stability",
                "face_stability",
                "faceStability"
            ]
        );

        const faceConfidence = getMetric(
            face,
            [
                "confidence",
                "face_confidence",
                "faceConfidence"
            ]
        );

        const faceEyeActivity = getMetric(
            face,
            [
                "eye_activity",
                "eyeActivity"
            ]
        );

        const faceStabilityValue = getMetric(
            face,
            [
                "face_stability",
                "faceStability"
            ]
        );

        if (relevance !== null) {
            relevanceValues.push(
                relevance
            );
        }

        if (consistency !== null) {
            consistencyValues.push(
                consistency
            );
        }

        if (indicator !== null) {
            indicatorValues.push(
                indicator
            );
        }

        if (eye !== null) {
            eyeValues.push(eye);
        } else if (faceEyeActivity !== null) {
            eyeValues.push(
                faceEyeActivity
            );
        }

        if (faceStability !== null) {
            faceStabilityValues.push(
                faceStability
            );
        } else if (
            faceStabilityValue !== null
        ) {
            faceStabilityValues.push(
                faceStabilityValue
            );
        }

        if (faceConfidence !== null) {
            faceConfidenceValues.push(
                faceConfidence
            );
        }

        const behavioral = getMetric(
            analysis,
            [
                "behavioral_stability",
                "behavioralStability"
            ]
        );

        if (behavioral !== null) {
            behaviorStabilityValues.push(
                behavioral
            );
        }
    });

    /*
     * Interview-wide face summary from
     * FaceAnalysis.getSummary()
     */

    const summaryEye = getMetric(
        behaviorSummary,
        [
            "average_eye_activity",
            "averageEyeActivity"
        ]
    );

    const summaryFaceStability = getMetric(
        behaviorSummary,
        [
            "average_face_stability",
            "averageFaceStability"
        ]
    );

    const summaryFaceConfidence = getMetric(
        behaviorSummary,
        [
            "average_confidence",
            "averageConfidence"
        ]
    );

    const summaryBehavioralStability = getMetric(
        behaviorSummary,
        [
            "average_behavioral_stability",
            "averageBehavioralStability"
        ]
    );

    const relevanceScore = average(
        relevanceValues
    );

    const consistencyScore = average(
        consistencyValues
    );

    const indicatorScore = average(
        indicatorValues
    );

    const eyeScore =
        summaryEye !== null
            ? summaryEye
            : average(eyeValues);

    const faceStabilityScore =
        summaryFaceStability !== null
            ? summaryFaceStability
            : average(faceStabilityValues);

    const faceDetectionScore =
        summaryFaceConfidence !== null
            ? summaryFaceConfidence
            : average(faceConfidenceValues);

    const behavioralScore =
        summaryBehavioralStability !== null
            ? summaryBehavioralStability
            : average(behaviorStabilityValues);

    return {
        relevance: relevanceScore,

        consistency: consistencyScore,

        indicator: indicatorScore,

        eye: eyeScore,

        face: faceStabilityScore,

        faceDetection: faceDetectionScore,

        behavioral:
            behavioralScore !== null
                ? behavioralScore
                : faceStabilityScore
    };
}


/* =========================================================
   RENDER SCORE CARDS
========================================================= */

function renderScores(scores) {
    setText(
        "overallRelevance",
        formatPercent(scores.relevance)
    );

    setText(
        "overallConsistency",
        formatPercent(scores.consistency)
    );

    setText(
        "overallBehavioralStability",
        formatPercent(scores.behavioral)
    );

    setText(
        "overallEyeActivity",
        formatPercent(scores.eye)
    );

    setText(
        "overallFaceStability",
        formatPercent(scores.face)
    );

    setText(
        "overallIndicator",
        formatPercent(scores.indicator)
    );
}


/* =========================================================
   RENDER BEHAVIOR METRICS
========================================================= */

function renderBehaviorMetrics(scores) {

    setBehavior(
        "faceDetectionValue",
        "faceDetectionBar",
        scores.faceDetection
    );

    setBehavior(
        "eyeActivityValue",
        "eyeActivityBar",
        scores.eye
    );

    setBehavior(
        "faceStabilityValue",
        "faceStabilityBar",
        scores.face
    );

    const summary = getObject(
        currentReport?.behavior_summary
    );

    setText(
        "faceSamples",
        summary.samples
    );

    setText(
        "detectedSamples",
        summary.detected_samples
    );

    setText(
        "faceDetected",
        summary.face_detected === true
            ? "Detected"
            : summary.face_detected === false
                ? "Not detected"
                : "—"
    );
}

function setBehavior(
    valueId,
    barId,
    value
) {
    const element = getElement(
        valueId
    );

    const bar = getElement(
        barId
    );

    const score = clamp(value);

    if (element) {
        element.textContent =
            score === null
                ? "—"
                : `${Math.round(score)}%`;
    }

    if (bar) {
        bar.style.width =
            score === null
                ? "0%"
                : `${Math.round(score)}%`;
    }
}


/* =========================================================
   RENDER QUESTIONS
========================================================= */

function renderQuestions(
    questions,
    answers,
    analyses
) {
    const container = getElement(
        "questionAnalysis"
    );

    if (!container) {
        return;
    }

    container.innerHTML = "";

    const total = Math.max(
        questions.length,
        answers.length,
        analyses.length
    );

    if (!total) {
        container.innerHTML = `
            <div class="empty-state">
                No question analysis available.
            </div>
        `;

        return;
    }

    for (let i = 0; i < total; i++) {
        const questionItem = questions[i];

        const answerItem = answers[i];

        const question =
            typeof questionItem === "string"
                ? questionItem
                : questionItem?.question ||
                  questionItem?.text ||
                  "Question unavailable";

        const answer =
            typeof answerItem === "string"
                ? answerItem
                : answerItem?.answer ||
                  answerItem?.response ||
                  "No answer recorded";

        const analysisItem =
            analyses[i] || {};

        const analysis = getAnalysis(
            analysisItem
        );

        const relevance = getMetric(
            analysis,
            [
                "relevance_score",
                "relevanceScore",
                "relevance"
            ]
        );

        const consistency = getMetric(
            analysis,
            [
                "consistency_score",
                "consistencyScore",
                "consistency"
            ]
        );

        const indicator = getMetric(
            analysis,
            [
                "deception_indicator_score",
                "potential_indicator_score",
                "potentialIndicators",
                "potential_indicators"
            ]
        );

        const card = document.createElement(
            "div"
        );

        card.className = "question-card";

        card.innerHTML = `
            <div class="question-header">

                <span class="question-number">
                    QUESTION ${String(i + 1).padStart(2, "0")}
                </span>

                <span class="question-score">
                    ${
                        relevance !== null &&
                        consistency !== null
                            ? formatPercent(
                                (
                                    relevance +
                                    consistency
                                ) / 2
                            )
                            : "—"
                    }
                </span>

            </div>

            <h3>
                ${escapeHTML(question)}
            </h3>

            <div class="answer-box">
                ${escapeHTML(answer)}
            </div>

            <div class="analysis-row">

                <div class="analysis-score">

                    <span>RELEVANCE</span>

                    <strong>
                        ${formatPercent(relevance)}
                    </strong>

                </div>

                <div class="analysis-score">

                    <span>CONSISTENCY</span>

                    <strong>
                        ${formatPercent(consistency)}
                    </strong>

                </div>

                <div class="analysis-score">

                    <span>POTENTIAL INDICATOR</span>

                    <strong>
                        ${formatPercent(indicator)}
                    </strong>

                </div>

            </div>
        `;

        container.appendChild(card);
    }
}


/* =========================================================
   RENDER POTENTIAL INDICATORS
========================================================= */

function renderIndicators(analyses) {
    const container = getElement(
        "indicatorList"
    );

    if (!container) {
        return;
    }

    const indicators = [];

    analyses.forEach(item => {
        const analysis = getAnalysis(
            item
        );

        const currentIndicators = getArray(
            analysis.indicators ||
            analysis.potential_indicators ||
            analysis.potentialIndicators
        );

        currentIndicators.forEach(
            indicator => {
                if (
                    typeof indicator === "string" &&
                    indicator.trim() &&
                    !indicators.includes(
                        indicator.trim()
                    )
                ) {
                    indicators.push(
                        indicator.trim()
                    );
                }
            }
        );
    });

    container.innerHTML = "";

    if (!indicators.length) {
        container.innerHTML = `
            <span class="empty-state">
                No potential indicators were recorded.
            </span>
        `;

        return;
    }

    indicators.forEach(indicator => {
        const element = document.createElement(
            "span"
        );

        element.className = "indicator";

        element.textContent = indicator;

        container.appendChild(element);
    });
}


/* =========================================================
   RENDER FEEDBACK
========================================================= */

function renderFeedback(
    analyses,
    report
) {
    const container = getElement(
        "overallFeedback"
    );

    if (!container) {
        return;
    }

    const overallFeedback =
        report.overall_feedback ||
        report.overallFeedback ||
        report.feedback;

    if (
        typeof overallFeedback === "string" &&
        overallFeedback.trim()
    ) {
        container.textContent =
            overallFeedback;

        return;
    }

    const feedbacks = [];

    analyses.forEach(item => {
        const analysis = getAnalysis(
            item
        );

        const feedback =
            analysis.feedback ||
            analysis.overall_feedback ||
            analysis.explanation;

        if (
            typeof feedback === "string" &&
            feedback.trim() &&
            !feedbacks.includes(
                feedback.trim()
            )
        ) {
            feedbacks.push(
                feedback.trim()
            );
        }
    });

    if (!feedbacks.length) {
        container.textContent =
            "The interview analysis has been completed. Review the individual response metrics and behavioral observations above.";

        return;
    }

    container.innerHTML = feedbacks
        .map(
            feedback =>
                `<p>${escapeHTML(feedback)}</p>`
        )
        .join("");
}


/* =========================================================
   DURATION
========================================================= */

function getDuration(report) {
    const directDuration = safeNumber(
        report.duration_seconds ??
        report.duration ??
        report.durationSeconds
    );

    if (directDuration !== null) {
        return Math.max(
            0,
            Math.round(directDuration)
        );
    }

    const startValue =
        report.started_at ||
        report.startedAt ||
        report.start_time;

    const endValue =
        report.completed_at ||
        report.completedAt ||
        report.end_time;

    if (startValue && endValue) {
        const start = new Date(
            startValue
        ).getTime();

        const end = new Date(
            endValue
        ).getTime();

        if (
            Number.isFinite(start) &&
            Number.isFinite(end)
        ) {
            return Math.max(
                0,
                Math.round(
                    (end - start) / 1000
                )
            );
        }
    }

    return 0;
}

function formatTime(seconds) {
    seconds = Math.max(
        0,
        Math.round(
            safeNumber(seconds) || 0
        )
    );

    const hours = Math.floor(
        seconds / 3600
    );

    const minutes = Math.floor(
        (seconds % 3600) / 60
    );

    const remaining = seconds % 60;

    if (hours > 0) {
        return (
            String(hours).padStart(2, "0") +
            ":" +
            String(minutes).padStart(2, "0") +
            ":" +
            String(remaining).padStart(2, "0")
        );
    }

    return (
        String(minutes).padStart(2, "0") +
        ":" +
        String(remaining).padStart(2, "0")
    );
}


/* =========================================================
   EMPTY REPORT
========================================================= */

function showEmptyReport(message) {
    const container = getElement(
        "questionAnalysis"
    );

    if (container) {
        container.innerHTML = `
            <div class="empty-state">
                ${escapeHTML(message)}
            </div>
        `;
    }

    setText(
        "overallFeedback",
        message
    );
}


/* =========================================================
   PDF GENERATION
========================================================= */

async function generatePDF() {

    if (
        !window.jspdf ||
        !window.jspdf.jsPDF
    ) {
        alert(
            "PDF library is not loaded. Check your internet connection and refresh the page."
        );

        return;
    }

    const { jsPDF } = window.jspdf;

    const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4"
    });

    const margin = 15;

    const pageWidth = 210;

    const contentWidth =
        pageWidth - margin * 2;

    let y = 18;

    function checkPage(height = 10) {
        if (y + height > 280) {
            doc.addPage();

            y = 18;
        }
    }

    function section(text) {
        checkPage(12);

        doc.setFont(
            "helvetica",
            "bold"
        );

        doc.setFontSize(12);

        doc.text(
            text,
            margin,
            y
        );

        y += 7;
    }

    function paragraph(
        text,
        size = 9
    ) {
        doc.setFont(
            "helvetica",
            "normal"
        );

        doc.setFontSize(size);

        const lines = doc.splitTextToSize(
            String(text || ""),
            contentWidth
        );

        const height =
            lines.length * 5 + 5;

        checkPage(height);

        doc.text(
            lines,
            margin,
            y
        );

        y += height;
    }

    function heading(text) {
        checkPage(14);

        doc.setFont(
            "helvetica",
            "bold"
        );

        doc.setFontSize(10);

        doc.text(
            text,
            margin,
            y
        );

        y += 6;
    }

    /* HEADER */

    doc.setFont(
        "helvetica",
        "bold"
    );

    doc.setFontSize(21);

    doc.text(
        "AI Interview Intelligence",
        margin,
        y
    );

    y += 9;

    doc.setFontSize(15);

    doc.text(
        "Interview Report",
        margin,
        y
    );

    y += 10;

    doc.setFont(
        "helvetica",
        "normal"
    );

    doc.setFontSize(9);

    doc.text(
        `Generated: ${new Date().toLocaleString()}`,
        margin,
        y
    );

    y += 10;

    /* CANDIDATE */

    section("Candidate Information");

    const name =
        getElement("candidateName")?.textContent ||
        "Candidate";

    const email =
        getElement("candidateEmail")?.textContent ||
        "—";

    const role =
        getElement("candidateRole")?.textContent ||
        "Software Developer";

    const status =
        getElement("interviewStatus")?.textContent ||
        "Completed";

    const questionCount =
        getElement("questionCount")?.textContent ||
        "0";

    const duration =
        getElement("interviewDuration")?.textContent ||
        "00:00";

    paragraph(`Candidate: ${name}`);

    paragraph(`Email: ${email}`);

    paragraph(`Role: ${role}`);

    paragraph(`Status: ${status}`);

    paragraph(`Questions: ${questionCount}`);

    paragraph(`Duration: ${duration}`);

    /* METRICS */

    section("Interview Metrics");

    const metrics = [
        [
            "Response Relevance",
            "overallRelevance"
        ],
        [
            "Response Consistency",
            "overallConsistency"
        ],
        [
            "Behavioral Stability",
            "overallBehavioralStability"
        ],
        [
            "Eye Activity",
            "overallEyeActivity"
        ],
        [
            "Facial Stability",
            "overallFaceStability"
        ],
        [
            "Potential Indicators",
            "overallIndicator"
        ]
    ];

    metrics.forEach(
        ([label, id]) => {
            const value =
                getElement(id)?.textContent ||
                "—";

            paragraph(
                `${label}: ${value}`
            );
        }
    );

    /* BEHAVIORAL OBSERVATIONS */

    section("Behavioral Observations");

    const behaviorSummary = getObject(
        currentReport?.behavior_summary
    );

    paragraph(
        `Face detected: ${
            behaviorSummary.face_detected === true
                ? "Yes"
                : behaviorSummary.face_detected === false
                    ? "No"
                    : "—"
        }`
    );

    paragraph(
        `Face analysis samples: ${
            behaviorSummary.samples ?? "—"
        }`
    );

    paragraph(
        `Detected samples: ${
            behaviorSummary.detected_samples ?? "—"
        }`
    );

    paragraph(
        `Average face confidence: ${
            formatPercent(
                behaviorSummary.average_confidence
            )
        }`
    );

    paragraph(
        `Average eye activity: ${
            formatPercent(
                behaviorSummary.average_eye_activity
            )
        }`
    );

    paragraph(
        `Average facial stability: ${
            formatPercent(
                behaviorSummary.average_face_stability
            )
        }`
    );

    section("Behavioral Observation Notice");

    paragraph(
        "Facial, eye activity, and other behavioral signals are contextual observations only. They do not establish whether a person is truthful or deceptive."
    );

/* =========================================================
   OBJECT DETECTION & INTERVIEW INTEGRITY
========================================================= */

section("Object Detection & Interview Integrity");

// Object detection values are saved directly on currentReport
// by saveLocalReportData() in in.js.
const reportData = getObject(currentReport);

// Support direct report fields and nested legacy formats.
const objectDetection = getObject(
    reportData.object_detection ||
    reportData.objectDetection ||
    reportData.object_detection_summary ||
    reportData.objectDetectionSummary ||
    reportData.integrity ||
    {}
);

// Strike events: direct report field first, then nested aliases.
const strikeEvents = getArray(
    reportData.object_strike_events ||
    reportData.objectStrikeEvents ||
    objectDetection.object_strike_events ||
    objectDetection.objectStrikeEvents ||
    objectDetection.strike_events ||
    objectDetection.strikeEvents ||
    []
);

// Total strikes: use the direct report value first.
const totalStrikesValue =
    reportData.object_detection_strikes ??
    reportData.objectDetectionStrikes ??
    objectDetection.object_detection_strikes ??
    objectDetection.total_strikes ??
    objectDetection.totalStrikes ??
    objectDetection.strikes ??
    strikeEvents.length;

const totalStrikes = safeNumber(
    totalStrikesValue
);

// Strike limit.
const strikeLimitValue =
    reportData.object_detection_strike_limit ??
    reportData.objectDetectionStrikeLimit ??
    objectDetection.object_detection_strike_limit ??
    objectDetection.strike_limit ??
    objectDetection.strikeLimit ??
    objectDetection.max_strikes ??
    objectDetection.maxStrikes ??
    2;

const strikeLimit = safeNumber(
    strikeLimitValue
);

// End reason is also stored directly by in.js.
const endReason =
    reportData.interview_end_reason ||
    reportData.interviewEndReason ||
    objectDetection.interview_end_reason ||
    objectDetection.end_reason ||
    objectDetection.endReason ||
    reportData.termination_reason ||
    reportData.terminationReason ||
    "completed";

// If the saved reason indicates termination, show Yes.
// Also infer automatic termination when the strike limit was reached.
const automaticallyEnded =
    endReason !== "completed" ||
    (
        totalStrikes !== null &&
        strikeLimit !== null &&
        totalStrikes >= strikeLimit
    );

const detectedObjects = [
    ...new Set(
        strikeEvents
            .map(event => {
                const strike = getObject(event);

                return (
                    strike.object ||
                    strike.detected_object ||
                    strike.detectedObject ||
                    strike.class_name ||
                    strike.className ||
                    ""
                );
            })
            .filter(Boolean)
    )
];

paragraph(
    `Detected Object(s): ${
        detectedObjects.length
            ? detectedObjects.join(", ")
            : "—"
    }`
);

paragraph(
    `Total Object Detection Strikes: ${
        totalStrikes !== null
            ? totalStrikes
            : strikeEvents.length
    }`
);

paragraph(
    `Strike Limit: ${
        strikeLimit !== null
            ? strikeLimit
            : 2
    }`
);

paragraph(
    `Interview Automatically Ended: ${
        automaticallyEnded
            ? "Yes"
            : "No"
    }`
);

paragraph(
    `Termination Reason: ${
        endReason === "completed"
            ? "Interview completed normally"
            : endReason
    }`
);

heading("Object Detection Strike Events");

if (strikeEvents.length === 0) {

    paragraph(
        "No object detection strike events were recorded in the report data."
    );

} else {

    strikeEvents.forEach((event, index) => {

        const strike = getObject(event);

        const strikeNumber =
            strike.strike ??
            index + 1;

        const eventObject =
            strike.object ||
            strike.detected_object ||
            strike.detectedObject ||
            strike.class_name ||
            strike.className ||
            "Unknown object";

        const timestamp =
            strike.timestamp ||
            strike.time ||
            strike.detected_at ||
            strike.detectedAt ||
            "—";

        const message =
            strike.message ||
            `Object detected: ${eventObject}`;

        heading(
            `Strike ${strikeNumber}`
        );

        paragraph(
            `Detected Object: ${eventObject}`
        );

        paragraph(
            `Timestamp: ${timestamp}`
        );

        paragraph(
            `Event: ${message}`
        );
    });
}

    /* QUESTION ANALYSIS */

    section("Question-by-Question Analysis");

    const cards = document.querySelectorAll(
        ".question-card"
    );

    if (!cards.length) {
        paragraph(
            "No question analysis was recorded."
        );
    }

    cards.forEach(
        (card, index) => {
            const question =
                card.querySelector("h3")?.textContent ||
                "Question unavailable";

            const answer =
                card.querySelector(".answer-box")?.textContent ||
                "No answer recorded";

            const scores =
                card.querySelectorAll(
                    ".analysis-score strong"
                );

            checkPage(20);

            heading(
                `Question ${index + 1}`
            );

            paragraph(
                `Question: ${question}`
            );

            paragraph(
                `Answer: ${answer}`
            );

            if (scores.length >= 3) {
                paragraph(
                    `Relevance: ${scores[0].textContent} | Consistency: ${scores[1].textContent} | Potential Indicator: ${scores[2].textContent}`
                );
            }
        }
    );

    /* INDICATORS */

    section("Potential Indicators");

    const indicators = document.querySelectorAll(
        "#indicatorList .indicator"
    );

    if (!indicators.length) {
        paragraph(
            "No potential indicators were recorded."
        );
    } else {
        indicators.forEach(
            item => {
                paragraph(
                    `- ${item.textContent}`
                );
            }
        );
    }

    /* FEEDBACK */

    section("Overall Feedback");

    const feedback =
        getElement("overallFeedback")?.textContent ||
        "Analysis completed.";

    paragraph(feedback);

    /* FOOTER */

    checkPage(12);

    doc.setFont(
        "helvetica",
        "italic"
    );

    doc.setFontSize(8);

    doc.text(
        "AI Interview Intelligence — Generated interview analysis report",
        margin,
        285
    );

    /* DOWNLOAD */

    const safeName = name
        .replace(/[^a-z0-9]/gi, "_")
        .replace(/_+/g, "_");

    doc.save(
        `AI_Interview_Report_${safeName}.pdf`
    );
}


/* =========================================================
   PDF BUTTONS
========================================================= */

const downloadPDF = getElement(
    "downloadPDF"
);

const downloadPDFBottom = getElement(
    "downloadPDFBottom"
);

if (downloadPDF) {
    downloadPDF.addEventListener(
        "click",
        generatePDF
    );
}

if (downloadPDFBottom) {
    downloadPDFBottom.addEventListener(
        "click",
        generatePDF
    );
}


/* =========================================================
   BACK TO INTERVIEW
========================================================= */

const backToInterview = getElement(
    "backToInterview"
);

if (backToInterview) {
    backToInterview.addEventListener(
        "click",
        () => {
            window.location.href =
                "interview.html";
        }
    );
}


/* =========================================================
   NEW INTERVIEW
========================================================= */

const newInterview = getElement(
    "newInterview"
);

if (newInterview) {
    newInterview.addEventListener(
        "click",
        () => {
            localStorage.removeItem(
                "completedInterviewId"
            );

            localStorage.removeItem(
                "lastInterviewReportId"
            );

            localStorage.removeItem(
                "aiInterviewReport"
            );

            localStorage.removeItem(
                "latestInterviewAnalysis"
            );

            window.location.href =
                "interview.html";
        }
    );
}


/* =========================================================
   INITIALIZE REPORT PAGE
========================================================= */

loadReport();
