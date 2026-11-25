"use strict";

document.addEventListener("DOMContentLoaded", () => {

    const form = document.getElementById("loginForm");
    const errorBox = document.getElementById("loginError");

    form.addEventListener("submit", (event) => {

        event.preventDefault();

        errorBox.textContent = "";

        const name =
            document.getElementById("candidateName")
                .value
                .trim();

        const email =
            document.getElementById("candidateEmail")
                .value
                .trim();

        const phone =
            document.getElementById("candidatePhone")
                .value
                .trim();

        const role =
            document.getElementById("candidateRole")
                .value;

        const experience =
            document.getElementById("experience")
                .value;


        /* ==============================
           VALIDATION
        ============================== */

        if (!name) {
            errorBox.textContent =
                "Please enter your full name.";
            return;
        }

        if (!email) {
            errorBox.textContent =
                "Please enter your email address.";
            return;
        }

        if (!role) {
            errorBox.textContent =
                "Please select your target role.";
            return;
        }

        if (!experience) {
            errorBox.textContent =
                "Please select your experience level.";
            return;
        }


        /* ==============================
           CANDIDATE PROFILE
        ============================== */

        const candidate = {

            name: name,

            email: email,

            phone: phone,

            role: role,

            experienceLevel: experience

        };


        /* ==============================
           SAVE LOGIN DATA
        ============================== */

        localStorage.setItem(
            "candidateProfile",
            JSON.stringify(candidate)
        );


        /*
         * This will later be combined with
         * resume analysis data.
         */

        const interviewConfig = {

            candidate: candidate,

            role: role,

            experience: experience,

            source: "candidate-login"

        };

        localStorage.setItem(
            "aiInterviewConfig",
            JSON.stringify(interviewConfig)
        );


        /* ==============================
           GO TO RESUME ANALYSIS
        ============================== */

        window.location.href =
            "resume.html";

    });

});