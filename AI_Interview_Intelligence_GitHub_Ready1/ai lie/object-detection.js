"use strict";

/* =========================================================
   VERIHIRE AI
   OBJECT DETECTION & INTERVIEW ACTIVITY MONITOR

   Features:
   1. Mobile phone detection using COCO-SSD
   2. Two-strike phone detection rule
   3. Automatic interview termination after 2 strikes
   4. Browser tab-switch monitoring
   5. Window visibility monitoring
   6. Activity event logging
   7. Interview report summary
   8. Integration with in.js report strike counter
========================================================= */

window.ObjectDetection = (() => {

    /* =====================================================
       CONFIGURATION
    ====================================================== */

    const CONFIG = {
        confidenceThreshold: 0.55,
        detectionInterval: 1200,
        phoneAlertCooldown: 5000,
        tabAlertCooldown: 1000,
        phoneClass: "cell phone",
        alertDuration: 4500,
        maxPhoneStrikes: 2
    };


    /* =====================================================
       INTERNAL STATE
    ====================================================== */

    let model = null;
    let videoElement = null;
    let detectionTimer = null;

    let isRunning = false;
    let isDetecting = false;
    let isInitializing = false;
    let isEndingInterview = false;

    let lastPhoneAlert = 0;
    let lastTabAlert = 0;
    let lastPhoneDetectionTime = 0;

    let onAlertCallback = null;

    let alertElement = null;
    let alertTimeout = null;

    let phoneStrikes = 0;
    let phoneStrikeEvents = [];

    let phoneCurrentlyVisible = false;
    let interviewEndReason = "completed";

    const events = [];


    /* =====================================================
       INITIALIZE ALERT UI
    ====================================================== */

    function createAlertUI() {

        if (document.getElementById("objectDetectionAlert")) {
            alertElement = document.getElementById(
                "objectDetectionAlert"
            );

            return;
        }

        alertElement = document.createElement("div");

        alertElement.id = "objectDetectionAlert";

        alertElement.setAttribute("role", "alert");
        alertElement.setAttribute("aria-live", "assertive");

        alertElement.style.cssText = `
            position: fixed;
            top: 90px;
            right: 24px;
            z-index: 99999;
            max-width: 360px;
            padding: 16px 20px;
            border-radius: 12px;
            background: rgba(125, 30, 30, 0.96);
            color: #ffffff;
            font-family: Inter, Arial, sans-serif;
            font-size: 14px;
            font-weight: 600;
            line-height: 1.5;
            box-shadow: 0 10px 35px rgba(0, 0, 0, 0.35);
            display: none;
        `;

        document.body.appendChild(alertElement);
    }


    /* =====================================================
       SHOW WARNING ALERT
    ====================================================== */

    function showAlert(message) {

        createAlertUI();

        if (!alertElement) {
            return;
        }

        alertElement.textContent = message;
        alertElement.style.display = "block";

        clearTimeout(alertTimeout);

        alertTimeout = setTimeout(() => {

            if (alertElement) {
                alertElement.style.display = "none";
            }

        }, CONFIG.alertDuration);
    }


    /* =====================================================
       HIDE WARNING ALERT
    ====================================================== */

    function hideAlert() {

        clearTimeout(alertTimeout);

        if (alertElement) {
            alertElement.style.display = "none";
        }
    }


    /* =====================================================
       SAVE EVENTS TO LOCAL STORAGE
    ====================================================== */

    function saveEvents() {

        try {

            localStorage.setItem(
                "aiInterviewIntegrityEvents",
                JSON.stringify(events)
            );

        } catch (error) {

            console.warn(
                "Could not save integrity events:",
                error
            );
        }
    }


    /* =====================================================
       RECORD MONITORING EVENT
    ====================================================== */

    function recordEvent(type, details = {}) {

        const event = {
            type,
            details,
            timestamp: new Date().toISOString()
        };

        events.push(event);

        saveEvents();

        console.warn(
            "[VeriHire Integrity Event]",
            event
        );

        if (typeof onAlertCallback === "function") {

            try {
                onAlertCallback(event);

            } catch (error) {

                console.error(
                    "Integrity callback error:",
                    error
                );
            }
        }

        return event;
    }


    /* =====================================================
       HANDLE PHONE DETECTION STRIKE
    ====================================================== */

    function handlePhoneStrike(phone) {

        if (!isRunning || isEndingInterview) {
            return;
        }

        const now = Date.now();

        // Prevent repeated strikes during cooldown.
        if (
            now - lastPhoneDetectionTime <
            CONFIG.phoneAlertCooldown
        ) {
            return;
        }

        lastPhoneDetectionTime = now;

        phoneStrikes++;

        const confidence = Math.round(phone.score * 100);

        const strikeEvent = {
            strike: phoneStrikes,
            object: CONFIG.phoneClass,
            confidence,
            bounding_box: phone.bbox,
            timestamp: new Date().toISOString()
        };

        phoneStrikeEvents.push(strikeEvent);

        /*
         * Record the phone detection in the integrity
         * event history.
         */

        recordEvent("phone_detected", {
            object: CONFIG.phoneClass,
            confidence,
            strike: phoneStrikes,
            maximum_strikes: CONFIG.maxPhoneStrikes,
            bounding_box: phone.bbox
        });

        console.warn(
            `PHONE STRIKE ${phoneStrikes}/${CONFIG.maxPhoneStrikes}`,
            strikeEvent
        );


        /*
         * IMPORTANT:
         * Forward the strike to in.js.
         *
         * in.js maintains the counter used by the
         * final local interview report.
         */

        if (typeof window.handleObjectStrike === "function") {

            window.handleObjectStrike(CONFIG.phoneClass);

        } else {

            console.error(
                "in.js strike handler is unavailable:",
                "window.handleObjectStrike"
            );
        }


        /*
         * First strike:
         * Show warning and continue interview.
         */

        if (
            phoneStrikes <
            CONFIG.maxPhoneStrikes
        ) {

            showAlert(
                `WARNING ${phoneStrikes}/${CONFIG.maxPhoneStrikes}: ` +
                `Mobile phone detected (${confidence}%). ` +
                "Please keep your phone away."
            );

            return;
        }


        /*
         * Strike limit reached:
         * End interview automatically.
         */

        isEndingInterview = true;

        interviewEndReason =
            "Interview automatically ended after reaching the mobile phone detection strike limit.";

        showAlert(
            "Maximum phone detection strikes reached. " +
            "Your interview is being ended and your report is being generated."
        );

        recordEvent(
            "interview_auto_terminated",
            {
                reason: interviewEndReason,
                total_phone_strikes: phoneStrikes
            }
        );

        console.error(
            "PHONE STRIKE LIMIT REACHED. ENDING INTERVIEW."
        );


        /*
         * Stop object monitoring before finishing.
         */

        stop();


        /*
         * Call the main interview controller.
         */

        if (typeof window.finishInterview === "function") {

            window.finishInterview();

        } else {

            console.error(
                "finishInterview() is not available on window."
            );

            showAlert(
                "Interview termination failed. " +
                "The interview controller could not be reached."
            );
        }
    }


    /* =====================================================
       PHONE DETECTION
    ====================================================== */

    async function detectObjects() {

        if (
            !isRunning ||
            !model ||
            !videoElement ||
            isDetecting
        ) {
            return;
        }

        if (
            videoElement.readyState <
            HTMLMediaElement.HAVE_CURRENT_DATA
        ) {
            return;
        }

        isDetecting = true;

        try {

            const predictions = await model.detect(
                videoElement
            );

            const phone = predictions.find(
                prediction =>
                    prediction.class === CONFIG.phoneClass &&
                    prediction.score >= CONFIG.confidenceThreshold
            );


            /*
             * If no phone is detected, reset visibility state.
             */

            if (!phone) {

                phoneCurrentlyVisible = false;

                return;
            }

            phoneCurrentlyVisible = true;

            const now = Date.now();


            /*
             * Cooldown prevents repeated strikes for the
             * same continuously visible phone.
             */

            if (
                now - lastPhoneAlert <
                CONFIG.phoneAlertCooldown
            ) {
                return;
            }

            lastPhoneAlert = now;

            handlePhoneStrike(phone);

        } catch (error) {

            console.error(
                "Object detection error:",
                error
            );

        } finally {

            isDetecting = false;
        }
    }


    /* =====================================================
       TAB VISIBILITY MONITOR
    ====================================================== */

    function handleVisibilityChange() {

        if (!isRunning) {
            return;
        }

        if (document.hidden) {

            const now = Date.now();

            if (
                now - lastTabAlert <
                CONFIG.tabAlertCooldown
            ) {
                return;
            }

            lastTabAlert = now;

            showAlert(
                "Interview tab switched or window hidden. " +
                "This activity has been recorded."
            );

            recordEvent("tab_hidden", {
                message: "Interview page became hidden."
            });

        } else {

            recordEvent("tab_returned", {
                message:
                    "Candidate returned to the interview page."
            });
        }
    }


    /* =====================================================
       START OBJECT DETECTION
    ====================================================== */

    async function start(options = {}) {

        if (isRunning) {

            console.log(
                "Object detection is already running."
            );

            return true;
        }

        if (isInitializing) {

            console.log(
                "Object detection initialization is in progress."
            );

            return false;
        }

        isInitializing = true;

        try {

            videoElement =
                options.video ||
                document.getElementById("candidateVideo");

            onAlertCallback =
                typeof options.onAlert === "function"
                    ? options.onAlert
                    : null;


            if (!videoElement) {

                console.error(
                    "ObjectDetection: Webcam video element not found."
                );

                return false;
            }


            if (
                !window.cocoSsd ||
                typeof window.cocoSsd.load !== "function"
            ) {

                console.error(
                    "COCO-SSD library is not loaded."
                );

                showAlert(
                    "Object detection could not start. " +
                    "The detection library is unavailable."
                );

                return false;
            }


            showAlert(
                "Initializing object detection..."
            );

            console.log(
                "Loading COCO-SSD model..."
            );


            model = await window.cocoSsd.load();

            isRunning = true;

            document.addEventListener(
                "visibilitychange",
                handleVisibilityChange
            );


            detectionTimer = setInterval(
                detectObjects,
                CONFIG.detectionInterval
            );


            console.log(
                "Object detection started successfully."
            );

            showAlert(
                "Object detection is active."
            );

            return true;

        } catch (error) {

            console.error(
                "Object detection initialization failed:",
                error
            );

            showAlert(
                "Object detection could not be initialized."
            );

            return false;

        } finally {

            isInitializing = false;
        }
    }


    /* =====================================================
       STOP OBJECT DETECTION
    ====================================================== */

    function stop() {

        isRunning = false;

        clearInterval(detectionTimer);

        detectionTimer = null;

        document.removeEventListener(
            "visibilitychange",
            handleVisibilityChange
        );

        isDetecting = false;

        hideAlert();

        console.log(
            "Object detection stopped."
        );
    }


    /* =====================================================
       RESET MONITORING DATA
    ====================================================== */

    function reset() {

        events.length = 0;

        phoneStrikes = 0;

        phoneStrikeEvents = [];

        lastPhoneAlert = 0;

        lastTabAlert = 0;

        lastPhoneDetectionTime = 0;

        phoneCurrentlyVisible = false;

        isEndingInterview = false;

        interviewEndReason = "completed";

        saveEvents();

        localStorage.removeItem(
            "aiInterviewPhoneStrikeEvents"
        );

        console.log(
            "Object detection event history reset."
        );
    }


    /* =====================================================
       GET EVENT SUMMARY
    ====================================================== */

    function getSummary() {

        const phoneDetections = events.filter(
            event =>
                event.type === "phone_detected"
        ).length;

        const tabSwitches = events.filter(
            event =>
                event.type === "tab_hidden"
        ).length;

        const tabReturns = events.filter(
            event =>
                event.type === "tab_returned"
        ).length;


        return {

            phone_detections:
                phoneDetections,

            phone_strikes:
                phoneStrikes,

            max_phone_strikes:
                CONFIG.maxPhoneStrikes,

            phone_strike_events:
                [...phoneStrikeEvents],

            interview_end_reason:
                interviewEndReason,

            tab_switches:
                tabSwitches,

            tab_returns:
                tabReturns,

            total_events:
                events.length,

            events:
                [...events]
        };
    }


    /* =====================================================
       GET ALL EVENTS
    ====================================================== */

    function getEvents() {

        return [...events];
    }


    /* =====================================================
       PUBLIC API
    ====================================================== */

    return {

        start,

        stop,

        reset,

        getSummary,

        getEvents,

        getPhoneStrikes: () =>
            phoneStrikes,

        getPhoneStrikeEvents: () =>
            [...phoneStrikeEvents],

        getEndReason: () =>
            interviewEndReason

    };

})();