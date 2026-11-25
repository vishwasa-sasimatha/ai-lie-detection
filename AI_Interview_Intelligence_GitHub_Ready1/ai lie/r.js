"use strict";

const API_URL =
    "http://127.0.0.1:8000";

const params =
    new URLSearchParams(
        window.location.search
    );

const interviewId =
    params.get("id") ||
    localStorage.getItem(
        "completedInterviewId"
    ) ||
    localStorage.getItem(
        "lastInterviewReportId"
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


function clamp(value) {

    return Math.max(
        0,
        Math.min(
            100,
            safeNumber(value)
        )
    );

}


function setText(
    id,
    value
) {

    const element =
        document.getElementById(id);

    if (element) {

        element.textContent =
            value;

    }

}


function escapeHTML(value) {

    return String(value ?? "")

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
   LOAD REPORT
========================================================= */

async function loadReport() {

    if (!interviewId) {

        loadLocalReport();

        return;

    }


    try {

        const response =
            await fetch(
                `${API_URL}/api/interview/${encodeURIComponent(interviewId)}`
            );


        if (!response.ok) {

            throw new Error(
                `Report request failed: ${response.status}`
            );

        }


        const data =
            await response.json();


        console.log(
            "INTERVIEW REPORT:",
            data
        );


        const report =
            data.interview ||
            data.data ||
            data;


        renderReport(
            report
        );


    } catch (error) {

        console.error(
            "Report loading failed:",
            error
        );


        loadLocalReport();

    }

}


/* =========================================================
   LOCAL FALLBACK
========================================================= */

function loadLocalReport() {

    try {

        const saved =
            localStorage.getItem(
                "aiInterviewReport"
            );


        if (!saved) {

            showEmptyReport(
                "Interview report data is not available."
            );

            return;

        }


        const report =
            JSON.parse(saved);


        renderReport(
            report
        );


    } catch (error) {

        console.error(
            "Local report error:",
            error
        );


        showEmptyReport(
            "Unable to load interview report."
        );

    }

}


/* =========================================================
   RENDER REPORT
========================================================= */

function renderReport(report) {

    if (!report) {

        showEmptyReport(
            "No interview report found."
        );

        return;

    }


    /* =====================================================
       CANDIDATE
    ===================================================== */

    const candidate =
        report.candidate ||
        {};


    const candidateName =
        candidate.name ||
        report.name ||
        "Candidate";


    const candidateEmail =
        candidate.email ||
        report.email ||
        "—";


    setText(
        "candidateName",
        candidateName
    );


    setText(
        "candidateEmail",
        candidateEmail
    );


    setText(
        "candidateInitial",
        candidateName
            .charAt(0)
            .toUpperCase()
    );


    setText(
        "candidateRole",
        report.role ||
        "Software Developer"
    );


    setText(
        "interviewStatus",
        report.status ===
        "completed"
            ? "Completed"
            : "Completed"
    );


    /* =====================================================
       QUESTIONS
    ===================================================== */

    const questions =
        Array.isArray(
            report.questions
        )
            ? report.questions
            : [];


    const answers =
        Array.isArray(
            report.answers
        )
            ? report.answers
            : [];


    const analyses =
        Array.isArray(
            report.analysis
        )
            ? report.analysis
            : [];


    const count =
        Math.max(
            questions.length,
            answers.length,
            analyses.length
        );


    setText(
        "questionCount",
        count
    );


    /* =====================================================
       DURATION
    ===================================================== */

    const duration =
        getDuration(
            report
        );


    setText(
        "interviewDuration",
        formatTime(
            duration
        )
    );


    /* =====================================================
       ANALYSIS SCORES
    ===================================================== */

    const scoreData =
        calculateScores(
            report
        );


    setText(
        "overallRelevance",
        `${scoreData.relevance}%`
    );


    setText(
        "overallConsistency",
        `${scoreData.consistency}%`
    );


    setText(
        "overallBehavioralStability",
        `${scoreData.behavioral}%`
    );


    setText(
        "overallEyeActivity",
        `${scoreData.eye}%`
    );


    setText(
        "overallFaceStability",
        `${scoreData.face}%`
    );


    setText(
        "overallIndicator",
        `${scoreData.indicator}%`
    );


    /* =====================================================
       BEHAVIOR
    ===================================================== */

    setBehavior(
        "faceDetectionValue",
        "faceDetectionBar",
        scoreData.faceDetection
    );


    setBehavior(
        "eyeActivityValue",
        "eyeActivityBar",
        scoreData.eye
    );


    setBehavior(
        "faceStabilityValue",
        "faceStabilityBar",
        scoreData.face
    );


    /* =====================================================
       QUESTIONS
    ===================================================== */

    renderQuestions(
        questions,
        answers,
        analyses
    );


    /* =====================================================
       INDICATORS
    ===================================================== */

    renderIndicators(
        analyses
    );


    /* =====================================================
       FEEDBACK
    ===================================================== */

    renderFeedback(
        analyses,
        report
    );

}


/* =========================================================
   CALCULATE SCORES
========================================================= */

function calculateScores(report) {

    const analyses =
        Array.isArray(
            report.analysis
        )
            ? report.analysis
            : [];


    if (!analyses.length) {

        const local =
            localStorage.getItem(
                "latestInterviewAnalysis"
            );


        if (local) {

            try {

                const latest =
                    JSON.parse(local);


                return {

                    relevance:
                        Math.round(
                            clamp(
                                latest.relevance_score
                            )
                        ),

                    consistency:
                        Math.round(
                            clamp(
                                latest.consistency_score
                            )
                        ),

                    behavioral:
                        Math.round(
                            clamp(
                                latest.behavioral_stability
                            )
                        ),

                    eye:
                        Math.round(
                            clamp(
                                latest.eye_activity
                            )
                        ),

                    face:
                        Math.round(
                            clamp(
                                latest.facial_stability
                            )
                        ),

                    indicator:
                        Math.round(
                            clamp(
                                latest.deception_indicator_score
                            )
                        ),

                    faceDetection:
                        0

                };

            } catch (error) {}

        }


        return {

            relevance: 0,

            consistency: 0,

            behavioral: 0,

            eye: 0,

            face: 0,

            indicator: 0,

            faceDetection: 0

        };

    }


    let relevanceTotal = 0;

    let consistencyTotal = 0;

    let indicatorTotal = 0;

    let behavioralTotal = 0;

    let eyeTotal = 0;

    let faceTotal = 0;

    let faceDetectionTotal = 0;

    let faceCount = 0;


    analyses.forEach(
        item => {

            const analysis =
                item.analysis &&
                typeof item.analysis ===
                "object"

                    ? item.analysis

                    : item;


            const relevance =
                safeNumber(
                    analysis.relevance_score ??
                    analysis.relevanceScore ??
                    analysis.relevance
                );


            const consistency =
                safeNumber(
                    analysis.consistency_score ??
                    analysis.consistencyScore ??
                    analysis.consistency ??
                    analysis.response_consistency
                );


            const indicator =
                safeNumber(
                    analysis.deception_indicator_score ??
                    analysis.potential_indicator_score ??
                    analysis.potentialIndicators ??
                    analysis.potential_indicators
                );


            relevanceTotal +=
                clamp(relevance);


            consistencyTotal +=
                clamp(consistency);


            indicatorTotal +=
                clamp(indicator);


            const face =
                item.face ||
                item.expression_data ||
                {};


            const behavioral =
                safeNumber(
                    analysis.behavioral_stability ??
                    face.face_stability ??
                    face.faceStability
                );


            const eye =
                safeNumber(
                    analysis.eye_activity ??
                    face.eye_activity ??
                    face.eyeActivity
                );


            const facial =
                safeNumber(
                    analysis.facial_stability ??
                    face.face_stability ??
                    face.faceStability
                );


            const detected =
                face.face_detected ||
                face.detected;


            behavioralTotal +=
                clamp(behavioral);


            eyeTotal +=
                clamp(eye);


            faceTotal +=
                clamp(facial);


            faceDetectionTotal +=
                detected ? 100 : 0;


            faceCount++;

        }
    );


    const total =
        analyses.length;


    return {

        relevance:
            Math.round(
                relevanceTotal / total
            ),

        consistency:
            Math.round(
                consistencyTotal / total
            ),

        behavioral:
            Math.round(
                behavioralTotal /
                Math.max(
                    1,
                    faceCount
                )
            ),

        eye:
            Math.round(
                eyeTotal /
                Math.max(
                    1,
                    faceCount
                )
            ),

        face:
            Math.round(
                faceTotal /
                Math.max(
                    1,
                    faceCount
                )
            ),

        indicator:
            Math.round(
                indicatorTotal / total
            ),

        faceDetection:
            Math.round(
                faceDetectionTotal /
                Math.max(
                    1,
                    faceCount
                )
            )

    };

}


/* =========================================================
   BEHAVIOR BAR
========================================================= */

function setBehavior(
    valueId,
    barId,
    value
) {

    const score =
        Math.round(
            clamp(value)
        );


    setText(
        valueId,
        `${score}%`
    );


    const bar =
        document.getElementById(
            barId
        );


    if (bar) {

        bar.style.width =
            `${score}%`;

    }

}


/* =========================================================
   QUESTION RENDER
========================================================= */

function renderQuestions(
    questions,
    answers,
    analyses
) {

    const container =
        document.getElementById(
            "questionAnalysis"
        );


    if (!container) {
        return;
    }


    container.innerHTML =
        "";


    const total =
        Math.max(
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


    for (
        let i = 0;
        i < total;
        i++
    ) {

        const question =
            typeof questions[i] ===
            "string"

                ? questions[i]

                : questions[i]?.question ||
                  "Question unavailable";


        const answer =
            typeof answers[i] ===
            "string"

                ? answers[i]

                : answers[i]?.answer ||
                  "No answer recorded";


        const rawAnalysis =
            analyses[i] || {};


        const analysis =
            rawAnalysis.analysis &&
            typeof rawAnalysis.analysis ===
            "object"

                ? rawAnalysis.analysis

                : rawAnalysis;


        const relevance =
            clamp(
                analysis.relevance_score ??
                analysis.relevanceScore ??
                analysis.relevance
            );


        const consistency =
            clamp(
                analysis.consistency_score ??
                analysis.consistencyScore ??
                analysis.consistency
            );


        const indicator =
            clamp(
                analysis.deception_indicator_score ??
                analysis.potential_indicator_score ??
                analysis.potentialIndicators ??
                analysis.potential_indicators
            );


        const card =
            document.createElement(
                "div"
            );


        card.className =
            "question-card";


        card.innerHTML = `

            <div class="question-header">

                <span class="question-number">
                    QUESTION ${String(i + 1).padStart(2, "0")}
                </span>

                <span class="question-score">
                    ${Math.round(
                        (relevance + consistency) / 2
                    )}%
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

                    <span>
                        RELEVANCE
                    </span>

                    <strong>
                        ${Math.round(relevance)}%
                    </strong>

                </div>


                <div class="analysis-score">

                    <span>
                        CONSISTENCY
                    </span>

                    <strong>
                        ${Math.round(consistency)}%
                    </strong>

                </div>


                <div class="analysis-score">

                    <span>
                        POTENTIAL INDICATOR
                    </span>

                    <strong>
                        ${Math.round(indicator)}%
                    </strong>

                </div>

            </div>

        `;


        container.appendChild(
            card
        );

    }

}


/* =========================================================
   INDICATORS
========================================================= */

function renderIndicators(
    analyses
) {

    const container =
        document.getElementById(
            "indicatorList"
        );


    if (!container) {
        return;
    }


    const indicators =
        [];


    analyses.forEach(
        item => {

            const analysis =
                item.analysis &&
                typeof item.analysis ===
                "object"

                    ? item.analysis

                    : item;


            if (
                Array.isArray(
                    analysis.indicators
                )
            ) {

                analysis.indicators
                    .forEach(
                        indicator => {

                            if (
                                indicator &&
                                !indicators.includes(
                                    indicator
                                )
                            ) {

                                indicators.push(
                                    indicator
                                );

                            }

                        }
                    );

            }

        }
    );


    container.innerHTML =
        "";


    if (!indicators.length) {

        container.innerHTML = `
            <span class="empty-state">
                No potential indicators were recorded.
            </span>
        `;

        return;

    }


    indicators.forEach(
        indicator => {

            const element =
                document.createElement(
                    "span"
                );


            element.className =
                "indicator";


            element.textContent =
                indicator;


            container.appendChild(
                element
            );

        }
    );

}


/* =========================================================
   FEEDBACK
========================================================= */

function renderFeedback(
    analyses,
    report
) {

    const container =
        document.getElementById(
            "overallFeedback"
        );


    if (!container) {
        return;
    }


    const feedbacks =
        [];


    analyses.forEach(
        item => {

            const analysis =
                item.analysis &&
                typeof item.analysis ===
                "object"

                    ? item.analysis

                    : item;


            if (
                analysis.feedback &&
                !feedbacks.includes(
                    analysis.feedback
                )
            ) {

                feedbacks.push(
                    analysis.feedback
                );

            }

        }
    );


    if (
        report.overall_feedback
    ) {

        container.textContent =
            report.overall_feedback;

        return;

    }


    if (!feedbacks.length) {

        container.textContent =
            "The interview analysis has been completed. Review the individual response metrics and observed behavioral signals above.";

        return;

    }


    container.innerHTML =
        feedbacks
            .map(
                item =>
                    `<p>${escapeHTML(item)}</p>`
            )
            .join("<br>");

}


/* =========================================================
   DURATION
========================================================= */

function getDuration(report) {

    if (
        report.duration_seconds
    ) {

        return safeNumber(
            report.duration_seconds
        );

    }


    if (
        report.duration
    ) {

        return safeNumber(
            report.duration
        );

    }


    if (
        report.started_at &&
        report.completed_at
    ) {

        const start =
            new Date(
                report.started_at
            ).getTime();


        const end =
            new Date(
                report.completed_at
            ).getTime();


        if (
            Number.isFinite(start) &&
            Number.isFinite(end)
        ) {

            return Math.max(
                0,
                Math.round(
                    (end - start) /
                    1000
                )
            );

        }

    }


    return 0;

}


/* =========================================================
   FORMAT TIME
========================================================= */

function formatTime(
    seconds
) {

    seconds =
        Math.max(
            0,
            Math.round(
                safeNumber(seconds)
            )
        );


    const hours =
        Math.floor(
            seconds / 3600
        );


    const minutes =
        Math.floor(
            (seconds % 3600) / 60
        );


    const remaining =
        seconds % 60;


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

function showEmptyReport(
    message
) {

    const container =
        document.getElementById(
            "questionAnalysis"
        );


    if (container) {

        container.innerHTML = `
            <div class="empty-state">
                ${escapeHTML(message)}
            </div>
        `;

    }

}


/* =========================================================
   GENERATE PDF
========================================================= */

async function generatePDF() {

    if (
        !window.jspdf ||
        !window.jspdf.jsPDF
    ) {

        alert(
            "PDF library is not loaded. Please check your internet connection and refresh the page."
        );

        return;

    }


    const {
        jsPDF
    } =
        window.jspdf;


    const doc =
        new jsPDF({
            orientation: "portrait",
            unit: "mm",
            format: "a4"
        });


    const margin =
        15;

    const pageWidth =
        210;

    const contentWidth =
        pageWidth -
        margin * 2;


    let y =
        18;


    /* =====================================================
       PDF HELPERS
    ===================================================== */

    function checkPage(
        height = 10
    ) {

        if (
            y + height >
            280
        ) {

            doc.addPage();

            y = 18;

        }

    }


    function title(
        text
    ) {

        checkPage(12);

        doc.setFont(
            "helvetica",
            "bold"
        );

        doc.setFontSize(
            18
        );

        doc.text(
            text,
            margin,
            y
        );

        y += 10;

    }


    function section(
        text
    ) {

        checkPage(12);

        doc.setFont(
            "helvetica",
            "bold"
        );

        doc.setFontSize(
            12
        );

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

        doc.setFontSize(
            size
        );


        const lines =
            doc.splitTextToSize(
                String(text || ""),
                contentWidth
            );


        checkPage(
            lines.length * 5 + 5
        );


        doc.text(
            lines,
            margin,
            y
        );


        y +=
            lines.length * 5 +
            5;

    }


    /* =====================================================
       HEADER
    ===================================================== */

    doc.setFont(
        "helvetica",
        "bold"
    );

    doc.setFontSize(
        22
    );


    doc.text(
        "AI Interview Intelligence",
        margin,
        y
    );


    y += 9;


    doc.setFontSize(
        16
    );


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


    doc.setFontSize(
        9
    );


    doc.text(
        `Generated: ${new Date().toLocaleString()}`,
        margin,
        y
    );


    y += 10;


    /* =====================================================
       CANDIDATE INFORMATION
    ===================================================== */

    section(
        "Candidate Information"
    );


    const name =
        document.getElementById(
            "candidateName"
        )?.textContent ||
        "Candidate";


    const email =
        document.getElementById(
            "candidateEmail"
        )?.textContent ||
        "—";


    const role =
        document.getElementById(
            "candidateRole"
        )?.textContent ||
        "Software Developer";


    const status =
        document.getElementById(
            "interviewStatus"
        )?.textContent ||
        "Completed";


    const questionCount =
        document.getElementById(
            "questionCount"
        )?.textContent ||
        "0";


    const duration =
        document.getElementById(
            "interviewDuration"
        )?.textContent ||
        "00:00";


    paragraph(
        `Candidate: ${name}`
    );


    paragraph(
        `Email: ${email}`
    );


    paragraph(
        `Role: ${role}`
    );


    paragraph(
        `Status: ${status}`
    );


    paragraph(
        `Questions: ${questionCount}`
    );


    paragraph(
        `Duration: ${duration}`
    );


    /* =====================================================
       METRICS
    ===================================================== */

    section(
        "Interview Metrics"
    );


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
                document.getElementById(
                    id
                )?.textContent ||
                "0%";


            paragraph(
                `${label}: ${value}`
            );

        }
    );


    /* =====================================================
       BEHAVIORAL NOTICE
    ===================================================== */

    section(
        "Behavioral Observation Notice"
    );


    paragraph(
        "Facial, eye activity, response timing, consistency, and other behavioral signals are contextual observations only. They do not establish whether a person is truthful or deceptive."
    );


    /* =====================================================
       QUESTION ANALYSIS
    ===================================================== */

    section(
        "Question-by-Question Analysis"
    );


    const cards =
        document.querySelectorAll(
            ".question-card"
        );


    cards.forEach(
        (card, index) => {

            const question =
                card.querySelector(
                    "h3"
                )?.textContent ||
                "";


            const answer =
                card.querySelector(
                    ".answer-box"
                )?.textContent ||
                "";


            const scores =
                card.querySelectorAll(
                    ".analysis-score strong"
                );


            checkPage(30);


            doc.setFont(
                "helvetica",
                "bold"
            );

            doc.setFontSize(
                10
            );


            doc.text(
                `Question ${index + 1}`,
                margin,
                y
            );


            y += 6;


            paragraph(
                `Question: ${question}`,
                9
            );


            paragraph(
                `Answer: ${answer}`,
                9
            );


            if (
                scores.length >= 3
            ) {

                paragraph(
                    `Relevance: ${scores[0].textContent} | Consistency: ${scores[1].textContent} | Potential Indicator: ${scores[2].textContent}`,
                    9
                );

            }

        }
    );


    /* =====================================================
       POTENTIAL INDICATORS
    ===================================================== */

    section(
        "Potential Indicators"
    );


    const indicators =
        document.querySelectorAll(
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
                    `• ${item.textContent}`
                );

            }
        );

    }


    /* =====================================================
       FEEDBACK
    ===================================================== */

    section(
        "Overall Feedback"
    );


    const feedback =
        document.getElementById(
            "overallFeedback"
        )?.textContent ||
        "Analysis completed.";


    paragraph(
        feedback
    );


    /* =====================================================
       FOOTER
    ===================================================== */

    checkPage(20);


    doc.setFontSize(
        8
    );


    doc.setFont(
        "helvetica",
        "italic"
    );


    doc.text(
        "AI Interview Intelligence — Generated interview analysis report",
        margin,
        285
    );


    /* =====================================================
       DOWNLOAD
    ===================================================== */

    const safeName =
        name
            .replace(
                /[^a-z0-9]/gi,
                "_"
            )
            .replace(
                /_+/g,
                "_"
            );


    doc.save(
        `AI_Interview_Report_${safeName}.pdf`
    );

}


/* =========================================================
   BUTTON EVENTS
========================================================= */

const downloadPDF =
    document.getElementById(
        "downloadPDF"
    );


const downloadPDFBottom =
    document.getElementById(
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
   BACK
========================================================= */

const backToInterview =
    document.getElementById(
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

const newInterview =
    document.getElementById(
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
                "aiInterviewAnalysisHistory"
            );

            window.location.href =
                "interview.html";

        }
    );

}


/* =========================================================
   LOAD
========================================================= */

loadReport();