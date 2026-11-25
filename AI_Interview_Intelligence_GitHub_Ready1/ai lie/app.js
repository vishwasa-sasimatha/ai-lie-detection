function startInterview() {
    alert(
        "Interview system is being prepared. " +
        "The AI interviewer will be available here."
    );
}

function scrollToFeatures() {
    const section = document.getElementById("features");

    if (section) {
        section.scrollIntoView({
            behavior: "smooth"
        });
    }
}