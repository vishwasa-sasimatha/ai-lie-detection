
"use strict";

/*
=========================================================
 AI INTERVIEW INTELLIGENCE
 RESUME ANALYSIS FRONTEND
=========================================================
*/

const API_URL = "http://127.0.0.1:8000";

const ANALYZE_URL =
    `${API_URL}/api/resume/analyze`;


/* =====================================================
   STATE
   ===================================================== */

let selectedFile = null;

let isAnalyzing = false;

let analysisResult = null;


/* =====================================================
   DOM
   ===================================================== */

const resumeInput =
    document.getElementById("resumeInput");

const uploadArea =
    document.getElementById("uploadArea");

const uploadButton =
    document.getElementById("uploadButton");

const removeFile =
    document.getElementById("removeFile");

const analyzeButton =
    document.getElementById("analyzeResume");

const fileName =
    document.getElementById("fileName");

const fileSize =
    document.getElementById("fileSize");

const uploadStatus =
    document.getElementById("uploadStatus");

const loading =
    document.getElementById("analysisLoading");

const loadingText =
    document.getElementById("loadingText");

const errorBox =
    document.getElementById("analysisError");

const errorMessage =
    document.getElementById("errorMessage");

const results =
    document.getElementById("analysisPanel");


/* =====================================================
   FILE VALIDATION
   ===================================================== */

function validateFile(file) {

    if (!file) {

        return {
            valid: false,
            message: "Please select a resume."
        };

    }


    const allowed =
        [".pdf", ".docx", ".txt"];


    const name =
        file.name.toLowerCase();


    const validExtension =
        allowed.some(
            extension =>
                name.endsWith(extension)
        );


    if (!validExtension) {

        return {
            valid: false,
            message:
                "Only PDF, DOCX and TXT files are supported."
        };

    }


    const maxSize =
        10 * 1024 * 1024;


    if (file.size > maxSize) {

        return {
            valid: false,
            message:
                "Resume must be smaller than 10 MB."
        };

    }


    return {
        valid: true
    };

}


/* =====================================================
   FILE SIZE
   ===================================================== */

function formatFileSize(bytes) {

    if (!bytes) {
        return "";
    }


    const mb =
        bytes / (1024 * 1024);


    if (mb >= 1) {

        return `${mb.toFixed(2)} MB`;

    }


    const kb =
        bytes / 1024;


    return `${kb.toFixed(1)} KB`;

}


/* =====================================================
   SELECT FILE
   ===================================================== */

function selectFile(file) {

    const validation =
        validateFile(file);


    if (!validation.valid) {

        showError(
            validation.message
        );

        return;

    }


    selectedFile = file;


    fileName.textContent =
        file.name;

    fileSize.textContent =
        formatFileSize(file.size);


    uploadStatus.textContent =
        "Resume ready for analysis";

    uploadStatus.classList.add(
        "success"
    );


    analyzeButton.disabled =
        false;


    removeFile.style.display =
        "inline-block";


    uploadArea.classList.add(
        "file-selected"
    );


    hideError();


    console.log(
        "Resume selected:",
        file.name
    );

}


/* =====================================================
   REMOVE FILE
   ===================================================== */

function clearFile() {

    selectedFile = null;

    analysisResult = null;


    resumeInput.value = "";


    fileName.textContent =
        "No file selected";

    fileSize.textContent =
        "";


    uploadStatus.textContent =
        "Waiting for resume";

    uploadStatus.classList.remove(
        "success"
    );


    analyzeButton.disabled =
        true;


    removeFile.style.display =
        "none";


    uploadArea.classList.remove(
        "file-selected"
    );


    results.style.display =
        "none";


    hideError();

}


/* =====================================================
   LOADING
   ===================================================== */

function setLoading(active) {

    isAnalyzing = active;


    if (active) {

        loading.style.display =
            "flex";

        results.style.display =
            "none";

        analyzeButton.disabled =
            true;

        analyzeButton.innerHTML =
            `
            <span>Analyzing...</span>
            <span>◌</span>
            `;

    } else {

        loading.style.display =
            "none";

        analyzeButton.disabled =
            !selectedFile;

        analyzeButton.innerHTML =
            `
            <span>Analyze Resume</span>
            <span>→</span>
            `;

    }

}


