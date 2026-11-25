
"use strict";

/* =========================================================
   VERIHIRE AI
   OBJECT DETECTION & INTERVIEW ACTIVITY MONITOR

   Features:
   1. Mobile phone detection using COCO-SSD
   2. Browser tab-switch monitoring
   3. Window visibility monitoring
   4. Activity event logging
   5. Warning notifications
   6. Interview report summary

   Required libraries in interview.html:

   TensorFlow.js:
   https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.22.0/dist/tf.min.js

   COCO-SSD:
   https://cdn.jsdelivr.net/npm/@tensorflow-models/coco-ssd@2.2.3

========================================================= */

window.ObjectDetection = (() => {

    /* =====================================================
       CONFIGURATION
    ====================================================== */

    const CONFIG = {

        // Minimum confidence required for phone detection.
        confidenceThreshold: 0.55,

        // Time between webcam object detection checks.
        detectionInterval: 1200,

        // Prevent repeated phone alerts too quickly.
        phoneAlertCooldown: 5000,

        // Prevent repeated tab-switch alerts too quickly.
        tabAlertCooldown: 1000,

        // COCO-SSD class name for mobile phones.
        phoneClass: "cell phone",

        // Warning notification duration.
        alertDuration: 4500

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

    let lastPhoneAlert = 0;

    let lastTabAlert = 0;

    let onAlertCallback = null;

    let alertElement = null;

    let alertTimeout = null;

    /*
       Monitoring events collected during the interview.

       Example:

       {
           type: "phone_detected",
           details: {
               object: "cell phone",
               confidence: 89
           },
           timestamp: "2026-08-27T10:30:00.000Z"
       }
    */

    const events = [];


    /* =====================================================
       INITIALIZE ALERT UI
    ====================================================== */

    function createAlertUI() {

        if (
            document.getElementById(
                "objectDetectionAlert"
            )
        ) {

            alertElement =
                document.getElementById(
                    "objectDetectionAlert"
                );

            return;

        }


        alertElement =
            document.createElement(
                "div"
            );


        alertElement.id =
            "objectDetectionAlert";


        alertElement.setAttribute(
            "role",
            "alert"
        );


        alertElement.setAttribute(
            "aria-live",
            "assertive"
        );


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

            box-shadow:
                0 10px 35px rgba(0, 0, 0, 0.35);

            display: none;

        `;


        document.body.appendChild(
            alertElement
        );

    }


    /* =====================================================
       SHOW WARNING ALERT
    ====================================================== */

    function showAlert(message) {

        createAlertUI();


        if (!alertElement) {
            return;
        }


        alertElement.textContent =
            message;


        alertElement.style.display =
            "block";


        clearTimeout(
            alertTimeout
        );


        alertTimeout =
            setTimeout(
                () => {

                    if (alertElement) {

                        alertElement.style.display =
                            "none";

                    }

                },
                CONFIG.alertDuration
            );

    }


    /* =====================================================
       HIDE WARNING ALERT
    ====================================================== */

    function hideAlert() {

        clearTimeout(
            alertTimeout
        );


        if (alertElement) {

            alertElement.style.display =
                "none";

        }

    }


    /* =====================================================
       RECORD MONITORING EVENT
    ====================================================== */

    function recordEvent(
        type,
        details = {}
    ) {

        const event = {

            type,

            details,

            timestamp:
                new Date().toISOString()

        };


        events.push(
            event
        );


        saveEvents();


        console.warn(
            "[VeriHire Integrity Event]",
            event
        );


        /*
           Notify the main interview controller
           if a callback was provided.
        */

        if (
            typeof onAlertCallback ===
            "function"
        ) {

            try {

                onAlertCallback(
                    event
                );

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
       SAVE EVENTS TO LOCAL STORAGE
    ====================================================== */

    function saveEvents() {

        try {

            localStorage.setItem(

                "aiInterviewIntegrityEvents",

                JSON.stringify(
                    events
                )

            );

        } catch (error) {

            console.warn(
                "Could not save integrity events:",
                error
            );

        }

    }


    /* =====================================================
       LOAD PREVIOUS EVENTS
    ====================================================== */

    function loadEvents() {

        try {

            const saved =
                localStorage.getItem(
                    "aiInterviewIntegrityEvents"
                );


            if (!saved) {
                return;
            }


            const parsed =
                JSON.parse(
                    saved
                );


            if (
                Array.isArray(parsed)
            ) {

                events.push(
                    ...parsed
                );

            }

        } catch (error) {

            console.warn(
                "Could not load integrity events:",
                error
            );

        }

    }


    /* =====================================================
       PHONE DETECTION
    ====================================================== */

    async function detectObjects() {

        /*
           Prevent overlapping detection calls.
        */

        if (
            !isRunning ||
            !model ||
            !videoElement ||
            isDetecting
        ) {

            return;

        }


        /*
           Wait until the webcam has video data.
        */

        if (

            videoElement.readyState <

            HTMLMediaElement.HAVE_CURRENT_DATA

        ) {

            return;

        }


        isDetecting =
            true;


        try {

            /*
               Detect objects in the webcam frame.
            */

            const predictions =
                await model.detect(
                    videoElement
                );


            /*
               Find a phone prediction that meets
               the confidence threshold.
            */

            const phone =
                predictions.find(
                    prediction =>

                        prediction.class ===
                            CONFIG.phoneClass &&

                        prediction.score >=
                            CONFIG.confidenceThreshold
                );


            if (!phone) {
                return;
            }


            const now =
                Date.now();


            /*
               Cooldown prevents repeated warnings
               for the same visible phone.
            */

            if (

                now - lastPhoneAlert <

                CONFIG.phoneAlertCooldown

            ) {

                return;

            }


            lastPhoneAlert =
                now;


            const confidence =
                Math.round(
                    phone.score * 100
                );


            /*
               Display warning.
            */

            showAlert(

                `Mobile phone detected (${confidence}%). Please keep your phone away.`

            );


            /*
               Save event.
            */

            recordEvent(

                "phone_detected",

                {

                    object:
                        CONFIG.phoneClass,

                    confidence,

                    bounding_box:
                        phone.bbox

                }

            );


        } catch (error) {

            console.error(

                "Object detection error:",

                error

            );

        } finally {

            isDetecting =
                false;

        }

    }


    /* =====================================================
       TAB VISIBILITY MONITOR
    ====================================================== */

    function handleVisibilityChange() {

        if (!isRunning) {
            return;
        }


        /*
           document.hidden becomes true when the
           interview page is no longer visible.
        */

        if (document.hidden) {

            const now =
                Date.now();


            if (

                now - lastTabAlert <

                CONFIG.tabAlertCooldown

            ) {

                return;

            }


            lastTabAlert =
                now;


            showAlert(

                "Interview tab switched or window hidden. This activity has been recorded."

            );


            recordEvent(

                "tab_hidden",

                {

                    message:
                        "Interview page became hidden."

                }

            );


        } else {

            /*
               Candidate returned to the interview page.
            */

            recordEvent(

                "tab_returned",

                {

                    message:
                        "Candidate returned to the interview page."

                }

            );

        }

    }


    /* =====================================================
       START OBJECT DETECTION
    ====================================================== */

    async function start(options = {}) {

        /*
           Avoid initializing the model multiple times.
        */

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


        isInitializing =
            true;


        try {

            /*
               Get webcam element.
            */

            videoElement =

                options.video ||

                document.getElementById(
                    "candidateVideo"
                );


            /*
               Get callback.
            */

            onAlertCallback =

                typeof options.onAlert ===
                "function"

                    ? options.onAlert

                    : null;


            if (!videoElement) {

                console.error(
                    "ObjectDetection: Webcam video element not found."
                );

                return false;

            }


            /*
               Verify COCO-SSD library.
            */

            if (

                !window.cocoSsd ||

                typeof window.cocoSsd.load !==
                "function"

            ) {

                console.error(
                    "COCO-SSD library is not loaded."
                );


                showAlert(

                    "Object detection could not start. The detection library is unavailable."

                );


                return false;

            }


            /*
               Display initialization alert.
            */

            showAlert(
                "Initializing object detection..."
            );


            /*
               Load model.
            */

            console.log(
                "Loading COCO-SSD model..."
            );


            model =
                await window.cocoSsd.load();


            /*
               Mark monitoring as active.
            */

            isRunning =
                true;


            /*
               Listen for browser visibility changes.
            */

            document.addEventListener(

                "visibilitychange",

                handleVisibilityChange

            );


            /*
               Start object detection loop.
            */

            detectionTimer =
                setInterval(

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

            isInitializing =
                false;

        }

    }


    /* =====================================================
       STOP OBJECT DETECTION
    ====================================================== */

    function stop() {

        isRunning =
            false;


        clearInterval(
            detectionTimer
        );


        detectionTimer =
            null;


        document.removeEventListener(

            "visibilitychange",

            handleVisibilityChange

        );


        isDetecting =
            false;


        hideAlert();


        console.log(
            "Object detection stopped."
        );

    }


    /* =====================================================
       RESET MONITORING DATA
    ====================================================== */

    function reset() {

        events.length =
            0;


        lastPhoneAlert =
            0;


        lastTabAlert =
            0;


        saveEvents();


        console.log(
            "Object detection event history reset."
        );

    }


    /* =====================================================
       GET EVENT SUMMARY
    ====================================================== */

    function getSummary() {

        const phoneDetections =

            events.filter(

                event =>

                    event.type ===
                    "phone_detected"

            ).length;


        const tabSwitches =

            events.filter(

                event =>

                    event.type ===
                    "tab_hidden"

            ).length;


        const tabReturns =

            events.filter(

                event =>

                    event.type ===
                    "tab_returned"

            ).length;


        return {

            phone_detections:
                phoneDetections,

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

        return [
            ...events
        ];

    }


    /* =====================================================
       PUBLIC API
    ====================================================== */

    return {

        start,

        stop,

        reset,

        getSummary,

        getEvents

    };

})();