/* =====================================================
   ERROR
   ===================================================== */

function showError(message) {

    errorMessage.textContent =
        message;

    errorBox.style.display =
        "block";

}


function hideError() {

    errorBox.style.display =
        "none";

}


/* =====================================================
   SAFE TEXT
   ===================================================== */

function safeText(value) {

    if (
        value === null ||
        value === undefined
    ) {

        return "";

    }


    return String(value);

}


/* =====================================================
   SKILL TAG
   ===================================================== */

function createSkillTag(skill) {

    const element =
        document.createElement("span");


    element.className =
        "skill-tag";


    element.textContent =
        safeText(skill);


    return element;

}


/* =====================================================
   RENDER SKILLS
   ===================================================== */

function renderSkills(
    element,
    skills
) {

    if (!element) {
        return;
    }


    element.innerHTML = "";


    if (
        !Array.isArray(skills) ||
        skills.length === 0
    ) {

        const empty =
            document.createElement("span");


        empty.className =
            "empty-skill";


        empty.textContent =
            "No skills detected";


        element.appendChild(
            empty
        );


        return;

    }


    skills.forEach(
        skill => {

            element.appendChild(
                createSkillTag(skill)
            );

        }
    );

}


/* =====================================================
   RENDER EXPERIENCE
   ===================================================== */

function renderExperience(
    experience
) {

    const container =
        document.getElementById(
            "experienceList"
        );


    container.innerHTML = "";


    if (
        !Array.isArray(experience) ||
        experience.length === 0
    ) {

        container.innerHTML =
            `
            <div class="result-item">
                <p>
                    No professional experience detected.
                </p>
            </div>
            `;

        return;

    }


    experience.forEach(
        item => {

            const card =
                document.createElement("div");


            card.className =
                "result-item";


            const title =
                item.title ||
                item.position ||
                item.role ||
                "Experience";


            const company =
                item.company ||
                item.organization ||
                "";


            const duration =
                item.duration ||
                item.period ||
                "";


            const description =
                item.description ||
                "";


            card.innerHTML =
                `
                <h3>
                    ${escapeHTML(title)}
                </h3>

                <div class="meta">
                    ${escapeHTML(company)}
                    ${company && duration ? " • " : ""}
                    ${escapeHTML(duration)}
                </div>

                ${
                    description
                    ?
                    `<p>
                        ${escapeHTML(description)}
                    </p>`
                    :
                    ""
                }
                `;


            container.appendChild(
                card
            );

        }
    );

}


/* =====================================================
   RENDER PROJECTS
   ===================================================== */

function renderProjects(
    projects
) {

    const container =
        document.getElementById(
            "projectsList"
        );


    container.innerHTML = "";


    if (
        !Array.isArray(projects) ||
        projects.length === 0
    ) {

        container.innerHTML =
            `
            <div class="result-item">
                <p>
                    No projects detected.
                </p>
            </div>
            `;

        return;

    }


    projects.forEach(
        project => {

            const card =
                document.createElement("div");


            card.className =
                "result-item";


            const title =
                project.title ||
                project.name ||
                "Project";


            const description =
                project.description ||
                "";


            const technologies =
                project.technologies ||
                project.tech_stack ||
                [];


            card.innerHTML =
                `
                <h3>
                    ${escapeHTML(title)}
                </h3>

                ${
                    description
                    ?
                    `<p>
                        ${escapeHTML(description)}
                    </p>`
                    :
                    ""
                }

                <div class="technologies"></div>
                `;


            const techContainer =
                card.querySelector(
                    ".technologies"
                );


            if (Array.isArray(technologies)) {

                technologies.forEach(
                    tech => {

                        techContainer.appendChild(
                            createSkillTag(tech)
                        );

                    }
                );

            }


            container.appendChild(
                card
            );

        }
    );

}


/* =====================================================
   RENDER EDUCATION
   ===================================================== */

function renderEducation(
    education
) {

    const container =
        document.getElementById(
            "educationList"
        );


    container.innerHTML = "";


    if (
        !Array.isArray(education) ||
        education.length === 0
    ) {

        container.innerHTML =
            `
            <div class="result-item">
                <p>
                    No education information detected.
                </p>
            </div>
            `;

        return;

    }


    education.forEach(
        item => {

            const card =
                document.createElement("div");


            card.className =
                "result-item";


            card.innerHTML =
                `
                <h3>
                    ${escapeHTML(
                        item.degree ||
                        "Education"
                    )}
                </h3>

                <div class="meta">
                    ${escapeHTML(
                        item.institution ||
                        ""
                    )}

                    ${
                        item.year
                        ? ` • ${escapeHTML(item.year)}`
                        : ""
                    }
                </div>
                `;


            container.appendChild(
                card
            );

        }
    );

}


/* =====================================================
   RENDER CERTIFICATIONS
   ===================================================== */

function renderCertifications(
    certifications
) {

    const container =
        document.getElementById(
            "certificationsList"
        );


    container.innerHTML = "";


    if (
        !Array.isArray(certifications) ||
        certifications.length === 0
    ) {

        container.innerHTML =
            `
            <div class="result-item">
                <p>
                    No certifications detected.
                </p>
            </div>
            `;

        return;

    }


    certifications.forEach(
        item => {

            const card =
                document.createElement("div");


            card.className =
                "result-item";


            card.innerHTML =
                `
                <h3>
                    ${escapeHTML(
                        item.name ||
                        "Certification"
                    )}
                </h3>

                <div class="meta">
                    ${escapeHTML(
                        item.issuer ||
                        ""
                    )}

                    ${
                        item.year
                        ? ` • ${escapeHTML(item.year)}`
                        : ""
                    }
                </div>
                `;


            container.appendChild(
                card
            );

        }
    );

}


/* =====================================================
   RENDER INSIGHTS
   ===================================================== */

function renderList(
    elementId,
    values,
    className
) {

    const container =
        document.getElementById(
            elementId
        );


    container.innerHTML = "";


    if (
        !Array.isArray(values) ||
        values.length === 0
    ) {

        container.innerHTML =
            `
            <div class="${className}">
                No information detected.
            </div>
            `;

        return;

    }


    values.forEach(
        value => {

            const item =
                document.createElement("div");


            item.className =
                className;


            item.textContent =
                safeText(value);


            container.appendChild(
                item
            );

        }
    );

}


/* =====================================================
   ESCAPE HTML
   ===================================================== */

function escapeHTML(value) {

    return safeText(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

}


/* =====================================================
   DISPLAY RESULT
   ===================================================== */

function displayResult(data) {

    analysisResult =
        data;


    const candidate =
        data.candidate || {};


    const skills =
        data.skills || {};


    document.getElementById(
        "candidateName"
    ).textContent =
        candidate.name ||
        "Candidate";


    document.getElementById(
        "candidateEmail"
    ).textContent =
        candidate.email ||
        "Email not detected";


    document.getElementById(
        "candidatePhone"
    ).textContent =
        candidate.phone ||
        "Phone not detected";


    document.getElementById(
        "candidateSummary"
    ).textContent =
        data.summary ||
        "Resume successfully analyzed.";


    renderSkills(
        document.getElementById(
            "programmingLanguages"
        ),
        skills.programming_languages ||
        []
    );


    renderSkills(
        document.getElementById(
            "frameworks"
        ),
        skills.frameworks ||
        []
    );


    renderSkills(
        document.getElementById(
            "databases"
        ),
        skills.databases ||
        []
    );


    renderSkills(
        document.getElementById(
            "aiSkills"
        ),
        skills.ai_ml ||
        []
    );


    renderSkills(
        document.getElementById(
            "tools"
        ),
        skills.tools ||
        []
    );


    renderSkills(
        document.getElementById(
            "cloudSkills"
        ),
        skills.cloud ||
        []
    );


    renderExperience(
        data.experience || []
    );


    renderProjects(
        data.projects || []
    );


    renderEducation(
        data.education || []
    );


    renderCertifications(
        data.certifications || []
    );


    renderList(
        "strengthsList",
        data.strengths || [],
        "insight-item"
    );


    renderList(
        "interviewFocus",
        data.interview_focus || [],
        "focus-item"
    );


    results.style.display =
        "block";


    results.scrollIntoView({
        behavior: "smooth",
        block: "start"
    });


    saveProfile(data);

}


/* =====================================================
   ANALYZE RESUME
   ===================================================== */

async function analyzeResume() {

    if (isAnalyzing) {
        return;
    }


    if (!selectedFile) {

        showError(
            "Please select a resume first."
        );

        return;

    }


    setLoading(true);

    hideError();


    loadingText.textContent =
        "Extracting candidate information";


    try {

        const formData =
            new FormData();


        formData.append(
            "file",
            selectedFile
        );


        console.log(
            "Sending resume to:",
            ANALYZE_URL
        );


        const response =
            await fetch(
                ANALYZE_URL,
                {
                    method: "POST",
                    body: formData
                }
            );


        const text =
            await response.text();


        let data;


        try {

            data =
                JSON.parse(text);

        } catch {

            throw new Error(
                "Backend returned invalid JSON."
            );

        }


        if (!response.ok) {

            throw new Error(
                data.detail ||
                data.message ||
                `Analysis failed (${response.status})`
            );

        }


        if (data.success === false) {

            throw new Error(
                data.message ||
                data.detail ||
                "Resume analysis failed."
            );

        }


        loadingText.textContent =
            "Building candidate profile";


        console.log(
            "Resume analysis result:",
            data
        );


        displayResult(data);


    } catch (error) {

        console.error(
            "Resume analysis error:",
            error
        );


        showError(
            error.message ||
            "Unable to analyze resume. Make sure the backend is running."
        );

    } finally {

        setLoading(false);

    }

}


/* =====================================================
   SAVE PROFILE
   ===================================================== */

function saveProfile(data) {

    try {

        localStorage.setItem(
            "aiInterviewCandidateProfile",
            JSON.stringify({
                ...data,
                analyzedAt:
                    new Date().toISOString()
            })
        );


        console.log(
            "Candidate profile saved."
        );

    } catch (error) {

        console.error(
            "Unable to save profile:",
            error
        );

    }

}


/* =====================================================
   DRAG & DROP
   ===================================================== */

uploadArea.addEventListener(
    "dragover",
    event => {

        event.preventDefault();

        uploadArea.classList.add(
            "dragging"
        );

    }
);


uploadArea.addEventListener(
    "dragleave",
    () => {

        uploadArea.classList.remove(
            "dragging"
        );

    }
);


uploadArea.addEventListener(
    "drop",
    event => {

        event.preventDefault();

        uploadArea.classList.remove(
            "dragging"
        );


        const file =
            event.dataTransfer.files[0];


        if (file) {

            selectFile(file);

        }

    }
);


/* =====================================================
   FILE INPUT
   ===================================================== */

resumeInput.addEventListener(
    "change",
    event => {

        const file =
            event.target.files[0];


        if (file) {

            selectFile(file);

        }

    }
);


/* =====================================================
   CHOOSE BUTTON
   ===================================================== */

uploadButton.addEventListener(
    "click",
    event => {

        event.stopPropagation();

        resumeInput.click();

    }
);


/* =====================================================
   UPLOAD AREA
   ===================================================== */

uploadArea.addEventListener(
    "click",
    event => {

        if (
            event.target.closest(
                "button"
            )
        ) {

            return;

        }


        resumeInput.click();

    }
);


/* =====================================================
   REMOVE
   ===================================================== */

removeFile.addEventListener(
    "click",
    event => {

        event.stopPropagation();

        clearFile();

    }
);


/* =====================================================
   ANALYZE
   ===================================================== */

analyzeButton.addEventListener(
    "click",
    event => {

        event.preventDefault();

        analyzeResume();

    }
);


/* =====================================================
   DASHBOARD
   ===================================================== */

document.getElementById(
    "dashboardButton"
).addEventListener(
    "click",
    () => {

        window.location.href =
            "dashboard.html";

    }
);


/* =====================================================
   START INTERVIEW
   ===================================================== */

document.getElementById(
    "startInterview"
).addEventListener(
    "click",
    () => {

        const profile =
            localStorage.getItem(
                "aiInterviewCandidateProfile"
            );


        if (!profile) {

            showError(
                "Analyze the resume before starting the interview."
            );

            return;

        }


        window.location.href =
            "interview.html";

    }
);


/* =====================================================
   INITIALIZATION
   ===================================================== */

console.log(
    "AI Resume Analysis initialized."
);
